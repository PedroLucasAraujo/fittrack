import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatus, RiskStatusChanged } from '@fittrack/identity';
import { RiskIndicators } from '../../domain/value-objects/risk-indicators.js';
import { RiskThreshold } from '../../domain/value-objects/risk-threshold.js';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';
import type { HandleHighCancellationRateAssessmentInputDTO } from '../dtos/handle-high-cancellation-rate-assessment-input-dto.js';

/**
 * Automated risk assessment triggered by professional-initiated cancellation
 * rate signals (ADR-0053 §1).
 *
 * ## Escalation logic
 *
 * | Current RiskStatus | cancellationRate > limit | Outcome |
 * |--------------------|--------------------------|---------|
 * | NORMAL             | true                     | NORMAL → WATCHLIST |
 * | WATCHLIST          | any                      | No-op (idempotent) |
 * | BANNED             | any                      | No-op (terminal) |
 * | Any                | false                    | No-op (threshold not exceeded) |
 *
 * ## Threshold
 * Default: > 30% cancellation rate in 14 days → WATCHLIST (ADR-0053 §1).
 * Comparison is exclusive: a rate exactly at 0.30 does NOT trigger escalation
 * (ADR-0053 §4, Invariant 3).
 *
 * ## AuditLog actor (ADR-0027 §3)
 * Automated actions use `actorId = 'SYSTEM'` and `actorRole = 'SYSTEM'`.
 *
 * ## One aggregate per transaction (ADR-0003)
 * Only `ProfessionalProfile` is modified. Downstream enforcement is handled
 * by other contexts reacting to `RiskStatusChanged`.
 */
export class HandleHighCancellationRateAssessment {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(dto: HandleHighCancellationRateAssessmentInputDTO): Promise<DomainResult<void>> {
    // 1. Validate and construct RiskIndicators VO
    const indicatorsResult = RiskIndicators.create({
      paymentFailureCount: 0,
      cancellationRate: dto.cancellationRate,
      windowDays: dto.windowDays,
    });
    if (indicatorsResult.isLeft()) return left(indicatorsResult.value);
    const indicators = indicatorsResult.value;

    // 2. Evaluate against canonical thresholds (ADR-0053 §6 — no magic numbers)
    const threshold = RiskThreshold.defaults();
    if (!indicators.isCancellationRateThresholdExceeded(threshold)) {
      return right(undefined);
    }

    // 3. Load aggregate
    const profile = await this.repo.findById(dto.professionalProfileId);
    if (profile === null) {
      return left(new ProfessionalRiskNotFoundError(dto.professionalProfileId));
    }

    // 4. Idempotency guard — BANNED is terminal (ADR-0022 Invariant 1)
    if (profile.riskStatus === RiskStatus.BANNED) {
      return right(undefined);
    }

    // 5. Idempotency — already WATCHLIST, no further escalation from this trigger
    if (profile.riskStatus === RiskStatus.WATCHLIST) {
      return right(undefined);
    }

    // 6. Capture previous status for event payload
    const previousStatus = profile.riskStatus;
    const ratePercent = (indicators.cancellationRate * 100).toFixed(1);
    const limitPercent = (threshold.cancellationRateLimit * 100).toFixed(1);
    const reason = `Cancellation rate threshold exceeded: ${ratePercent}% in ${indicators.windowDays}d (limit: ${limitPercent}%)`;

    // 7. Execute state transition: NORMAL → WATCHLIST (ADR-0022 §2, ADR-0053 §1)
    // Note: Left is unreachable here — escalateToWatchlist() only rejects non-NORMAL riskStatus,
    // and WATCHLIST/BANNED are already guarded at steps 4-5.
    /* v8 ignore next 2 */
    const transitionResult = profile.escalateToWatchlist();
    if (transitionResult.isLeft()) return left(transitionResult.value);

    // 8. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(profile);

    // 9. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2, §3)
    await this.auditLog.writeRiskStatusChanged({
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      targetEntityId: profile.id,
      tenantId: profile.id,
      previousStatus,
      newStatus: profile.riskStatus,
      reason,
      occurredAtUtc: UTCDateTime.now().value,
    });

    // 10. Publish RiskStatusChanged v2 post-commit (ADR-0009 §4)
    await this.eventPublisher.publishRiskStatusChanged(
      new RiskStatusChanged(profile.id, profile.id, {
        previousStatus,
        newStatus: profile.riskStatus,
        reason,
        evidenceRef: dto.evidenceRef ?? null,
      }),
    );

    return right(undefined);
  }
}
