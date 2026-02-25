# ADR-0050 — Product One-Time Purchases

## Status

ACCEPTED

**Date**: 2025-02-25
**Amends**: ADR-0001, ADR-0008, ADR-0012, ADR-0017, ADR-0046

## Context

FitTrack's subscription-first model (ADR-0017) covers recurring service plans. However, professionals also need to sell discrete, non-recurring products — e.g., a single diet plan, an assessment package, or a training program bundle. These require a separate commercial aggregate that coexists with ServicePlan without altering the subscription model.

## Decision

### §1. Bounded Context: Products

Products is a new bounded context (`@fittrack/products`) independent from Billing and ServicePlan. It owns the product catalog, versioning, and purchase lifecycle. It does NOT own financial transactions (Billing owns Transaction).

### §2. Aggregate Roots

**Product** — Root aggregate representing a commercial offering. Contains ProductVersions. Tenant-scoped by `professionalProfileId`.

**ProductVersion** — Entity internal to Product. Each version is immutable once published (status `ACTIVE`). Only `DRAFT` version can be edited. Contains DeliverableSnapshots (immutable, per ADR-0011). Fields: `versionNumber`, `status` (`DRAFT` | `ACTIVE` | `ARCHIVED`), `price`, `expirationPolicy`, `deliverableSnapshots[]`.

**ProductPurchase** — Independent aggregate root (per ADR-0003). Created in response to `TransactionConfirmed(type=ONE_TIME)`. Lifecycle: `COMPLETED` → `REFUNDED`. Owned by Products context.

### §3. Expiration Policy

Each ProductVersion defines one of three expiration policies:

| Policy | Description | AccessGrant.validUntil |
|--------|-------------|------------------------|
| `NONE` | Lifetime access | `null` |
| `FIXED_DATE` | Access until a specific date | Configured date (immutable at grant creation) |
| `RELATIVE_DAYS` | Access for N days from purchase | `purchaseDate + N days` (calculated and fixed at grant creation) |

The `expiresAt` is calculated and fixed on the AccessGrant at creation time (immutable, per ADR-0046).

### §4. Purchase Flow

1. Client selects a Product (specific ProductVersion with status `ACTIVE`).
2. Billing creates `Transaction(type=ONE_TIME, status=PENDING)`.
3. Payment gateway confirms → Billing transitions Transaction to `CONFIRMED`.
4. Billing UseCase publishes `TransactionConfirmed(type=ONE_TIME)`.
5. Products context handler creates `ProductPurchase(status=COMPLETED)`.
6. Products context creates `AccessGrant(source=PRODUCT_PURCHASE, productVersionId=...)` for each DeliverableSnapshot in the ProductVersion.

Subscription-first invariant applies: payment confirmation always precedes AccessGrant creation (ADR-0017).

### §5. Refund

Full refund transitions Transaction to `REFUNDED` (same lifecycle as ADR-0008). Refund is a status transition on the same Transaction, NOT a separate entity. ProductPurchase transitions to `REFUNDED`. Associated AccessGrants are `REVOKED`. Executions already recorded are preserved (non-destructive, per ADR-0020).

### §6. Integration Points

- Products does NOT contain complex financial logic. Transaction and DiscountPolicy are owned by Billing.
- Products does NOT affect PlatformEntitlement or Subscriptions.
- `AccessGrant.source` field distinguishes origin (see ADR-0046 §8).
- Domain events: `ProductCreated`, `ProductVersionPublished`, `ProductPurchaseCompleted`, `ProductPurchaseRefunded`.

### §7. Data Retention

| Entity | Tier | Policy |
|--------|------|--------|
| Product | Tier 2 | Retained on closure; PII anonymizable per LGPD |
| ProductVersion | Tier 2 | Retained on closure; immutable once ACTIVE |
| ProductPurchase | Tier 1 | Permanent, never deleted — financial record |
| AccessGrant (source=PRODUCT_PURCHASE) | Tier 1 | Permanent per existing ADR-0013 policy |

## Invariants

1. A ProductVersion in `ACTIVE` status is immutable — content (DeliverableSnapshots, price, expirationPolicy) cannot be modified.
2. AccessGrant creation from a product purchase requires a `CONFIRMED` Transaction. Pending transactions do not authorize AccessGrant creation.
3. Refund revokes all AccessGrants associated with the ProductPurchase but does not delete or alter Execution records.
4. `ProductPurchase` is an independent aggregate root. It is never modeled as a subordinate entity of `Product`.
5. Each AccessGrant created from a product purchase carries `source=PRODUCT_PURCHASE` and a non-null `productVersionId`.

## Constraints

- Products bounded context does not directly call Billing repositories.
- A ProductVersion may only transition from `DRAFT` to `ACTIVE` once. There is no reactivation.
- Products context reacts to `TransactionConfirmed` events published by Billing. Billing does not call Products directly.

## Consequences

**Positive:**
- Discrete product sales are fully supported without altering the subscription-first model.
- AccessGrant mechanism is reused, keeping authorization logic unified.
- Clean bounded context separation: Billing owns money, Products owns catalog and purchases.

**Negative:**
- Two AccessGrant source types increase AccessGrant validation complexity marginally.
- Products context requires its own event consumer for `TransactionConfirmed(type=ONE_TIME)`.

## Dependencies

- ADR-0001: Bounded Contexts (Products and Deliverables contexts added)
- ADR-0003: Transaction Boundaries (ProductPurchase as independent aggregate root)
- ADR-0008: Entity Lifecycle States (ProductPurchase lifecycle)
- ADR-0011: Catalog and Resource Snapshot Policy (DeliverableSnapshots embedded in ProductVersion)
- ADR-0013: Soft Delete and Data Retention Policy (ProductPurchase = Tier 1)
- ADR-0017: Subscription-First Model (subscription-first invariant applies to product purchases)
- ADR-0020: Chargeback, Revocation, and History Preservation (refund non-destructive to Executions)
- ADR-0046: AccessGrant Lifecycle Policy (source field; dual-origin AccessGrant)
