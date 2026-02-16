import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted when a ProfessionalProfile transitions to CLOSED (terminal).
 *
 * CLOSED represents formal account closure (administrative, trial expiry,
 * or system-initiated). Distinct from DEACTIVATED (voluntary) and BANNED
 * (punitive).
 *
 * Per ADR-0013 Extension: closure does NOT revoke existing AccessGrants.
 * Clients retain access to previously granted Deliverables.
 */
export class ProfessionalProfileClosed extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileClosed';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      previousStatus: string;
      previousRiskStatus: string;
      reason: string;
    }>,
  ) {
    super(1);
  }
}
