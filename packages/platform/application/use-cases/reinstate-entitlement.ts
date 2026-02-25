import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementStatus } from '../../domain/enums/entitlement-status.js';
import { EntitlementReinstated } from '../../domain/events/entitlement-reinstated.js';
import { EntitlementNotFoundError } from '../../domain/errors/entitlement-not-found-error.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { ReinstateEntitlementInputDTO } from '../dtos/reinstate-entitlement-input-dto.js';

/**
 * Reinstates a suspended PlatformEntitlement (SUSPENDED → ACTIVE).
 *
 * Restores the preserved capabilities snapshot without reprocessing billing.
 *
 * Idempotent: if the entitlement is already ACTIVE, returns Right(void)
 * with no state change, no audit write, and no event publish.
 *
 * Returns Left if:
 * - Entitlement not found
 * - Entitlement is EXPIRED (invalid transition)
 * - Reason is empty or exceeds 500 chars
 */
export class ReinstateEntitlement {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: ReinstateEntitlementInputDTO): Promise<DomainResult<void>> {
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

    // 3. Idempotency guard — already ACTIVE is a no-op
    if (entitlement.status === EntitlementStatus.ACTIVE) {
      return right(undefined);
    }

    // 4. Execute domain transition
    const result = entitlement.reinstate();
    if (result.isLeft()) return left(result.value);

    // 5. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 6. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: entitlement.id,
      tenantId: dto.professionalProfileId,
      previousStatus: EntitlementStatus.SUSPENDED,
      newStatus: EntitlementStatus.ACTIVE,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 7. Publish EntitlementReinstated post-commit (ADR-0009 §4)
    await this.eventPublisher.publishEntitlementReinstated(
      new EntitlementReinstated(entitlement.id, dto.professionalProfileId, {
        reason: trimmedReason,
      }),
    );

    return right(undefined);
  }
}
