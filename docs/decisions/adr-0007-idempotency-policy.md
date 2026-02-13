# ADR-0007 — Idempotency Policy

## Status

ACCEPTED

## Context

FitTrack processes financial operations, external webhooks, and event-driven handlers that are subject to:
- Network failures causing duplicate requests from clients.
- Automatic retries by payment gateways and webhook dispatchers.
- Duplicate message delivery in event bus scenarios.
- Client-side retry after timeout.

Without idempotency enforcement, these conditions produce:
- Duplicate purchases and double charges.
- Duplicate AccessGrant creation.
- Duplicate Execution records.
- Duplicate metric derivation events.

## Decision

### 1. Idempotency Key Contract

An **IdempotencyKey** is a client-supplied or system-generated unique string that identifies a specific intended operation. It must be:
- Unique per logical operation per actor (not globally unique across all operations).
- Persisted alongside the operation result.
- Stable across retries for the same logical intent.

**Structure:**
```
IdempotencyKey = { key: string, actorId: string, operation: string }
Composite unique constraint: (key, actorId, operation)
```

### 2. Idempotency-Protected Operations

The following operations require an IdempotencyKey:

| Operation | Scope |
|-----------|-------|
| Purchase / Transaction creation | Per user, per service plan, per intent |
| AccessGrant creation | Per transaction, per grant scope |
| Booking confirmation | Per client, per session slot |
| Execution record creation | Per client, per deliverable, per logicalDay |
| Webhook event processing | Per webhook event ID from external provider |
| Payment gateway webhook | Per gateway-supplied event ID |
| Chargeback registration | Per gateway-supplied chargeback ID |

### 3. Idempotency Enforcement Protocol

```
Request arrives with IdempotencyKey K
  → System checks: does a persisted result exist for K?
  → If YES: return stored result immediately, without re-executing the operation
  → If NO: execute the operation, persist result alongside K
         → Return result to caller
```

**Key properties:**
- IdempotencyKey storage is checked before any mutation begins.
- The check and the mutation are within the same database transaction to prevent TOCTOU races.
- If the operation fails (exception, rollback), the IdempotencyKey is not persisted. The operation is retryable.
- If the operation succeeds, the IdempotencyKey is persisted atomically with the result.

### 4. TTL and Expiration

| Context | TTL |
|---------|-----|
| Financial operations (Purchase, Chargeback) | 30 days |
| Booking operations | 24 hours |
| Execution creation | 24 hours |
| Webhook events | 7 days |

After TTL expiry, the IdempotencyKey record may be purged. A re-submitted key after expiry is treated as a new operation. TTL values are configuration-driven (governed by ADR-0032).

### 5. Idempotency and Retries

- Automatic retry mechanisms (network layer, event handlers) must supply the same IdempotencyKey across all retry attempts for the same logical operation.
- A retry with a different key is treated as a new, separate operation.
- Idempotency does not substitute for concurrency control (governed by ADR-0006). Both are required for financially sensitive operations.

### 6. Idempotency for Event Handlers

Domain event handlers that trigger cross-aggregate mutations (e.g., `PurchaseCompleted` → AccessGrant creation) must:
- Extract the idempotency key from the event payload or compute it deterministically from the event ID and handler type.
- Apply the idempotency check before executing the handler logic.
- Store the idempotency result after the handler transaction commits.

### 7. Excluded Operations

Idempotency does not apply to:
- Read operations (no mutation, no idempotency needed).
- Metric derivation (governed by ADR-0043 with `derivationRuleVersion` as the idempotency mechanism).
- Administrative batch operations (handled by dedicated job idempotency mechanisms, not this policy).

## Invariants

1. No financially sensitive write operation is executed without an IdempotencyKey check.
2. An IdempotencyKey is persisted atomically with the operation result in the same transaction.
3. A failed operation (rollback) does not persist its IdempotencyKey.
4. A duplicate request with a stored key always returns the original stored result without re-executing.
5. Idempotency enforcement does not replace concurrency control.

## Constraints

- IdempotencyKey uniqueness constraint is enforced at the database level (unique index), not only in application logic.
- IdempotencyKey records are append-only. They are never updated.
- IdempotencyKey records are never deleted before their TTL expires.

## Consequences

**Positive:**
- Safe retry behavior for all financial and critical operations.
- Webhook duplicates from payment gateways are safely absorbed.
- Double charges and duplicate grants are prevented by design.

**Negative:**
- Every critical operation requires key management.
- IdempotencyKey storage adds a write overhead to each protected operation.
- TTL management requires a scheduled cleanup job.

## Dependencies

- ADR-0000: Project Foundation (idempotency required principle)
- ADR-0003: Transaction Boundaries (key stored within transaction)
- ADR-0006: Concurrency Control (complementary, not substituted)
- ADR-0019: Payment Provider Integration (webhook idempotency)
- ADR-0038: Webhook and External Integration Policy (external event idempotency)
