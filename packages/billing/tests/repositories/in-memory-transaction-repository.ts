import type { UniqueEntityId } from '@fittrack/core';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { Transaction } from '../../domain/aggregates/transaction.js';

export class InMemoryTransactionRepository implements ITransactionRepository {
  items: Transaction[] = [];

  async findById(id: UniqueEntityId): Promise<Transaction | null> {
    return this.items.find((t) => t.id === id.value) ?? null;
  }

  async findByGatewayTransactionId(gatewayId: string): Promise<Transaction | null> {
    return this.items.find((t) => t.gatewayTransactionId === gatewayId) ?? null;
  }

  async save(entity: Transaction): Promise<void> {
    const index = this.items.findIndex((t) => t.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
