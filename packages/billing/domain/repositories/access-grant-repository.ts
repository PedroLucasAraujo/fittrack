import type { IRepository } from '@fittrack/core';
import type { AccessGrant } from '../aggregates/access-grant.js';

export interface IAccessGrantRepository extends IRepository<AccessGrant> {
  findByTransactionId(transactionId: string): Promise<AccessGrant | null>;
}
