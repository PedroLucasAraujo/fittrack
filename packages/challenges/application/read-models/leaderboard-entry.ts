export interface LeaderboardEntryProps {
  participationId: string;
  userId: string;
  currentProgress: number;
  progressPercentage: number;
  rank: number;
  completedAtUtc: Date | null;
  lastUpdatedAtUtc: Date;
}

export class LeaderboardEntry {
  private readonly _props: LeaderboardEntryProps;

  constructor(props: LeaderboardEntryProps) {
    this._props = { ...props };
  }

  /**
   * Returns a new LeaderboardEntry with the updated rank, leaving all other
   * fields unchanged. Used by ChallengeLeaderboard._recalculateRanks() to
   * assign positions immutably without casting away readonly.
   *
   * @see ADR-0009 — pure state: mutations produce new instances
   */
  withRank(rank: number): LeaderboardEntry {
    return new LeaderboardEntry({ ...this._props, rank });
  }

  get participationId(): string {
    return this._props.participationId;
  }

  get userId(): string {
    return this._props.userId;
  }

  get currentProgress(): number {
    return this._props.currentProgress;
  }

  get progressPercentage(): number {
    return this._props.progressPercentage;
  }

  get rank(): number {
    return this._props.rank;
  }

  get completedAtUtc(): Date | null {
    return this._props.completedAtUtc;
  }

  get lastUpdatedAtUtc(): Date {
    return this._props.lastUpdatedAtUtc;
  }
}
