import type { IUserEngagementRepository } from '../../domain/repositories/IUserEngagementRepository.js';
import type { UserEngagement } from '../../domain/aggregates/UserEngagement.js';

/**
 * Prisma implementation of IUserEngagementRepository.
 *
 * TODO: Implement with Prisma client once schema is migrated.
 * The engagement aggregate contains a `history` array (EngagementHistory[])
 * which should be stored as a JSON column or a related table.
 *
 * @see IUserEngagementRepository for contract details.
 */
export class PrismaUserEngagementRepository implements IUserEngagementRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly prisma: any) {}

  async save(_engagement: UserEngagement): Promise<void> {
    throw new Error('PrismaUserEngagementRepository.save() not implemented');
  }

  async findById(_id: string): Promise<UserEngagement | null> {
    throw new Error('PrismaUserEngagementRepository.findById() not implemented');
  }

  async findByUser(_userId: string): Promise<UserEngagement | null> {
    throw new Error('PrismaUserEngagementRepository.findByUser() not implemented');
  }

  async findAll(): Promise<UserEngagement[]> {
    throw new Error('PrismaUserEngagementRepository.findAll() not implemented');
  }

  async findActiveUsers(_lastActivityDays: number): Promise<string[]> {
    throw new Error('PrismaUserEngagementRepository.findActiveUsers() not implemented');
  }

  async findAtRisk(): Promise<UserEngagement[]> {
    throw new Error('PrismaUserEngagementRepository.findAtRisk() not implemented');
  }
}
