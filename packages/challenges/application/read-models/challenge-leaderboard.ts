import { generateId } from '@fittrack/core';
import { LeaderboardEntry } from './leaderboard-entry.js';
import type { LeaderboardEntryProps } from './leaderboard-entry.js';

/**
 * ChallengeLeaderboard — async projection / read model.
 *
 * This is NOT an aggregate root. It lives in the application layer and is
 * rebuilt from ChallengeProgressUpdated domain events by
 * OnChallengeProgressUpdated event handler. It must never be treated as the
 * source-of-truth for challenge business logic.
 *
 * Ranking is recalculated on every upsert: sort by progress DESC, then by
 * completedAtUtc ASC (earlier completer wins ties), then by lastUpdatedAtUtc ASC.
 * Participants with equal progress share the same rank number.
 */
export interface ChallengeLeaderboardProps {
  challengeId: string;
  entries: LeaderboardEntry[];
  lastUpdatedAtUtc: Date | null;
}

export class ChallengeLeaderboard {
  private readonly _props: ChallengeLeaderboardProps;

  private constructor(
    public readonly id: string,
    props: ChallengeLeaderboardProps,
  ) {
    this._props = props;
  }

  static create(challengeId: string): ChallengeLeaderboard {
    return new ChallengeLeaderboard(generateId(), {
      challengeId,
      entries: [],
      lastUpdatedAtUtc: null,
    });
  }

  static reconstitute(id: string, props: ChallengeLeaderboardProps): ChallengeLeaderboard {
    return new ChallengeLeaderboard(id, props);
  }

  get challengeId(): string {
    return this._props.challengeId;
  }

  /** Returns a defensive copy to prevent external mutation bypassing upsertEntry(). */
  get entries(): LeaderboardEntry[] {
    return [...this._props.entries];
  }

  get lastUpdatedAtUtc(): Date | null {
    return this._props.lastUpdatedAtUtc;
  }

  upsertEntry(entryData: Omit<LeaderboardEntryProps, 'rank'>): void {
    const existingIndex = this._props.entries.findIndex(
      (e) => e.participationId === entryData.participationId,
    );
    const tempEntry = new LeaderboardEntry({ ...entryData, rank: 0 });
    if (existingIndex >= 0) {
      this._props.entries[existingIndex] = tempEntry;
    } else {
      this._props.entries.push(tempEntry);
    }
    this._recalculateRanks();
    this._props.lastUpdatedAtUtc = new Date();
  }

  private _recalculateRanks(): void {
    // Sort by currentProgress DESC, then completedAtUtc ASC (earlier = better), then lastUpdatedAtUtc ASC
    this._props.entries.sort((a, b) => {
      if (b.currentProgress !== a.currentProgress) {
        return b.currentProgress - a.currentProgress;
      }
      if (a.completedAtUtc && b.completedAtUtc) {
        return a.completedAtUtc.getTime() - b.completedAtUtc.getTime();
      }
      if (a.completedAtUtc) return -1;
      if (b.completedAtUtc) return 1;
      return a.lastUpdatedAtUtc.getTime() - b.lastUpdatedAtUtc.getTime();
    });

    let currentRank = 1;
    let previousProgress = -1;
    // ADR-0009 — read model entries are immutable value objects; withRank() returns
    // a new instance rather than mutating the existing entry in place.
    this._props.entries = this._props.entries.map((entry, index) => {
      if (entry.currentProgress !== previousProgress) {
        currentRank = index + 1;
      }
      previousProgress = entry.currentProgress;
      return entry.withRank(currentRank);
    });
  }

  getTopN(n: number): LeaderboardEntry[] {
    return this._props.entries.slice(0, n);
  }
}
