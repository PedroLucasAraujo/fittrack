import type { ProfessionalProfile } from '@fittrack/identity';
import type { IProfessionalRiskRepository } from '../../application/ports/professional-risk-repository-port.js';

export class InMemoryProfessionalRiskRepository implements IProfessionalRiskRepository {
  items: ProfessionalProfile[] = [];
  saveCount = 0;

  async findById(profileId: string): Promise<ProfessionalProfile | null> {
    return this.items.find((p) => p.id === profileId) ?? null;
  }

  async save(profile: ProfessionalProfile): Promise<void> {
    this.saveCount++;
    const index = this.items.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      this.items[index] = profile;
    } else {
      this.items.push(profile);
    }
  }
}
