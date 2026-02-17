import { generateId, UTCDateTime } from '@fittrack/core';
import { AccessGrant } from '../../domain/aggregates/access-grant.js';
import { AccessGrantStatus } from '../../domain/enums/access-grant-status.js';

type AccessGrantOverrides = Partial<{
  id: string;
  clientId: string;
  professionalProfileId: string;
  servicePlanId: string;
  transactionId: string;
  status: AccessGrantStatus;
  sessionAllotment: number | null;
  sessionsConsumed: number;
  validFrom: UTCDateTime;
  validUntil: UTCDateTime | null;
  version: number;
  suspendedAtUtc: UTCDateTime | null;
  revokedAtUtc: UTCDateTime | null;
  revokedReason: string | null;
}>;

/**
 * Test factory for creating valid AccessGrant aggregates.
 *
 * By default creates an ACTIVE grant with 12 session allotment.
 * Uses `reconstitute` to allow setting arbitrary status.
 */
export function makeAccessGrant(overrides: AccessGrantOverrides = {}): AccessGrant {
  return AccessGrant.reconstitute(
    overrides.id ?? generateId(),
    {
      clientId: overrides.clientId ?? generateId(),
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      servicePlanId: overrides.servicePlanId ?? generateId(),
      transactionId: overrides.transactionId ?? generateId(),
      status: overrides.status ?? AccessGrantStatus.ACTIVE,
      sessionAllotment: 'sessionAllotment' in overrides ? overrides.sessionAllotment! : 12,
      sessionsConsumed: overrides.sessionsConsumed ?? 0,
      validFrom: overrides.validFrom ?? UTCDateTime.now(),
      validUntil: overrides.validUntil ?? null,
      createdAtUtc: UTCDateTime.now(),
      suspendedAtUtc: overrides.suspendedAtUtc ?? null,
      revokedAtUtc: overrides.revokedAtUtc ?? null,
      revokedReason: overrides.revokedReason ?? null,
    },
    overrides.version ?? 0,
  );
}

/**
 * Creates a newly-created AccessGrant (ACTIVE) via the domain factory.
 */
export function makeNewAccessGrant(
  overrides: Partial<{
    id: string;
    clientId: string;
    professionalProfileId: string;
    servicePlanId: string;
    transactionId: string;
    sessionAllotment: number | null;
    validFrom: UTCDateTime;
    validUntil: UTCDateTime | null;
  }> = {},
): AccessGrant {
  const result = AccessGrant.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    clientId: overrides.clientId ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    servicePlanId: overrides.servicePlanId ?? generateId(),
    transactionId: overrides.transactionId ?? generateId(),
    sessionAllotment: 'sessionAllotment' in overrides ? overrides.sessionAllotment! : 12,
    validFrom: overrides.validFrom ?? UTCDateTime.now(),
    validUntil: overrides.validUntil ?? null,
  });

  if (result.isLeft()) {
    throw new Error(`makeNewAccessGrant failed: ${result.value.message}`);
  }

  return result.value;
}
