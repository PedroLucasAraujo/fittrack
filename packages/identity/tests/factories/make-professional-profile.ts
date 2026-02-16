import { generateId, UTCDateTime } from '@fittrack/core';
import { ProfessionalProfile } from '../../domain/aggregates/professional-profile.js';
import type { ProfessionalProfileProps } from '../../domain/aggregates/professional-profile.js';
import { PersonName } from '../../domain/value-objects/person-name.js';
import { ProfessionalProfileStatus } from '../../domain/enums/professional-profile-status.js';
import { RiskStatus } from '../../domain/enums/risk-status.js';

type ProfileOverrides = Partial<{
  id: string;
  userId: string;
  displayName: PersonName;
  status: ProfessionalProfileStatus;
  riskStatus: RiskStatus;
  version: number;
  bannedAtUtc: UTCDateTime | null;
  bannedReason: string | null;
  deactivatedAtUtc: UTCDateTime | null;
  closedAtUtc: UTCDateTime | null;
  closedReason: string | null;
  suspendedAtUtc: UTCDateTime | null;
}>;

/**
 * Test factory for creating valid ProfessionalProfile aggregates.
 *
 * By default creates a profile in ACTIVE status with NORMAL riskStatus,
 * ready for most test scenarios. Uses `reconstitute` to allow setting
 * arbitrary status without going through the state machine.
 */
export function makeProfessionalProfile(
  overrides: ProfileOverrides = {},
): ProfessionalProfile {
  const nameResult = PersonName.create('Dr. Smith');

  return ProfessionalProfile.reconstitute(
    overrides.id ?? generateId(),
    {
      userId: overrides.userId ?? generateId(),
      displayName: overrides.displayName ?? nameResult.value as PersonName,
      status: overrides.status ?? ProfessionalProfileStatus.ACTIVE,
      riskStatus: overrides.riskStatus ?? RiskStatus.NORMAL,
      createdAtUtc: UTCDateTime.now(),
      bannedAtUtc: overrides.bannedAtUtc ?? null,
      bannedReason: overrides.bannedReason ?? null,
      deactivatedAtUtc: overrides.deactivatedAtUtc ?? null,
      closedAtUtc: overrides.closedAtUtc ?? null,
      closedReason: overrides.closedReason ?? null,
      suspendedAtUtc: overrides.suspendedAtUtc ?? null,
    },
    overrides.version ?? 0,
  );
}

/**
 * Creates a newly-created profile (PENDING_APPROVAL) via the domain factory.
 * Emits ProfessionalProfileCreated event.
 */
export function makeNewProfessionalProfile(
  overrides: Partial<{ id: string; userId: string; displayName: PersonName }> = {},
): ProfessionalProfile {
  const nameResult = PersonName.create('Dr. Smith');

  const result = ProfessionalProfile.create({
    id: overrides.id ?? generateId(),
    userId: overrides.userId ?? generateId(),
    displayName: overrides.displayName ?? nameResult.value as PersonName,
  });

  if (result.isLeft()) {
    throw new Error(`makeNewProfessionalProfile failed: ${result.value.message}`);
  }

  return result.value;
}
