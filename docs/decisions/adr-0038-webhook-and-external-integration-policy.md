# ADR-0038 — Webhook and External Integration Policy

## Status

ACCEPTED

## Context

FitTrack integrates with external systems, primarily a payment gateway, via webhooks. Future integrations may include scheduling systems, notification providers, and export targets. Webhooks are unreliable by nature: they arrive asynchronously, may be duplicated, may arrive out of order, and may fail silently. Without a formal integration policy, external system failures corrupt internal domain state, duplicated events produce duplicate operations, and integration failure is indistinguishable from success.

## Decision

### 1. Webhook Reception Architecture

Webhook endpoints follow a two-phase processing model:

```
Phase 1: HTTP Handler (synchronous, fast)
  → Validate signature + timestamp
  → Validate payload structure
  → Persist raw event to incoming event queue (or outbox)
  → Return HTTP 200 immediately

Phase 2: Queue Worker (asynchronous, idempotent)
  → Process event using idempotency key
  → Apply domain changes via use case
  → Publish internal domain event if applicable
  → Acknowledge event
```

Phase 1 is decoupled from Phase 2. The HTTP handler never applies domain changes directly.

### 2. Webhook Validation Requirements

Every incoming webhook must pass the following checks before being accepted:

| Validation | Failure Response |
|-----------|-----------------|
| Cryptographic signature validation (HMAC-SHA256) | HTTP 400; AuditLog entry `WEBHOOK_VALIDATION_FAILED` |
| Timestamp freshness (reject events >5 minutes old) | HTTP 400; AuditLog entry `WEBHOOK_VALIDATION_FAILED` |
| Payload schema validation | HTTP 422 |
| Source IP within allowed range (if configured) | HTTP 403 |

A webhook that fails validation is not queued for processing. The failure is logged to AuditLog (actorId = `SYSTEM`).

### 3. Idempotency for Webhook Processing

All webhook processors must be idempotent:
- The webhook payload's provider-assigned event ID serves as the idempotency key.
- Before processing, the worker checks whether the event ID has already been processed (ADR-0007).
- Duplicate events are acknowledged without reprocessing. No domain change is applied.
- The idempotency record is retained for the TTL defined in ADR-0007 (7 days for webhook events).

### 4. Retry and Dead-Letter Queue Policy

| Attempt | Action |
|---------|--------|
| First failure | Retry after 30 seconds |
| Second failure | Retry after 5 minutes |
| Third failure | Retry after 30 minutes |
| Fourth failure | Move to Dead-Letter Queue (DLQ) |

Events in the DLQ generate a monitoring alert. DLQ events require manual investigation and reprocessing. Automatic reprocessing of DLQ events is not permitted without root cause analysis.

### 5. Integration Isolation Invariant

External system failures must never:
- Corrupt Execution records.
- Corrupt financial Transaction records.
- Modify historical AuditLog entries.
- Bypass AccessGrant validation.

Integration failures produce a compensating domain state (e.g., `PAYMENT_FAILED` transaction status) rather than leaving the domain in an invalid intermediate state.

### 6. Outbound Integration Policy

For future outbound integrations (data export, notifications, third-party webhooks):
- Outbound calls are made from application service workers, not from within domain transactions.
- Outbound failures do not roll back the originating domain transaction.
- Outbound calls use the retry policy in Section 4.
- Outbound calls never contain raw PII unless the target has an active LGPD data processing agreement (ADR-0037).

### 7. Recognized External Event Types

| Event Source | Event Type | Internal Domain Action |
|-------------|-----------|----------------------|
| Payment gateway | `payment.confirmed` | Create Transaction → create AccessGrant |
| Payment gateway | `payment.refunded` | Update Transaction status → trigger revocation |
| Payment gateway | `payment.chargeback` | Register chargeback → trigger risk evaluation |
| Payment gateway | `payment.failed` | Update Transaction status → no AccessGrant |

All event type mappings are registered in the Payment context (ADR-0019). No event type is processed without an explicit registered handler.

## Invariants

1. Webhook HTTP handlers never apply domain changes. Phase 1 and Phase 2 are always decoupled.
2. Every webhook processor is idempotent; duplicate events are acknowledged without reprocessing.
3. External system failures never corrupt Execution, Transaction, or AuditLog records.
4. Webhook signature validation failure produces an AuditLog entry with action `WEBHOOK_VALIDATION_FAILED`.
5. DLQ events require manual investigation; automatic retry without root cause analysis is not permitted.

## Constraints

- Webhook endpoints are rate-limited per source IP per ADR-0026.
- Webhook signature secrets are stored in the secrets manager per ADR-0033.
- Outbound integrations to third-party systems require LGPD data processing agreements before transmitting personal data.

## Consequences

**Positive:**
- Domain state is protected from external system unreliability.
- Duplicate events are handled gracefully without domain duplication.
- Webhook failures are visible and actionable via monitoring and DLQ.

**Negative:**
- Two-phase processing adds latency between webhook receipt and domain state update.
- DLQ management requires operational discipline.

## Dependencies

- ADR-0007: Idempotency Policy (webhook event idempotency key)
- ADR-0009: Domain Event Contract (internal domain event produced after webhook processing)
- ADR-0019: Payment Provider Integration (payment webhook event types)
- ADR-0026: Rate Limiting and Security Policies (webhook endpoint rate limiting)
- ADR-0027: Audit and Traceability (webhook validation failure logging)
- ADR-0033: Security Policies and Defense-in-Depth (webhook signature secret management)
- ADR-0037: Sensitive Data Handling (outbound integration PII requirements)
