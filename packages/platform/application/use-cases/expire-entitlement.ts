import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementStatus } from '../../domain/enums/entitlement-status.js';
import { EntitlementExpired } from '../../domain/events/entitlement-expired.js';
import { EntitlementNotFoundError } from '../../domain/errors/entitlement-not-found-error.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../../domain/repositories/platform-entitlement-repository.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { ExpireEntitlementInputDTO } from '../dtos/expire-entitlement-input-dto.js';

/**
 * Expires a PlatformEntitlement when its `expiresAt` date has passed.
 *
 * Triggered by a scheduler / cron job (ADR-0032). Actor = SYSTEM.
 *
 * Returns Left if:
 * - Entitlement not found
 * - Entitlement is already EXPIRED (idempotent guard returns Left — caller
 *   should not retry; idempotency is the scheduler's responsibility)
 * - Entitlement is SUSPENDED (cannot expire a suspended entitlement)
 * - `expiresAt` is null or in the future (precondition violation)
 */
export class ExpireEntitlement {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: ExpireEntitlementInputDTO): Promise<DomainResult<void>> {
    // 1. Load aggregate by ID (scheduler provides entitlementId directly)
    const entitlement = await this.repo.findById(dto.entitlementId, dto.professionalProfileId);
    if (entitlement === null) {
      return left(new EntitlementNotFoundError(dto.professionalProfileId));
    }

    // 2. Idempotency — already EXPIRED
    if (entitlement.status === EntitlementStatus.EXPIRED) {
      return right(undefined);
    }

    // 3. Validate precondition: expiresAt must be non-null and in the past
    const now = UTCDateTime.now().toISO();
    if (entitlement.expiresAt === null || entitlement.expiresAt > now) {
      return left(
        new InvalidEntitlementTransitionError(
          'Entitlement cannot be expired: expiresAt is null or in the future.',
          { expiresAt: entitlement.expiresAt, now },
        ),
      );
    }

    // 4. Execute domain transition
    const result = entitlement.expire();
    if (result.isLeft()) return left(result.value);

    const expiredAt = now;

    // 5. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 6. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2, ADR-0027 §3)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      targetEntityId: entitlement.id,
      tenantId: entitlement.professionalProfileId,
      previousStatus: EntitlementStatus.ACTIVE,
      newStatus: EntitlementStatus.EXPIRED,
      reason: `Entitlement expired at ${expiredAt}`,
      occurredAtUtc: expiredAt,
    });

    // 7. Publish EntitlementExpired post-commit (ADR-0009 §4)
    await this.eventPublisher.publishEntitlementExpired(
      new EntitlementExpired(entitlement.id, entitlement.professionalProfileId, {
        expiredAt,
      }),
    );

    return right(undefined);
  }
}
