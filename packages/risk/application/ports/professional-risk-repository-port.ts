import type { ProfessionalProfile } from '@fittrack/identity';

/**
 * Cross-context repository port used exclusively by the Risk bounded context.
 *
 * Loads and saves `ProfessionalProfile` aggregates (owned by the Identity
 * context) to enforce RiskStatus transitions (ADR-0022). The infrastructure
 * adapter delegates to the same database schema as the Identity context's
 * repository, but is registered separately to maintain bounded-context
 * isolation (ADR-0001 §4, ADR-0047 §7).
 *
 * Repository-per-aggregate rule (ADR-0047 §7): this interface operates on
 * `ProfessionalProfile` only. No other aggregate is loaded or saved here.
 */
export interface IProfessionalRiskRepository {
  findById(profileId: string): Promise<ProfessionalProfile | null>;
  save(profile: ProfessionalProfile): Promise<void>;
}
