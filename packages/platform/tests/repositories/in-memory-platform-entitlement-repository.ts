import type { IPlatformEntitlementRepository } from '../../domain/repositories/platform-entitlement-repository.js';
import type { PlatformEntitlement } from '../../domain/aggregates/platform-entitlement.js';

export class InMemoryPlatformEntitlementRepository implements IPlatformEntitlementRepository {
  items: PlatformEntitlement[] = [];
  saveCount = 0;

  async findById(id: string, professionalProfileId: string): Promise<PlatformEntitlement | null> {
    return (
      this.items.find((e) => e.id === id && e.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findByProfessionalProfileId(
    professionalProfileId: string,
  ): Promise<PlatformEntitlement | null> {
    return this.items.find((e) => e.professionalProfileId === professionalProfileId) ?? null;
  }

  async save(entitlement: PlatformEntitlement): Promise<void> {
    this.saveCount++;
    const index = this.items.findIndex((e) => e.id === entitlement.id);
    if (index >= 0) {
      this.items[index] = entitlement;
    } else {
      this.items.push(entitlement);
    }
  }
}
