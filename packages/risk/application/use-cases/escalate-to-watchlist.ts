import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatusChanged } from '@fittrack/identity';
import { InvalidRiskReasonError } from '../../domain/errors/invalid-risk-reason-error.js';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';
import type { EscalateToWatchlistInputDTO } from '../dtos/escalate-to-watchlist-input-dto.js';

/**
 * Transitions a ProfessionalProfile's RiskStatus from NORMAL to WATCHLIST.
 *
 * Triggered by admin governance actions when risk signals are detected but
 * not yet confirmed (ADR-0022 §5, §2 transition: NORMAL → WATCHLIST).
 *
 * ## Side effects
 * - Saves the updated ProfessionalProfile.
 * - Writes RISK_STATUS_CHANGED AuditLog entry post-commit (ADR-0027 §2, ADR-0022 Invariant 3).
 * - Publishes `RiskStatusChanged` (v2) post-commit (ADR-0009 §4).
 *
 * ## One aggregate per transaction (ADR-0003)
 * Only `ProfessionalProfile` is modified. Downstream operational limit
 * enforcement (ADR-0041 §2) is the responsibility of Billing and Scheduling
 * contexts reacting to `RiskStatusChanged`.
 */
export class EscalateToWatchlist {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(dto: EscalateToWatchlistInputDTO): Promise<DomainResult<void>> {
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

    // 3. Capture previous status for event payload
    const previousStatus = profile.riskStatus;

    // 4. Execute state transition (NORMAL → WATCHLIST)
    const transitionResult = profile.escalateToWatchlist();
    if (transitionResult.isLeft()) return left(transitionResult.value);

    // 5. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(profile);

    // 6. Write AuditLog entry post-commit, fire-and-forget (ADR-0027 §2, ADR-0022 Invariant 3)
    await this.auditLog.writeRiskStatusChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: profile.id,
      tenantId: profile.id,
      previousStatus,
      newStatus: profile.riskStatus,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 7. Publish RiskStatusChanged v2 post-commit (ADR-0009 §4)
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
