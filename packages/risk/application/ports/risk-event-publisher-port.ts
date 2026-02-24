import type { RiskStatusChanged } from '@fittrack/identity';

/**
 * Event publisher port for the Risk bounded context.
 *
 * All RiskStatus transitions emit a `RiskStatusChanged` (v2) event after
 * the aggregate is persisted (ADR-0009 §4 post-commit dispatch rule).
 * The infrastructure adapter routes events to the configured event bus.
 */
export interface IRiskEventPublisher {
  publishRiskStatusChanged(event: RiskStatusChanged): Promise<void>;
}
