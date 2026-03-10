import type { ProfessionalReputationScore } from './professional-reputation-score.js';

/**
 * Repository interface for the ProfessionalReputationScore read model.
 * Interface lives in the application layer (it's a projection concern,
 * not a domain concern). Implementation lives in infrastructure.
 */
export interface IProfessionalReputationScoreRepository {
  save(score: ProfessionalReputationScore): Promise<void>;

  findByProfessional(professionalProfileId: string): Promise<ProfessionalReputationScore | null>;

  findAll(): Promise<ProfessionalReputationScore[]>;
}
