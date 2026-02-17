import { generateId, UTCDateTime, Money } from '@fittrack/core';
import { ServicePlan } from '../../domain/aggregates/service-plan.js';
import { ServicePlanStatus } from '../../domain/enums/service-plan-status.js';
import { PlanType } from '../../domain/enums/plan-type.js';

type ServicePlanOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  name: string;
  description: string;
  price: Money;
  durationDays: number;
  sessionAllotment: number | null;
  type: PlanType;
  status: ServicePlanStatus;
  version: number;
  activatedAtUtc: UTCDateTime | null;
  archivedAtUtc: UTCDateTime | null;
}>;

/**
 * Test factory for creating valid ServicePlan aggregates.
 *
 * By default creates a plan in ACTIVE status, ready for most test scenarios.
 * Uses `reconstitute` to allow setting arbitrary status.
 */
export function makeServicePlan(overrides: ServicePlanOverrides = {}): ServicePlan {
  const priceResult = Money.create(9990, 'BRL');

  return ServicePlan.reconstitute(
    overrides.id ?? generateId(),
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      name: overrides.name ?? 'Monthly Training Plan',
      description: overrides.description ?? 'Complete fitness training plan',
      price: overrides.price ?? (priceResult.value as Money),
      durationDays: overrides.durationDays ?? 30,
      sessionAllotment: 'sessionAllotment' in overrides ? overrides.sessionAllotment! : 12,
      type: overrides.type ?? PlanType.RECURRING,
      status: overrides.status ?? ServicePlanStatus.ACTIVE,
      createdAtUtc: UTCDateTime.now(),
      activatedAtUtc: overrides.activatedAtUtc ?? null,
      archivedAtUtc: overrides.archivedAtUtc ?? null,
    },
    overrides.version ?? 0,
  );
}

/**
 * Creates a newly-created ServicePlan (DRAFT) via the domain factory.
 */
export function makeNewServicePlan(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    name: string;
    description: string;
    price: Money;
    durationDays: number;
    sessionAllotment: number | null;
    type: PlanType;
  }> = {},
): ServicePlan {
  const priceResult = Money.create(9990, 'BRL');

  const result = ServicePlan.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    name: overrides.name ?? 'Monthly Training Plan',
    description: overrides.description ?? 'Complete fitness training plan',
    price: overrides.price ?? (priceResult.value as Money),
    durationDays: overrides.durationDays ?? 30,
    sessionAllotment: 'sessionAllotment' in overrides ? overrides.sessionAllotment! : 12,
    type: overrides.type ?? PlanType.RECURRING,
  });

  if (result.isLeft()) {
    throw new Error(`makeNewServicePlan failed: ${result.value.message}`);
  }

  return result.value;
}
