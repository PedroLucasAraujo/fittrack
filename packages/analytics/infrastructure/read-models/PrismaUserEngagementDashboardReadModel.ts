import type {
  IUserEngagementDashboardReadModel,
  UserEngagementDashboardDTO,
  UpsertUserEngagementDashboardInput,
  MarkAtRiskInput,
} from '../../application/read-models/IUserEngagementDashboardReadModel.js';

/**
 * Prisma implementation of the user engagement dashboard read model.
 *
 * TODO: Inject PrismaClient and implement queries against user_engagement_dashboard table.
 */
export class PrismaUserEngagementDashboardReadModel
  implements IUserEngagementDashboardReadModel
{
  findByUserId(_userId: string): Promise<UserEngagementDashboardDTO | null> {
    throw new Error('PrismaUserEngagementDashboardReadModel.findByUserId not implemented');
  }

  upsert(_input: UpsertUserEngagementDashboardInput): Promise<void> {
    throw new Error('PrismaUserEngagementDashboardReadModel.upsert not implemented');
  }

  markAtRisk(_input: MarkAtRiskInput): Promise<void> {
    throw new Error('PrismaUserEngagementDashboardReadModel.markAtRisk not implemented');
  }
}
