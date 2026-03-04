import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatus, RiskStatusChanged } from '@fittrack/identity';
import { InvalidRiskReasonError } from '../../domain/errors/invalid-risk-reason-error.js';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';
import type { BanProfessionalInputDTO } from '../dtos/ban-professional-input-dto.js';

/**
 * Permanently bans a ProfessionalProfile (ADR-0022 §2: * → BANNED).
 *
 * BANNED is a terminal RiskStatus. Once reached, no further risk transitions
 * are possible (ADR-0022 Invariant 1). This use case is idempotent on the
 * terminal state: if the profile is already BANNED it returns `Right(void)`
 * without performing any writes or publishing any events.
 *
 * `escalateToBanned()` delegates to `ban()` on the aggregate, which also
 * sets `profile.status = BANNED` and records `bannedAtUtc` / `bannedReason`.
 *
 * ## Side effects (on non-idempotent paths)
 * - Saves the updated ProfessionalProfile.
 * - Writes RISK_STATUS_CHANGED AuditLog entry post-commit (ADR-0027 §2, ADR-0022 Invariant 3).
 * - Publishes `RiskStatusChanged` (v2) post-commit (ADR-0009 §4).
 *
 * ## AccessGrant suspension (ADR-0022 §4, ADR-0003)
 * AccessGrant suspension is handled by the Billing context via eventual
 * consistency. The Billing context subscribes to `RiskStatusChanged(BANNED)`
 * and suspends all active AccessGrants for the professional. This use case
 * does NOT call any AccessGrant port (one aggregate per transaction — ADR-0003).
 */
export class BanProfessional {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(dto: BanProfessionalInputDTO): Promise<DomainResult<void>> {
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
    if (profile.riskStatus === RiskStatus.BANNED) {
      return right(undefined);
    }

    // 4. Capture previous status for event payload
    const previousStatus = profile.riskStatus;

    // 5. Execute state transition (* → BANNED)
    const transitionResult = profile.escalateToBanned(trimmedReason);
    if (transitionResult.isLeft()) return left(transitionResult.value);

    // 6. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(profile);

    // 7. Write AuditLog entry post-commit, fire-and-forget (ADR-0027 §2, ADR-0022 Invariant 3)
    await this.auditLog.writeRiskStatusChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: profile.id,
      tenantId: profile.id,
      previousStatus,
      newStatus: RiskStatus.BANNED,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 8. Publish RiskStatusChanged v2 post-commit (ADR-0009 §4)
    await this.eventPublisher.publishRiskStatusChanged(
      new RiskStatusChanged(profile.id, profile.id, {
        previousStatus,
        newStatus: RiskStatus.BANNED,
        reason: trimmedReason,
        evidenceRef: dto.evidenceRef ?? null,
      }),
    );

    return right(undefined);
  }
}
