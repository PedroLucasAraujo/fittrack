# ADR-0048 — Notification and Messaging Architecture

## Status

ACCEPTED

## Context

FitTrack requires outbound notifications to communicate business events to users: booking confirmations, payment receipts, risk alerts, account status changes, and operational warnings. Multiple ADRs reference notifications as a downstream consumer of domain events (ADR-0009 §1.6, §5), and ADR-0038 §6 establishes that outbound integrations — including notifications — are made from application service workers, never from within domain transactions.

However, no existing ADR defines:
- The structural architecture of the notification module.
- The port/adapter abstraction for notification providers.
- The channel taxonomy (email, SMS, WhatsApp, push).
- The relationship between domain events and notification dispatch.
- The LGPD obligations specific to outbound message delivery.
- The failure isolation guarantee that prevents notification failures from corrupting domain state.

This ADR closes that gap by formalizing the notification and messaging architecture as a long-term structural decision. **It does not select concrete providers** (Twilio, SendGrid, Resend, etc.). Provider selection is an infrastructure deployment decision, not an architectural one.

### Audit Findings

An audit of the existing codebase and ADR corpus revealed the following:

**No existing notification infrastructure.** No `notifications/` module, no provider imports, no messaging dependencies in any `package.json`. The codebase is clean.

**No provider coupling.** No direct references to Twilio, SendGrid, Resend, Nodemailer, or any messaging SDK.

**Domain events are defined but not yet dispatched.** Seven domain events exist in `packages/identity/domain/events/` (e.g., `ProfessionalProfileBanned`, `RiskStatusChanged`). UseCases do not yet construct or publish events post-commit. This is expected at the current stage of development.

**No subscriber depends on successful delivery.** No event handler or use case treats notification delivery as a precondition for domain correctness. This is the correct state.

**Relevant ADR references:**
| ADR | Relevance |
|-----|-----------|
| ADR-0009 §1.6 | Events serve for "notifications" (listed as valid consumer) |
| ADR-0009 §5 | "An integration, webhook, or notification channel needs to be informed" |
| ADR-0016 | At-least-once delivery, outbox pattern, DLQ policy |
| ADR-0019 | Payment provider integration pattern (analogous port/adapter model) |
| ADR-0020 | "Professional notified (operational alert, not domain event)" — notification outside event model |
| ADR-0026 | "User receives lockout notification email" — notification outside event model |
| ADR-0028 | LGPD controller/operator classification |
| ADR-0037 | PII logging prohibition, data minimization |
| ADR-0038 §6 | Outbound integration policy (retry, failure isolation, PII constraints) |

**Identified inconsistencies:**
1. ADR-0020 and ADR-0026 reference concrete notification actions ("notify professional", "lockout notification email") without a formal architectural path. This ADR provides that path.
2. ADR-0009 lists notifications as a valid event consumer but provides no guidance on channel routing, delivery guarantees, or failure handling specific to notifications. This ADR fills that gap.
3. ADR-0038 §6 defines generic outbound integration rules but does not distinguish notification-specific concerns (template versioning, channel selection, user preference). This ADR extends ADR-0038 for notification semantics.

## Decision

### §1. Core Principles

1. **The domain never depends on external notification providers.** Domain aggregates, value objects, and domain services have zero knowledge of email, SMS, WhatsApp, or push delivery mechanisms.
2. **UseCases depend only on port interfaces.** The application layer interacts with notification capabilities exclusively through abstract port interfaces defined in the notification module's application layer.
3. **Concrete providers live in the infrastructure layer.** Every provider implementation (email adapter, SMS adapter, WhatsApp adapter) resides in `infra/` and implements the corresponding port interface.
4. **Provider replacement has zero domain or application impact.** Swapping SendGrid for Resend, or Twilio for Vonage, requires changes only in `infra/` and composition root wiring. No use case, domain entity, or port interface is modified.
5. **Notifications are side effects, never source of truth.** A notification confirms what already happened in the domain. It never determines whether something happened. Domain state is authoritative; notifications are informational.
6. **Notification failure never breaks financial or domain consistency.** A failed email does not roll back a payment. A failed SMS does not prevent an AccessGrant from being created. Billing and risk rules are enforced synchronously within the UseCase transaction (ADR-0009 §1.5).

### §2. Module Structure

```
notifications/
  domain/
    enums/
      notification-channel.ts        # EMAIL | SMS | WHATSAPP | PUSH
      notification-status.ts         # PENDING | SENT | DELIVERED | FAILED | DLQ
    value-objects/
      notification-recipient.ts      # userId + channel + address (masked)
  application/
    ports/
      email-provider.ts              # IEmailProvider interface
      sms-provider.ts                # ISmsProvider interface
      whatsapp-provider.ts           # IWhatsAppProvider interface
      push-provider.ts               # IPushProvider interface (reserved for future)
    use-cases/
      send-notification.ts           # Orchestrates channel routing and dispatch
    dtos/
      send-notification-input-dto.ts
      notification-result-dto.ts

infra/
  messaging/
    <provider>-email-provider.ts     # Implements IEmailProvider
    <provider>-sms-provider.ts       # Implements ISmsProvider
    <provider>-whatsapp-provider.ts  # Implements IWhatsAppProvider
```

