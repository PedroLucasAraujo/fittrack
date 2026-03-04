import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatus, RiskStatusChanged } from '@fittrack/identity';
import { InvalidRiskReasonError } from '../../domain/errors/invalid-risk-reason-error.js';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';
import type { ProcessAdministrativeRiskReportInputDTO } from '../dtos/process-administrative-risk-report-input-dto.js';

/**
 * Admin-driven risk escalation to any target RiskStatus (ADR-0022 §5).
 *
 * ## Escalation logic
 *
 * | Current RiskStatus | targetRiskStatus | Outcome |
 * |--------------------|-----------------|---------|
 * | BANNED             | any             | No-op — idempotent (terminal guard fires first) |
 * | WATCHLIST          | WATCHLIST       | No-op — idempotent |
 * | NORMAL             | WATCHLIST       | NORMAL → WATCHLIST |
 * | NORMAL/WATCHLIST   | BANNED          | → BANNED (terminal, irreversible) |
 *
 * ## Idempotency
 * - If already BANNED: returns `Right(void)` without any side effects, regardless
 *   of `targetRiskStatus`. The BANNED terminal guard fires before target-status
 *   branching.
 * - If targetRiskStatus = WATCHLIST and already WATCHLIST: returns `Right(void)`
 *   without side effects. The use case checks current status before calling the
 *   aggregate (which would return `Left` on re-escalation).
 *
 * ## One aggregate per transaction (ADR-0003)
 * Only `ProfessionalProfile` is modified. AccessGrant suspension and downstream
 * operational enforcement are handled by other contexts reacting to
 * `RiskStatusChanged(BANNED)`.
 */
export class ProcessAdministrativeRiskReport {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(dto: ProcessAdministrativeRiskReportInputDTO): Promise<DomainResult<void>> {
    // 1. Validate reason: non-empty, trimmed ≤ 500 chars (ADR-0022 §5)
    const trimmedReason = dto.reason.trim();
    if (trimmedReason.length === 0 || trimmedReason.length > 500) {
      return left(new InvalidRiskReasonError(dto.reason));
    }

    // 2. Load aggregate
    const profile = await this.repo.findById(dto.professionalProfileId);
    if (profile === null) {
      return left(new ProfessionalRiskNotFoundError(dto.professionalProfileId));
    }

    // 3. Idempotency guard — BANNED is terminal (ADR-0022 Invariant 1)
    // This guard fires before target-status branching: a BANNED profile with
    // targetRiskStatus='WATCHLIST' is a no-op, not an error.
    if (profile.riskStatus === RiskStatus.BANNED) {
      return right(undefined);
    }

    // 4. Capture previous status for event payload
    const previousStatus = profile.riskStatus;

    // 5. Execute state transition based on targetRiskStatus
    if (dto.targetRiskStatus === 'WATCHLIST') {
      // Idempotent: already WATCHLIST → no side effects
      if (profile.riskStatus === RiskStatus.WATCHLIST) {
        return right(undefined);
      }
      // Note: Left is unreachable — escalateToWatchlist() only rejects non-NORMAL riskStatus,
      // and WATCHLIST is already guarded at line 69, BANNED at step 3.
      /* v8 ignore next 2 */
      const transitionResult = profile.escalateToWatchlist();
      if (transitionResult.isLeft()) return left(transitionResult.value);
    } else {
      // targetRiskStatus === 'BANNED'
      const transitionResult = profile.escalateToBanned(trimmedReason);
      if (transitionResult.isLeft()) return left(transitionResult.value);
    }

    // 6. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(profile);

    // 7. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    // Human-initiated action: use actorId and actorRole from dto (ADR-0027 §2)
    await this.auditLog.writeRiskStatusChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: profile.id,
      tenantId: profile.id,
      previousStatus,
      newStatus: profile.riskStatus,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().value,
    });

    // 8. Publish RiskStatusChanged v2 post-commit (ADR-0009 §4)
    await this.eventPublisher.publishRiskStatusChanged(
      new RiskStatusChanged(profile.id, profile.id, {
        previousStatus,
        newStatus: profile.riskStatus,
        reason: trimmedReason,
        evidenceRef: dto.evidenceRef ?? null,
      }),
    );

    return right(undefined);
  }
}
