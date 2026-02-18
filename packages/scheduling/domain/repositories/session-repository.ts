import type { IRepository } from '@fittrack/core';
import type { Session } from '../aggregates/session.js';

/**
 * Repository interface for the Session aggregate root (ADR-0004).
 *
 * All queries include `professionalProfileId` for tenant isolation (ADR-0025).
 */
export interface ISessionRepository extends IRepository<Session> {
  findByProfessionalProfileId(professionalProfileId: string): Promise<Session[]>;
}
