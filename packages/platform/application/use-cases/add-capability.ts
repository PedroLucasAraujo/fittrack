import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementCapabilityAdded } from '../../domain/events/entitlement-capability-added.js';
import { EntitlementNotFoundError } from '../../domain/errors/entitlement-not-found-error.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { AddCapabilityInputDTO } from '../dtos/add-capability-input-dto.js';

/**
 * Adds a single capability to an existing PlatformEntitlement.
 *
 * Idempotent: if the capability is already present, the operation succeeds
 * without emitting events or writing audit log entries.
 */
export class AddCapability {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: AddCapabilityInputDTO): Promise<DomainResult<void>> {
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

    // 3. Check idempotency before state transition
    const alreadyPresent =
      entitlement.hasCapability(dto.capability) ||
      entitlement.entitlements.includes(dto.capability);
    if (alreadyPresent) {
      return right(undefined);
    }

    // 4. Execute domain method
    const result = entitlement.addCapability(dto.capability);
    if (result.isLeft()) return left(result.value);

    // 5. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 6. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: entitlement.id,
      tenantId: dto.professionalProfileId,
      addedCapabilities: [dto.capability],
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 7. Publish EntitlementCapabilityAdded post-commit (ADR-0009 §4)
    await this.eventPublisher.publishCapabilityAdded(
      new EntitlementCapabilityAdded(entitlement.id, dto.professionalProfileId, {
        capability: dto.capability,
        reason: trimmedReason,
      }),
    );

    return right(undefined);
  }
}