### §3. Port Interface Contracts

Each notification provider port follows a minimal contract:

```typescript
interface IEmailProvider {
  send(params: {
    to: string;
    subject: string;
    templateId: string;
    variables: Record<string, string>;
  }): Promise<NotificationResult>;
}

interface ISmsProvider {
  send(params: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
  }): Promise<NotificationResult>;
}

interface IWhatsAppProvider {
  send(params: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
  }): Promise<NotificationResult>;
}

interface NotificationResult {
  readonly success: boolean;
  readonly providerMessageId?: string;
  readonly errorCode?: string;
}
```

Port interfaces:
- Accept only primitive types and simple DTOs. No domain objects cross the port boundary.
- Use `templateId` + `variables` for message content. Templates are owned by the provider or a template registry — not embedded in application code.
- Return a `NotificationResult` indicating success or failure. The caller decides what to do with the result (log, retry, DLQ).

### §4. Notification Dispatch Protocol

Notifications are dispatched as a post-commit side effect, following the domain event dispatch model (ADR-0009 §4):

```
1. UseCase validates input, loads aggregate, executes domain operation.
2. Repository persists aggregate within transaction.
3. Transaction commits.
4. UseCase (or event handler) constructs notification request.
5. Notification is dispatched via the appropriate port.
6. If dispatch fails, the notification is queued for retry (ADR-0038 §4 retry policy).
```

Steps 1–3 are the atomic domain transaction. Steps 4–6 are post-commit. **Failure in steps 4–6 never rolls back steps 1–3.**

### §5. Event-Driven Notification Triggers

Notifications are triggered by domain events. The notification module subscribes to events published by the application layer (ADR-0009):

| Domain Event | Notification Channel | Recipient | Content |
|-------------|---------------------|-----------|---------|
| `PurchaseCompleted` | Email | Client | Payment confirmation, AccessGrant details |
| `BookingConfirmed` | Email, Push | Client + Professional | Booking confirmation |
| `BookingCancelled` | Email, Push | Client + Professional | Cancellation notice |
| `ChargebackRegistered` | Email | Professional | Chargeback alert, required actions |
| `ProfessionalProfileApproved` | Email | Professional | Approval confirmation |
| `ProfessionalProfileBanned` | Email | Professional | Ban notification with reason |
| `ProfessionalProfileSuspended` | Email | Professional | Suspension notice |
| `RiskStatusChanged` | Email | Professional | Risk status alert |
| `AccessGrantRevoked` | Email | Client | Service access revocation notice |
| Account lockout (ADR-0026) | Email | User | Lockout notification |

This table is illustrative, not exhaustive. New events may be added as bounded contexts evolve. The notification module must not reject unknown event types — it simply does not subscribe to them.

### §6. Notification Failure and Retry Policy

Notification delivery follows the retry policy established in ADR-0038 §4:

| Attempt | Action |
|---------|--------|
| First failure | Retry after 30 seconds |
| Second failure | Retry after 5 minutes |
| Third failure | Retry after 30 minutes |
| Fourth failure | Move to Dead-Letter Queue (DLQ) |

DLQ events generate a monitoring alert. Notification DLQ events are lower priority than financial DLQ events (ADR-0016 §5). A notification in the DLQ does not constitute a domain inconsistency — it is a delivery failure of an informational side effect.

### §7. LGPD Compliance for Notifications

Under LGPD (ADR-0028), the platform is the primary data controller and notification providers act as data operators (processadores).

| Obligation | Implementation |
|-----------|---------------|
| **Data minimization** | Notification payloads contain only the minimum data required for the message. No full health records, no financial amounts, no raw PII beyond what the template requires. |
| **Provider as operator** | Every notification provider must have a formal LGPD Data Processing Agreement (DPA) before processing personal data (ADR-0037, ADR-0038 §6). |
| **Platform as controller** | FitTrack determines what data is sent, to whom, and for what purpose. The provider executes delivery only. |
| **Log minimization** | Notification logs record: `notificationId`, `channel`, `templateId`, `recipientUserId`, `status`, `timestamp`. Logs MUST NOT contain message body, email content, phone numbers, or names in plain text (ADR-0037 §4). |
| **Consent basis** | Transactional notifications (payment confirmations, booking changes, security alerts) use "performance of contract" as lawful basis. Marketing notifications require explicit opt-in consent and must support opt-out. |
| **Data subject rights** | If a user exercises the right to erasure (ADR-0028 §5), notification logs are anonymized (recipientUserId replaced with anonymized token). Notification delivery records are retained for audit compliance but PII fields are scrubbed. |

### §8. Correct and Incorrect Usage Examples

