import type { IRepository } from '@fittrack/core';
import type { Transaction } from '../aggregates/transaction.js';

export interface ITransactionRepository extends IRepository<Transaction> {
  findByGatewayTransactionId(gatewayId: string): Promise<Transaction | null>;
}
