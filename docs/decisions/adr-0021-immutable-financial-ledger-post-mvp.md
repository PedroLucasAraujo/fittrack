# ADR-0021 — Immutable Financial Ledger (Post-MVP)

## Status

PLANNED (Post-MVP)

## Context

FitTrack processes financial transactions involving multiple parties: platform, professionals, clients. In MVP, financial state is tracked via the Transaction and AccessGrant aggregates. This is insufficient for:
- Financial reconciliation between platform and professionals.
- Split payment accounting (platform fee vs. professional revenue).
- Audit trail for regulatory compliance.
- Support for future marketplace payment processing at scale.

A formal, immutable financial ledger is required to serve as the canonical reconciliation source for all monetary movements on the platform.

## Decision

### 1. Ledger Architecture

The Ledger is an **append-only, immutable** collection of `LedgerEntry` records. No LedgerEntry may ever be updated or deleted after creation.

```typescript
interface LedgerEntry {
  readonly id: string;                    // UUIDv4; globally unique
  readonly entryType: LedgerEntryType;    // CREDIT | DEBIT | PLATFORM_FEE | REVERSAL | COMPENSATION
  readonly transactionId: string;         // Source Transaction ID
  readonly professionalProfileId: string; // Tenant ID
  readonly clientId: string | null;       // Present for client-facing entries
  readonly amountCents: number;           // Integer; no floating-point
  readonly currency: string;              // ISO 4217 currency code
  readonly description: string;
  readonly occurredAtUtc: string;         // ISO 8601 UTC
  readonly referenceId: string | null;    // Reference to source event (chargebackId, refundId, etc.)
  readonly createdAtUtc: string;          // System-assigned
}
```

### 2. LedgerEntry Type Catalog

| Type | Description | When Created |
|------|-------------|-------------|
| `CREDIT` | Money credited to professional's account | PurchaseCompleted |
| `DEBIT` | Money debited from professional's account | N/A in MVP |
| `PLATFORM_FEE` | Platform revenue from transaction | PurchaseCompleted |
| `REVERSAL` | Cancellation of a prior entry | Refund processed |
| `COMPENSATION` | Platform compensation to professional | Chargeback won |

### 3. Double-Entry Accounting Principle

Each financial event produces at least two balanced LedgerEntry records:

**Example: Purchase of a $100 ServicePlan with 10% platform fee:**
```
Entry 1: CREDIT    professionalRevenue = $90  (professional's account)
Entry 2: PLATFORM_FEE platformRevenue  = $10  (platform account)
Sum: $100 ✓
```

**Example: Full refund of the above:**
```
Entry 3: REVERSAL  creditReversal      = -$90  (reverses Entry 1)
Entry 4: REVERSAL  feeReversal         = -$10  (reverses Entry 2)
Sum: -$100 ✓
```

The sum of all LedgerEntries for a given professionalProfileId represents their net platform balance.

### 4. Amount Representation

All monetary amounts are stored as integer cents (or equivalent lowest denomination for the currency). Floating-point types are prohibited for monetary amounts.

```
$100.00 USD → amountCents = 10000
R$50,99 BRL → amountCents = 5099
```

### 5. Ledger and Transaction Relationship

The Ledger complements the Transaction table; it does not replace it:
- Transaction records the payment event and its lifecycle (PENDING, CONFIRMED, FAILED, etc.).
- LedgerEntry records the financial position impact of each payment event.
- Both are permanent and immutable.
- The Transaction is the source of truth for payment status; the Ledger is the source of truth for financial position.

### 6. Ledger and Chargeback

Chargebacks produce `REVERSAL` entries in the Ledger, not deletions of existing entries. The historical credit/fee entries remain; the reversal entries offset them. This maintains the complete audit trail.

### 7. Ledger Access

- Read access: Platform reconciliation jobs, admin reporting, professional financial dashboards.
- Write access: Exclusively via Billing context application layer, triggered by domain events.
- No external API exposes raw LedgerEntry data. Only aggregated views are exposed to professionals.

### 8. MVP Transition Plan

In MVP:
- No LedgerEntry records are created.
- Reconciliation uses Transaction records directly.
- The domain model must be designed to accommodate LedgerEntry addition without breaking existing Transaction-based logic.

Post-MVP activation:
- LedgerEntry table is created via migration.
- Billing event handlers are updated to produce LedgerEntries.
- Historical backfill of LedgerEntries from existing Transaction records is performed as a one-time migration job.

## Invariants

1. LedgerEntry records are never updated or deleted after creation.
2. All monetary amounts are stored as integer cents. No floating-point monetary values.
3. Every financial event that produces a Transaction also produces corresponding balanced LedgerEntries.
4. REVERSAL entries reference the original entry ID via `referenceId`. They do not modify the original.
5. The sum of all LedgerEntries for a professionalProfileId is the authoritative net financial position for that professional.

## Constraints

- LedgerEntry creation is deferred to post-MVP phase.
- The domain model in MVP must not depend on Ledger availability. The Ledger is additive, not required.
- All future financial features (split payments, payouts, escrow) must route through the Ledger.

## Consequences

**Positive:**
- Complete, immutable audit trail for all financial movements.
- Reconciliation becomes a mathematical operation on the Ledger.
- Legal and regulatory compliance for financial intermediation.

**Negative:**
- Complexity of double-entry accounting implementation.
- Historical backfill required for existing transactions at Ledger activation.

## Dependencies

- ADR-0000: Project Foundation (Ledger immutability principle)
- ADR-0003: Transaction Boundaries (Ledger events are post-commit)
- ADR-0008: Entity Lifecycle States (Transaction lifecycle)
- ADR-0019: Payment Provider Integration (source of financial events)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback ledger entries)
- ADR-0022: Financial Risk Governance Framework (risk events and financial impact)
