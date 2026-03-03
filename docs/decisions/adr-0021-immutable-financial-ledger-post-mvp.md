# ADR-0021 — Immutable Financial Ledger

## Status

ACCEPTED

## Context

FitTrack processes financial transactions involving multiple parties: platform, professionals, clients. After MVP, financial state was tracked via the Transaction and AccessGrant aggregates. This is insufficient for:
- Financial reconciliation between platform and professionals.
- Split payment accounting (platform fee vs. professional revenue).
- Audit trail for regulatory compliance.
- Revenue recognition at execution time (service delivery confirmation).
- Support for future marketplace payment processing at scale.

A formal, immutable financial ledger is required to serve as the canonical reconciliation source for all monetary movements on the platform.

## Decision

### 1. Ledger Architecture

The Ledger is a bounded context implemented as the `packages/ledger` module. It owns two domain types:

**`FinancialLedger`** — Aggregate Root per professional (one per `professionalProfileId`):
- Tracks `currentBalanceCents: number` (signed integer; may be negative during overdraft states)
- Tracks `currency: string` (ISO 4217; set at creation and immutable)
- Tracks `status: LedgerStatus` (`ACTIVE | FROZEN | UNDER_REVIEW`)
- Carries `version` for optimistic locking (ADR-0006)
- Provides domain methods: `recordRevenue`, `recordPlatformFee`, `recordRefund`, `recordPayout`, `recordAdjustment`, `freeze`, `unfreeze`, `markUnderReview`, `clearReview`

**`LedgerEntry`** — Subordinate Entity (append-only; owned by `FinancialLedger`):
- Immutable after creation; never updated or deleted
- Carries `idempotencyKey` to prevent duplicate entries on retry
- `balanceAfterCents: number` — snapshot of ledger balance immediately after this entry was applied

```typescript
interface LedgerEntryProps {
  readonly ledgerEntryType: LedgerEntryType;
  readonly amount: Money;             // Non-negative; type determines direction
  readonly balanceAfterCents: number; // Signed; post-entry balance snapshot
  readonly transactionId: string | null;
  readonly referenceEntryId: string | null;
  readonly idempotencyKey: string;
  readonly description: string;
  readonly occurredAtUtc: UTCDateTime;
}
```

### 2. LedgerEntry Type Catalog

| Type | Direction | Trigger Event | Description |
|------|-----------|---------------|-------------|
| `REVENUE` | Credit (+) | `ExecutionRecorded` | Professional's net revenue per confirmed session |
| `PLATFORM_FEE` | Debit (−) | `ExecutionRecorded` | Platform's fee deducted per confirmed session |
| `REFUND` | Debit (−) | `ChargebackRegistered` / `PaymentRefunded` | Reversal of prior revenue/fee entries |
| `PAYOUT` | Debit (−) | On-demand / scheduled | Transfer of balance to professional's bank account |
| `ADJUSTMENT` | Either | Administrative | Platform correction entry (requires authorization) |

### 3. Revenue Recognition Model

Revenue is recognized at **execution time** (service delivery), not at payment time. This reflects the performance obligation:

- `PurchaseCompleted` → payment arrives on platform (raw cash event; no ledger entry)
- `ExecutionRecorded` → professional performs the service → REVENUE + PLATFORM_FEE entries recorded

Per-session amounts are computed as:
```
perSessionAmountCents = floor(totalTransactionAmountCents / sessionAllotment)
platformFeeAmountCents = floor(perSessionAmountCents × feePercentageBasisPoints / 10000)
professionalAmountCents = perSessionAmountCents − platformFeeAmountCents
```

Integer arithmetic only. Rounding remainder goes to the professional on the last session.

### 4. Double-Entry Financial Consistency

Each `ExecutionRecorded` event produces exactly **two** balanced entries in a **single** UseCase transaction:

```
Entry 1: REVENUE     +90 BRL   (professional's net revenue per session)
Entry 2: PLATFORM_FEE −10 BRL  (platform's fee per session)
Net balance change: +80 BRL
```

Financial consistency NEVER depends on event subscribers (ADR-0009 §1.5). Both entries are recorded within one atomic UseCase invocation.

### 5. Amount Representation

All monetary amounts stored as non-negative integer cents (or lowest denomination). `currentBalanceCents` on the aggregate is a signed integer (allows negative for overdraft detection). Floating-point is prohibited.

```
R$100,00 → amountCents = 10000
R$50,99  → amountCents = 5099
```

### 6. Ledger and Transaction Relationship

The Ledger complements the Transaction table; it does not replace it:
- **Transaction**: source of truth for payment events and their lifecycle (PENDING, CONFIRMED, FAILED, CHARGEBACK, REFUNDED).
- **FinancialLedger / LedgerEntry**: source of truth for financial position and revenue recognition.
- Both are permanent and immutable.

### 7. Chargeback and Refund Handling

Chargebacks and refunds produce `REFUND` entries, not deletions of existing entries. The historical REVENUE/PLATFORM_FEE entries remain; the REFUND entries offset them. Complete audit trail is preserved.

