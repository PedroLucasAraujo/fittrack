# ADR-0019 — Payment Provider Integration

## Status

ACCEPTED

## Context

FitTrack processes payments through an external payment gateway. The platform acts as an intermediary marketplace, collecting platform fees and routing the remainder to professionals. Payment gateway interactions involve:
- Asynchronous webhook notifications.
- Potential duplicate or out-of-order event delivery.
- Cryptographically signed payloads.
- Chargebacks and dispute notifications.

Without a formal integration policy, webhooks are processed without validation, duplicate payments are applied twice, and the internal financial model becomes inconsistent with the gateway's state.

## Decision

### 1. Provider Abstraction

The payment provider is abstracted behind a `IPaymentProvider` interface in the application layer. No Billing domain entity, domain event, or repository holds a direct reference to any payment gateway SDK type.

```typescript
interface IPaymentProvider {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>
  validateWebhookSignature(payload: string, signature: string): boolean
  getChargebackDetails(chargebackId: string): Promise<ChargebackDetails>
}
```

The concrete implementation lives in the infrastructure layer. Replacing the payment gateway requires only a new infrastructure implementation — no domain or application layer changes.

### 2. Webhook Validation Protocol

All incoming webhooks from the payment gateway must pass the following validation before any processing:

| Validation Step | Requirement |
|----------------|------------|
| Signature verification | Webhook payload is signed by the gateway; signature verified using gateway-provided secret key (stored in environment config per ADR-0032) |
| Timestamp validation | Event timestamp is within ±5 minutes of server time (prevents replay attacks) |
| Idempotency check | Event ID is checked against the IdempotencyKey store (governed by ADR-0007) |
| Schema validation | Payload structure matches known event schema for the event type |

A webhook failing any validation step is rejected with HTTP 400. The rejection is logged in AuditLog. No domain operation is executed.

### 3. Webhook Event Processing Architecture

Webhooks must not synchronously execute domain operations inline within the HTTP handler:

```
HTTP Webhook Handler
  → Validate signature
  → Validate timestamp
  → Acknowledge receipt (HTTP 200)
  → Enqueue event to internal processing queue

Internal Queue Worker
  → Check idempotency (governed by ADR-0007)
  → Execute domain operation
  → Emit domain event
  → Store idempotency result
```

This decoupling ensures:
- Webhook handler response time is not affected by domain processing latency.
- Processing failures do not cause gateway to retry unnecessarily.
- Retry logic is fully controlled by the internal queue worker.

### 4. Recognized Gateway Event Types

| Gateway Event | Platform Action | Domain Event Emitted |
|--------------|----------------|---------------------|
| `payment.confirmed` | Transaction → `CONFIRMED` | `PurchaseCompleted` |
| `payment.failed` | Transaction → `FAILED` | `PaymentFailed` |
| `refund.created` | Transaction → `REFUNDED` | `PaymentRefunded` |
| `chargeback.created` | Transaction → `CHARGEBACK` | `ChargebackRegistered` |
| `chargeback.won` | AccessGrant revocation cancelled | `ChargebackWon` (future) |
| `chargeback.lost` | AccessGrant revoked | `ChargebackLost` (future) |

Unknown event types are logged and acknowledged without processing.

### 5. Transaction Status Model

Transactions maintain a strict status model mapped from gateway events:

```
PENDING → CONFIRMED (payment.confirmed)
PENDING → FAILED (payment.failed)
CONFIRMED → REFUNDED (refund.created)
CONFIRMED → CHARGEBACK (chargeback.created)
REFUNDED → CHARGEBACK (chargeback.created on refunded transaction)
```

No reverse transitions are permitted. A CONFIRMED transaction cannot return to PENDING.

### 6. Platform Fee Model

The platform recognizes only the `platformFee` component of each transaction as platform revenue:

```
totalAmount = professionalRevenue + platformFee
platformRevenue = platformFee only
```

Platform fee percentages are configuration-driven (ADR-0032). The platform does not own the `professionalRevenue` component. The Ledger (post-MVP, ADR-0021) is the authoritative reconciliation source for all financial components.

### 7. Sensitive Data Prohibition

The platform never stores:
- Full card numbers.
- CVV codes.
- Card expiry dates.
- Full bank account numbers.

Payment method tokens provided by the gateway (which do not expose raw card data) may be stored for recurring billing purposes.

## Invariants

1. No webhook is processed without signature validation and idempotency check.
2. A webhook is never processed synchronously in the HTTP handler's transaction scope.
3. Transaction status transitions are one-directional. No reversal of transitions is permitted.
4. Raw sensitive payment data (card numbers, CVV, expiry) is never stored in the platform database.
5. The platform fee is the only component recognized as platform revenue. All other amounts belong to the professional.

## Constraints

- Webhook secret keys are environment variables (ADR-0032). They are never hardcoded.
- The `IPaymentProvider` interface is the only point of coupling to the gateway. No other code may reference gateway SDK types.
- Webhook acknowledgment (HTTP 200) is returned immediately after validation, before domain processing completes.

## Consequences

**Positive:**
- Gateway can be replaced without domain changes.
- Duplicate payment events are absorbed idempotently.
- No unauthorized domain operations from unvalidated webhooks.

**Negative:**
- Asynchronous processing introduces a consistency window between payment confirmation and AccessGrant creation.
- Internal queue infrastructure required from day one.

## Dependencies

- ADR-0007: Idempotency Policy (webhook deduplication)
- ADR-0008: Entity Lifecycle States (Transaction lifecycle)
- ADR-0016: Formal Eventual Consistency Policy (payment-to-AccessGrant window)
- ADR-0017: Subscription-First Model (payment as prerequisite for AccessGrant)
- ADR-0021: Immutable Financial Ledger (post-MVP reconciliation)
- ADR-0032: Deploy, Environments, and Configuration (gateway secrets management)
- ADR-0038: Webhook and External Integration Policy (webhook processing standards)
