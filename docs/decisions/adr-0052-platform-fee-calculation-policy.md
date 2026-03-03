# ADR-0052 — Platform Fee Calculation Policy

## Status

ACCEPTED

## Context

FitTrack charges professionals a platform fee on each service transaction. The fee must be:
- Deterministic and reproducible from the same inputs.
- Expressed in integer cents to avoid floating-point errors (ADR-0004).
- Calculated per session at revenue recognition time (ADR-0021 §3).
- Stored on the `Transaction` aggregate at purchase time as the `PlatformFee` value object.
- Recovered from the `Transaction` when the `ExecutionRecorded` event triggers ledger entries.

The `PlatformFee` value object already exists in `packages/billing/domain/value-objects/platform-fee.ts` and enforces the integer arithmetic rule. This ADR formalizes the calculation policy and the per-session pro-ration rule.

## Decision

### 1. Fee Expression

Platform fee is expressed in **basis points** (integer, 0–10000):
```
1000 basis points = 10%
500  basis points = 5%
250  basis points = 2.5%
```

The fee percentage is stored on the `Transaction` aggregate via the `PlatformFee` value object. It is set at purchase time and immutable thereafter (snapshot at prescription principle, ADR-0011).

### 2. Per-Transaction Fee Calculation

When a purchase is confirmed, the `PlatformFee.create(totalAmount, feePercentageBasisPoints)` factory is called:

```
platformCents      = floor(totalAmountCents × feePercentageBasisPoints / 10000)
professionalCents  = totalAmountCents − platformCents
```

Integer floor division. Rounding remainder (if any) goes to the professional.

### 3. Per-Session Revenue Recognition

Revenue is recognized per confirmed session (ADR-0021 §3). When `ExecutionRecorded` is received, the per-session amounts are computed from the Transaction data:

```
sessionAllotment         = ServicePlan.sessionAllotment  (set at purchase; immutable)
perSessionAmountCents    = floor(totalAmountCents / sessionAllotment)
sessionFeeCents          = floor(perSessionAmountCents × feePercentageBasisPoints / 10000)
sessionProfessionalCents = perSessionAmountCents − sessionFeeCents
```

All values are computed using integer floor division.

**Rounding treatment for the last session:** If `totalAmountCents mod sessionAllotment ≠ 0`, the remainder is added to the last session's `perSessionAmountCents`. The infrastructure event handler is responsible for computing this correctly by tracking sessions consumed against the AccessGrant.

### 4. Immutability of Fee at Capture Time

The fee percentage applied to a transaction is immutable:
- The `feePercentageBasisPoints` on `Transaction.platformFee` is set at `InitiatePurchase` time.
- Platform-wide fee changes do not retroactively affect existing transactions or future ledger entries derived from them.
- If a fee rate change is required mid-plan, it applies only to new `Transaction` records.

### 5. Fee Data Flow for Ledger

The Ledger context's `ProcessExecutionRevenue` use case receives the following input (provided by the infrastructure event handler after querying billing data):

```typescript
interface ProcessExecutionRevenueInputDTO {
  professionalProfileId: string;
  executionId: string;
  accessGrantId: string;
  transactionId: string;
  professionalAmountCents: number;  // per-session, after fee
  platformFeeAmountCents: number;   // per-session fee
  currency: string;
  logicalDay: string;               // YYYY-MM-DD
}
```

The infrastructure layer (event handler) is responsible for:
1. Listening to `ExecutionRecorded`.
2. Querying the Billing context for Transaction and ServicePlan data.
3. Computing per-session amounts per this ADR.
4. Calling `ProcessExecutionRevenue` use case.

### 6. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Floating-point fee arithmetic | Produces inconsistent results across runtimes |
| Recomputing fee from current platform rate at ledger time | Fee must come from immutable Transaction snapshot |
| Splitting fee calculation across multiple use cases | Financial consistency requires atomic recording (ADR-0009 §1.5) |
| Negative fee amounts | Platform fee is always non-negative; use Money value object |

## Invariants

1. `platformCents = floor(totalAmountCents × feePercentageBasisPoints / 10000)` — always integer.
2. `platformCents + professionalCents = totalAmountCents` — sum equality invariant.
3. Fee percentage is immutable after `Transaction` creation.
4. Per-session amounts are derived from the immutable Transaction snapshot, not from current platform rates.
5. Both REVENUE and PLATFORM_FEE entries for an execution are recorded atomically in one UseCase transaction.

## Constraints

- Fee must be ≥ 0. A 0% fee is valid (for promotions or admin-created plans).
- Maximum fee is 100% (10000 basis points), enforced by `PlatformFee` value object.
- The `PlatformFee` value object in `packages/billing` is the canonical implementation of these rules. No duplicate fee calculation logic is permitted elsewhere.

## Consequences

**Positive:**
- Deterministic, reproducible fee calculations from transaction records.
- Audit trail: the fee percentage and amounts are stored on the Transaction and in LedgerEntry records.
- Consistent with integer-only money policy (ADR-0004).

**Negative:**
- Infrastructure event handler must query Billing context before calling the Ledger use case, introducing a cross-context read dependency at event handling time.
- Rounding remainder tracking for multi-session plans adds infrastructure complexity.

## Dependencies

- ADR-0004: Persistence Strategy (integer cents rule)
- ADR-0009: Official Domain Events Policy (atomic financial recording)
- ADR-0011: Catalog and Resource Snapshot Policy (fee immutable at capture)
- ADR-0019: Payment Provider Integration (payment source)
- ADR-0021: Immutable Financial Ledger (revenue recognition model)
- ADR-0047: Canonical Aggregate Root Definition (FinancialLedger context)
