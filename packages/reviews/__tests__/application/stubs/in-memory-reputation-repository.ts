import type { IProfessionalReputationScoreRepository } from '../../../application/projections/i-professional-reputation-score-repository.js';
import type { ProfessionalReputationScore } from '../../../application/projections/professional-reputation-score.js';

export class InMemoryReputationRepository implements IProfessionalReputationScoreRepository {
  items: ProfessionalReputationScore[] = [];

  async save(score: ProfessionalReputationScore): Promise<void> {
    const index = this.items.findIndex(
      (s) => s.professionalProfileId === score.professionalProfileId,
    );
    if (index >= 0) {
      this.items[index] = score;
    } else {
      this.items.push(score);
    }
  }

  async findByProfessional(
    professionalProfileId: string,
  ): Promise<ProfessionalReputationScore | null> {
    return this.items.find((s) => s.professionalProfileId === professionalProfileId) ?? null;
  }

  async findAll(): Promise<ProfessionalReputationScore[]> {
    return [...this.items];
  }
}
