import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementStatus } from '../../domain/enums/entitlement-status.js';
import { EntitlementSuspended } from '../../domain/events/entitlement-suspended.js';
import { EntitlementNotFoundError } from '../../domain/errors/entitlement-not-found-error.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../../domain/repositories/platform-entitlement-repository.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { SuspendEntitlementInputDTO } from '../dtos/suspend-entitlement-input-dto.js';

/**
 * Suspends a PlatformEntitlement (ACTIVE → SUSPENDED).
 *
 * Triggered by:
 * - `RiskStatusChanged(newStatus=BANNED)` — actorId/actorRole = 'SYSTEM' (ADR-0027 §3)
 * - Manual admin action — actorId/actorRole = admin identity
 *
 * Idempotent: if the entitlement is already SUSPENDED, returns Right(void)
 * with no state change, no audit write, and no event publish.
 *
 * Returns Left if:
 * - Entitlement not found (EntitlementNotFoundError)
 * - Entitlement is EXPIRED (InvalidEntitlementTransitionError)
 * - Reason is empty or exceeds 500 chars (InvalidEntitlementTransitionError)
 */
export class SuspendEntitlement {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: SuspendEntitlementInputDTO): Promise<DomainResult<void>> {
    // 1. Validate reason
    const trimmedReason = dto.reason.trim();
    if (trimmedReason.length === 0 || trimmedReason.length > 500) {
      return left(
        new InvalidEntitlementTransitionError(
          'Reason must be non-empty and at most 500 characters.',
          { reason: dto.reason },
        ),
      );
    }

    // 2. Load aggregate
    const entitlement = await this.repo.findByProfessionalProfileId(dto.professionalProfileId);
    if (entitlement === null) {
      return left(new EntitlementNotFoundError(dto.professionalProfileId));
    }

    // 3. Idempotency guard — already SUSPENDED is a no-op
    if (entitlement.status === EntitlementStatus.SUSPENDED) {
      return right(undefined);
    }

    // 4. Execute domain transition
    const result = entitlement.suspend(trimmedReason);
    if (result.isLeft()) return left(result.value);

    // 5. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 6. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: entitlement.id,
      tenantId: dto.professionalProfileId,
      previousStatus: EntitlementStatus.ACTIVE,
      newStatus: EntitlementStatus.SUSPENDED,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 7. Publish EntitlementSuspended post-commit (ADR-0009 §4)
    await this.eventPublisher.publishEntitlementSuspended(
      new EntitlementSuspended(entitlement.id, dto.professionalProfileId, {
        reason: trimmedReason,
        evidenceRef: dto.evidenceRef ?? null,
      }),
    );

    return right(undefined);
  }
}
