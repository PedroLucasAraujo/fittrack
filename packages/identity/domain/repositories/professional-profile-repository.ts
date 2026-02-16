import type { IRepository } from '@fittrack/core';
import type { ProfessionalProfile } from '../aggregates/professional-profile.js';

/**
 * Repository interface for the ProfessionalProfile aggregate root (ADR-0004).
 *
 * Implementations live in the infrastructure layer and use Prisma.
 * The domain layer only depends on this interface.
 */
export interface IProfessionalProfileRepository
  extends IRepository<ProfessionalProfile> {
  findByUserId(userId: string): Promise<ProfessionalProfile | null>;
}