**CORRECT — UseCase dispatches notification post-commit via port:**
```typescript
// In application/use-cases/confirm-booking.ts
async execute(dto: ConfirmBookingInputDTO): Promise<DomainResult<ConfirmBookingOutputDTO>> {
  // ... domain logic, aggregate mutation, repository save ...
  await this.bookingRepository.save(booking);

  // Post-commit: notification as side effect
  await this.emailProvider.send({
    to: clientEmail,
    subject: 'Booking Confirmed',
    templateId: 'booking-confirmed',
    variables: { bookingId: booking.id, date: booking.dateUtc },
  });

  return right({ ... });
}
```

**CORRECT — Event handler triggers notification:**
```typescript
// In notifications/application/handlers/on-purchase-completed.ts
class OnPurchaseCompleted {
  constructor(private readonly emailProvider: IEmailProvider) {}

  async handle(event: PurchaseCompleted): Promise<void> {
    await this.emailProvider.send({
      to: event.payload.clientEmail,
      templateId: 'purchase-receipt',
      variables: { amount: event.payload.formattedAmount },
    });
  }
}
```

**INCORRECT — Domain aggregate knows about notifications:**
```typescript
// WRONG: Domain aggregate imports notification port
class Booking extends AggregateRoot<BookingProps> {
  confirm(emailProvider: IEmailProvider): void {
    this.status = 'CONFIRMED';
    emailProvider.send({ ... }); // VIOLATION: domain depends on infra
  }
}
```

**INCORRECT — Notification failure blocks domain operation:**
```typescript
// WRONG: Transaction rolled back on notification failure
async execute(dto): Promise<DomainResult<...>> {
  const result = await this.emailProvider.send({ ... });
  if (!result.success) {
    return left(new NotificationFailedError()); // VIOLATION: side effect blocks domain
  }
  await this.repository.save(entity); // Save depends on notification success
}
```

**INCORRECT — Raw PII in notification log:**
```typescript
// WRONG: Logging full email and message body
logger.info('Notification sent', {
  email: 'maria.silva@email.com',  // VIOLATION: raw PII in log (ADR-0037)
  body: 'Olá Maria, seu agendamento...',  // VIOLATION: message content in log
});
```

### §9. Architectural Alignment

| Architectural Concern | Alignment |
|----------------------|-----------|
| **Subscription-first model** | Notifications confirm subscription events (PurchaseCompleted, AccessGrantCreated) but never gate them. AccessGrant creation is synchronous; notification is async. |
| **Marketplace intermediator** | The platform sends notifications on behalf of the marketplace. Professional-to-client direct messaging is outside platform scope. |
| **LGPD** | Provider-as-operator model. Data minimization enforced at port boundary. Consent basis per notification type. |
| **Financial determinism** | Financial operations (ADR-0009 §1.5, ADR-0022) are synchronously consistent. Notifications of financial events are fire-and-forget side effects. A failed payment receipt email does not invalidate the payment. |
| **Domain purity** | Aggregates remain pure state machines (ADR-0009 §1.2). No notification awareness in domain layer. |

## Invariants

1. Domain aggregates never import, reference, or depend on notification provider interfaces.
2. Notification dispatch occurs only after the domain transaction commits. Notification failure never rolls back a committed transaction.
3. Notification logs never contain raw PII (email addresses, phone numbers, message bodies). Only `recipientUserId`, `channel`, `templateId`, and `status` are logged.
4. Every notification provider implementation resides in the infrastructure layer and implements a port interface defined in the application layer.
5. Financial and billing consistency is never contingent on successful notification delivery.
6. Transactional notifications use "performance of contract" as LGPD lawful basis. Marketing notifications require explicit opt-in consent.

## Constraints

- Provider selection is deferred to infrastructure deployment. This ADR does not mandate any specific provider.
- The `IPushProvider` port is reserved for future use. Implementation is not required at MVP.
- Notification templates are managed externally (provider dashboard or template registry). They are not embedded in application source code.
- Every notification provider must have an executed LGPD Data Processing Agreement before production use.
- Notification retry follows ADR-0038 §4. Custom retry policies per channel are not permitted without an ADR amendment.

## Consequences

**Positive:**
- Complete provider portability. Migrating from one email/SMS provider to another requires only a new infrastructure adapter and composition root wiring.
- Domain layer purity is preserved. No notification concerns leak into aggregates or domain services.
- LGPD compliance is structurally enforced: data minimization at the port boundary, operator classification for providers, log sanitization.
- Financial determinism is guaranteed. Notification failures are informational, never transactional.

**Negative:**
- Notification delivery is eventually consistent. A user may experience a brief delay between a domain action and the corresponding notification.
- DLQ management adds operational overhead for notification failures.
- Template management outside application code requires coordination with provider tooling.

## Dependencies

- ADR-0009: Domain Event Contract (events as notification triggers; aggregate purity)
- ADR-0016: Formal Eventual Consistency Policy (at-least-once delivery, outbox pattern, DLQ)
- ADR-0019: Payment Provider Integration (analogous port/adapter pattern for external providers)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (controller/operator classification)
- ADR-0037: Sensitive Data Handling (PII logging prohibition, data minimization)
- ADR-0038: Webhook and External Integration Policy (outbound integration rules, retry policy)
