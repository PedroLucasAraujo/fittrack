import type { UniqueEntityId } from '@fittrack/core';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
import type { AccessGrant } from '../../domain/aggregates/access-grant.js';
import { AccessGrantStatus } from '../../domain/enums/access-grant-status.js';

export class InMemoryAccessGrantRepository implements IAccessGrantRepository {
  items: AccessGrant[] = [];

  async findById(id: UniqueEntityId): Promise<AccessGrant | null> {
    return this.items.find((g) => g.id === id.value) ?? null;
  }

  async findByTransactionId(transactionId: string): Promise<AccessGrant | null> {
    return this.items.find((g) => g.transactionId === transactionId) ?? null;
  }

  async findActiveByClientAndProfessionalAndPlan(
    clientId: string,
    professionalProfileId: string,
    servicePlanId: string,
  ): Promise<AccessGrant | null> {
    return (
      this.items.find(
        (g) =>
          g.clientId === clientId &&
          g.professionalProfileId === professionalProfileId &&
          g.servicePlanId === servicePlanId &&
          g.status === AccessGrantStatus.ACTIVE,
      ) ?? null
    );
  }

  async save(entity: AccessGrant): Promise<void> {
    const index = this.items.findIndex((g) => g.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
