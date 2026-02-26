import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementCapabilityRemoved } from '../../domain/events/entitlement-capability-removed.js';
import { EntitlementNotFoundError } from '../../domain/errors/entitlement-not-found-error.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../../domain/repositories/platform-entitlement-repository.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { RemoveCapabilityInputDTO } from '../dtos/remove-capability-input-dto.js';

/**
 * Removes a single capability from an existing PlatformEntitlement.
 *
 * Returns Left if the capability is not present or if the entitlement is not
 * in ACTIVE status.
 */
export class RemoveCapability {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: RemoveCapabilityInputDTO): Promise<DomainResult<void>> {
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

    // 3. Execute domain method
    const result = entitlement.removeCapability(dto.capability);
    if (result.isLeft()) return left(result.value);

    // 4. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 5. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: entitlement.id,
      tenantId: dto.professionalProfileId,
      removedCapabilities: [dto.capability],
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 6. Publish EntitlementCapabilityRemoved post-commit (ADR-0009 §4)
    await this.eventPublisher.publishCapabilityRemoved(
      new EntitlementCapabilityRemoved(entitlement.id, dto.professionalProfileId, {
        capability: dto.capability,
        reason: trimmedReason,
      }),
    );

    return right(undefined);
  }
}
