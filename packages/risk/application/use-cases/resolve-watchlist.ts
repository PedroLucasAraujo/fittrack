import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatusChanged } from '@fittrack/identity';
import { InvalidRiskReasonError } from '../../domain/errors/invalid-risk-reason-error.js';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';
import type { ResolveWatchlistInputDTO } from '../dtos/resolve-watchlist-input-dto.js';

/**
 * Clears WATCHLIST status after a successful admin review, returning the
 * ProfessionalProfile to NORMAL risk (ADR-0022 §2: WATCHLIST → NORMAL).
 *
 * Manual admin action only — no automated resolution path exists (ADR-0022).
 *
 * ## Side effects
 * - Saves the updated ProfessionalProfile.
 * - Writes RISK_STATUS_CHANGED AuditLog entry post-commit (ADR-0027 §2, ADR-0022 Invariant 3).
 * - Publishes `RiskStatusChanged` (v2) with `evidenceRef: null` post-commit
 *   (ADR-0009 §4). Admin resolutions carry no external evidence reference.
 *
 * ## Profile status unchanged
 * This use case modifies `riskStatus` only. The profile's lifecycle status
 * (ACTIVE, SUSPENDED, etc.) is not altered. A SUSPENDED profile that had
 * WATCHLIST risk remains SUSPENDED after resolution.
 */
export class ResolveWatchlist {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(dto: ResolveWatchlistInputDTO): Promise<DomainResult<void>> {
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

    // 4. Execute state transition (WATCHLIST → NORMAL)
    const transitionResult = profile.resolveRisk();
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
    // evidenceRef is null for admin resolutions — no external reference applies.
    await this.eventPublisher.publishRiskStatusChanged(
      new RiskStatusChanged(profile.id, profile.id, {
        previousStatus,
        newStatus: profile.riskStatus,
        reason: trimmedReason,
        evidenceRef: null,
      }),
    );

    return right(undefined);
  }
}
