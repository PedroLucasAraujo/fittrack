import type { IRepository } from '@fittrack/core';
import type { ServicePlan } from '../aggregates/service-plan.js';

export interface IServicePlanRepository extends IRepository<ServicePlan> {
  findByProfessionalProfileId(profileId: string): Promise<ServicePlan[]>;
}
