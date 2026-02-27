import type { SelfLogRecordedEvent } from '../../domain/events/self-log-recorded-event.js';
import type { SelfLogAnonymizedEvent } from '../../domain/events/self-log-anonymized-event.js';

/**
 * Port for publishing domain events from the SelfLog bounded context (ADR-0009 §4).
 *
 * The Application layer (use cases) is the sole dispatcher of domain events.
 * Events are published **post-commit** — after the producing transaction
 * commits successfully (ADR-0009 §1, ADR-0003 §4).
 *
 * Infrastructure implementations may publish to an in-process dispatcher,
 * an outbox table, or an external message bus (ADR-0009, ADR-0016).
 *
 * Downstream consumers: Analytics, Dashboard read models, LGPD audit log.
 */
export interface ISelfLogEventPublisher {
  publishSelfLogRecorded(event: SelfLogRecordedEvent): Promise<void>;
  publishSelfLogAnonymized(event: SelfLogAnonymizedEvent): Promise<void>;
}
