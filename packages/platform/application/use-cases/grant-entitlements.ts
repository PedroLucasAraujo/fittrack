import { left, right, generateId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { PlatformEntitlement } from '../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../domain/enums/entitlement-status.js';
import { EntitlementGranted } from '../../domain/events/entitlement-granted.js';
import { InvalidEntitlementTransitionError } from '../../domain/errors/invalid-entitlement-transition-error.js';
import type { IPlatformEntitlementRepository } from '../ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../ports/platform-entitlement-audit-log-port.js';
import type { GrantEntitlementsInputDTO } from '../dtos/grant-entitlements-input-dto.js';

/**
 * Grants (or re-grants) capabilities to a professional.
 *
 * If no entitlement exists for the professional, a new one is created in
 * ACTIVE status. If an existing entitlement is found (regardless of status),
 * it is updated in-place via `grantCapabilities()` which resets status to
 * ACTIVE and replaces the capability set.
 *
 * ## One aggregate per transaction (ADR-0003)
 * Only PlatformEntitlement is modified.
 */
export class GrantEntitlements {
  constructor(
    private readonly repo: IPlatformEntitlementRepository,
    private readonly eventPublisher: IPlatformEntitlementEventPublisher,
    private readonly auditLog: IPlatformEntitlementAuditLog,
  ) {}

  async execute(dto: GrantEntitlementsInputDTO): Promise<DomainResult<void>> {
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

    // 2. Validate entitlements list
    if (!dto.entitlements || dto.entitlements.length === 0) {
      return left(
        new InvalidEntitlementTransitionError(
          'Entitlements list must contain at least one capability.',
        ),
      );
    }

    const expiresAt = dto.expiresAt ?? null;

    // 3. Load or create aggregate
    const existing = await this.repo.findByProfessionalProfileId(dto.professionalProfileId);

    let entitlement: PlatformEntitlement;
    let previousStatus: EntitlementStatus | undefined;

    if (existing === null) {
      entitlement = PlatformEntitlement.create(
        generateId(),
        dto.professionalProfileId,
        dto.entitlements,
        expiresAt,
        UTCDateTime.now().toISO(),
      );
    } else {
      previousStatus = existing.status;
      existing.grantCapabilities(dto.entitlements, expiresAt);
      entitlement = existing;
    }

    // 4. Persist (ADR-0003)
    await this.repo.save(entitlement);

    // 5. Write AuditLog post-commit, fire-and-forget (ADR-0027 §2)
    await this.auditLog.writePlatformEntitlementChanged({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      targetEntityId: entitlement.id,
      tenantId: dto.professionalProfileId,
      previousStatus,
      newStatus: entitlement.status,
      addedCapabilities: dto.entitlements,
      reason: trimmedReason,
      occurredAtUtc: UTCDateTime.now().toISO(),
    });

    // 6. Publish EntitlementGranted post-commit (ADR-0009 §4)
    await this.eventPublisher.publishEntitlementGranted(
      new EntitlementGranted(entitlement.id, dto.professionalProfileId, {
        entitlements: [...entitlement.entitlements],
        expiresAt,
      }),
    );

    return right(undefined);
  }
}
