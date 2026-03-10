import type { Challenge } from '../aggregates/challenge.js';

export interface ActiveChallengeFilters {
  visibility?: string;
  type?: string;
}

/**
 * Repository contract for the Challenge aggregate.
 *
 * All query methods that return multiple challenges support optional filters
 * so that filtering is pushed to the data layer rather than done in-memory
 * in the application layer.
 */
export interface IChallengeRepository {
  save(challenge: Challenge): Promise<void>;
  findById(id: string): Promise<Challenge | null>;
  /**
   * Returns all active challenges (startedAtUtc set, not ended, not canceled,
   * endDateUtc in the future). Optional filters are applied at the data layer.
   */
  findActive(filters?: ActiveChallengeFilters): Promise<Challenge[]>;
  findByCreator(creatorId: string): Promise<Challenge[]>;
  /**
   * Returns challenges whose endDateUtc has passed, regardless of whether
   * they have been formally ended (endedAtUtc may be null).
   */
  findEnded(): Promise<Challenge[]>;
  findPublic(): Promise<Challenge[]>;
}
