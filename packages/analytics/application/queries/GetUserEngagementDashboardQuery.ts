import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import type {
  IUserEngagementDashboardReadModel,
  UserEngagementDashboardDTO,
} from '../read-models/IUserEngagementDashboardReadModel.js';

class UserEngagementDashboardNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      `Engagement dashboard not yet available for user ${userId}`,
      'ANALYTICS.DASHBOARD_NOT_FOUND' as unknown as ErrorCode,
      { userId },
    );
  }
}

export interface GetUserEngagementDashboardInput {
  userId: string;
}

/**
 * Query handler that returns the user engagement dashboard.
 *
 * Reads from the denormalized `user_engagement_dashboard` table.
 * Returns Left if no engagement data has been calculated yet.
 */
export class GetUserEngagementDashboardQuery {
  constructor(
    private readonly readModel: IUserEngagementDashboardReadModel,
  ) {}

  async execute(
    input: GetUserEngagementDashboardInput,
  ): Promise<DomainResult<UserEngagementDashboardDTO>> {
    const row = await this.readModel.findByUserId(input.userId);
    if (!row) {
      return left(new UserEngagementDashboardNotFoundError(input.userId));
    }
    return right(row);
  }
}