```
[On ExecutionRecorded]
Entry 1: REVENUE      +90 BRL
Entry 2: PLATFORM_FEE −10 BRL

[On ChargebackRegistered]
Entry 3: REFUND       −90 BRL  (reverses Entry 1; referenceEntryId = Entry 1 ID)
Entry 4: REFUND       +10 BRL  (reverses Entry 2; referenceEntryId = Entry 2 ID)
```

### 8. Negative Balance Policy

`currentBalanceCents` may go negative (e.g., chargeback after payout, or mid-session refund). When negative:
- The `LedgerBalanceChanged` event is published with `isInDebt: true`
- The Risk context consumes this event and escalates to `WATCHLIST` per ADR-0022
- The ledger continues to accept REVENUE entries regardless
- PAYOUT entries are blocked while `isInDebt` is true (insufficient balance)

### 9. Ledger Status

| Status | Payout Allowed | Revenue Allowed | Description |
|--------|---------------|-----------------|-------------|
| `ACTIVE` | Yes (if balance sufficient) | Yes | Normal operation |
| `FROZEN` | No (blocked) | Yes | Administrative freeze; payouts blocked |
| `UNDER_REVIEW` | No (blocked) | Yes | Risk monitoring; payouts blocked |

FROZEN and UNDER_REVIEW are reversible via administrative action.

### 10. Idempotency

Each `LedgerEntry` carries an `idempotencyKey`. The aggregate checks for duplicate keys before recording an entry. If a duplicate is detected, the existing entry is returned (idempotent). The infrastructure layer enforces this via a unique database constraint on `(ledger_id, idempotency_key)`.

### 11. Repository Optimization

The `IFinancialLedgerRepository` distinguishes between two load modes:
- **Mutation mode** (`findByProfessionalProfileId`): loads only the header (balance, status, version) without historical entries.
- **Query mode** (`findByProfessionalProfileIdWithEntries`): loads header + paginated entries for read use cases.

The `FinancialLedger` aggregate tracks `_newEntries` separately from loaded entries. The repository's `save` method appends only new entries and updates the header, using optimistic locking on `version`.

### 12. Ledger Access

- **Read access**: Platform reconciliation jobs, admin reporting, professional financial dashboards.
- **Write access**: Exclusively via Ledger context application layer, triggered by domain events from Billing and Execution contexts.
- No external API exposes raw `LedgerEntry` data. Only aggregated views (balance, paginated history) are exposed.

## Invariants

1. `LedgerEntry` records are never updated or deleted after creation.
2. All monetary amounts stored as non-negative integer cents. `currentBalanceCents` on the aggregate is a signed integer.
3. Every `ExecutionRecorded` event produces exactly two paired entries (REVENUE + PLATFORM_FEE) in one UseCase transaction.
4. Every chargeback/refund event produces REFUND entries that reference the original entry IDs via `referenceEntryId`.
5. The sum of all `LedgerEntry` amounts (credits minus debits) for a `professionalProfileId` equals `currentBalanceCents` — the authoritative net financial position.
6. PAYOUT entries are blocked when `currentBalanceCents < requested payout amount`.
7. PAYOUT entries are blocked when ledger `status` is `FROZEN` or `UNDER_REVIEW`.
8. All entries within one UseCase transaction share the same logical consistency window.

## Constraints

- Revenue recognition at execution time. Subscriptions paid upfront do not produce ledger entries until sessions are confirmed.
- `currentBalanceCents` may be negative during overdraft states; this triggers risk escalation but does not halt the system.
- Historical backfill of entries from existing Transactions may be required for pre-Ledger executions if deployed mid-operation.

## Consequences

**Positive:**
- Complete, immutable audit trail for all financial movements.
- Revenue recognition aligned with service delivery (IFRS 15 compatible).
- Reconciliation is a mathematical operation on the Ledger.
- Legal and regulatory compliance for financial intermediation.

**Negative:**
- Complexity of revenue recognition at execution time (requires billing data lookup per execution).
- Optimistic locking contention under high execution volume for a single professional.
- Historical backfill required for pre-Ledger executions.

## Dependencies

- ADR-0003: Transaction Boundaries (one aggregate per transaction; financial entries atomic)
- ADR-0005: Execution Core Invariant Policy (execution records trigger revenue recognition)
- ADR-0006: Concurrency Control (optimistic locking on FinancialLedger)
- ADR-0007: Idempotency Policy (idempotencyKey on LedgerEntry)
- ADR-0009: Official Domain Events Policy (financial consistency never depends on event subscribers)
- ADR-0016: Formal Eventual Consistency Policy (event delivery from Execution context)
- ADR-0019: Payment Provider Integration (source of Transaction financial data)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback ledger entries)
- ADR-0022: Financial Risk Governance Framework (negative balance → WATCHLIST escalation)
- ADR-0047: Canonical Aggregate Root Definition (FinancialLedger in catalog)
- ADR-0052: Platform Fee Calculation Policy (fee computation rules)
