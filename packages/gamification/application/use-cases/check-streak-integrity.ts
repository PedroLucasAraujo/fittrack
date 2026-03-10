import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { StreakIntegrityViolationEvent } from '../../domain/events/streak-integrity-violation-event.js';
import type { IStreakTrackerRepository } from '../../domain/repositories/i-streak-tracker-repository.js';
import type { IGamificationEventPublisher } from '../ports/i-gamification-event-publisher.js';
import type { IGamificationExecutionQueryService } from '../ports/i-gamification-execution-query-service.js';

/** Rolling window in days to query execution history for audit. */
const AUDIT_WINDOW_DAYS = 90;

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

/** Batch size for processing active trackers. */
const BATCH_SIZE = 1000;

export interface CheckStreakIntegrityOutputDTO {
  /** Total active trackers inspected. */
  processed: number;
  /** Trackers where stored streak matched recomputed streak. */
  clean: number;
  /** Trackers where a discrepancy was detected (violation events emitted). */
  violations: number;
}

/**
 * Anti-fraud audit use case — compares each active StreakTracker against the
 * execution history recomputed from the Execution bounded context.
 *
 * ## What it detects (ADR-0066 §4 anti-fraud)
 *
 * - Streak inflation: tracker.currentStreak > recomputed streak (exploit).
 * - Orphaned trackers: tracker has streak but no supporting execution history.
 * - Event processing bugs: discrepancy caused by missed events (not fraud).
 *
 * ## What it does NOT do
 *
 * - Does NOT modify any StreakTracker state.
 * - Does NOT auto-spend freeze tokens.
 * - Does NOT break streaks.
 *
 * This is an audit-only use case. The operations team reviews
 * `StreakIntegrityViolationEvent` entries to determine corrective action.
 *
 * ## Schedule (ADR-0066)
 *
 * Runs weekly (or randomly sampled) to keep computational cost low.
 * The daily streak-break responsibility belongs to `UpdateStreakTrackerUseCase`
 * (via the `restarted` outcome on gap detection).
 */
export class CheckStreakIntegrity {
  constructor(
    private readonly repo: IStreakTrackerRepository,
    private readonly executionQueryService: IGamificationExecutionQueryService,
    private readonly publisher: IGamificationEventPublisher,
  ) {}

  async execute(): Promise<DomainResult<CheckStreakIntegrityOutputDTO>> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const windowStartMs = now.getTime() - AUDIT_WINDOW_DAYS * ONE_DAY_MS;
    const windowStartStr = new Date(windowStartMs).toISOString().slice(0, 10);

    // 1. Load all active trackers (currentStreak > 0 only)
    const activeTrackers = await this.repo.findAllActive();

    let processed = 0;
    let clean = 0;
    let violations = 0;

    // 2. Process in batches
    for (let offset = 0; offset < activeTrackers.length; offset += BATCH_SIZE) {
      const batch = activeTrackers.slice(offset, offset + BATCH_SIZE);

      await Promise.all(
        batch.map(async (tracker) => {
          processed++;

          // 3. Recompute expected streak from execution history
          const activityDays = await this.executionQueryService.getActivityDaysForUser(
            tracker.userId,
            windowStartStr,
            todayStr,
          );

          const expectedStreak = recomputeCurrentStreak(activityDays, todayStr);

          // 4. Compare
          const discrepancy = Math.abs(tracker.currentStreak - expectedStreak);

          if (discrepancy === 0) {
            clean++;
            return;
          }

          violations++;

          // 5. Emit violation event (audit only — no state mutation)
          await this.publisher.publishStreakIntegrityViolation(
            new StreakIntegrityViolationEvent(tracker.id, tracker.userId, {
              userId: tracker.userId,
              trackerStreak: tracker.currentStreak,
              expectedStreak,
              discrepancy,
            }),
          );
        }),
      );
    }

    return right({ processed, clean, violations });
  }
}

// ── Streak recomputation (mirrors ComputeStreakMetric algorithm — ADR-0054 §4) ──

/**
 * Recomputes currentStreak from a list of activity day strings.
 * Counts backwards from yesterday until the consecutive chain breaks.
 */
function recomputeCurrentStreak(activityDays: string[], todayStr: string): number {
  if (activityDays.length === 0) return 0;

  const unique = [...new Set(activityDays)];
  unique.sort();

  const yesterdayMs = new Date(`${todayStr}T00:00:00Z`).getTime() - ONE_DAY_MS;
  const yesterdayStr = new Date(yesterdayMs).toISOString().slice(0, 10);

  let streak = 0;
  let cursor = new Date(`${yesterdayStr}T00:00:00Z`);

  for (let i = unique.length - 1; i >= 0; i--) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dateStr = unique[i]!;
    const cursorStr = cursor.toISOString().slice(0, 10);

    if (dateStr === cursorStr) {
      streak++;
      cursor = new Date(cursor.getTime() - ONE_DAY_MS);
      /* c8 ignore next 3 — defensive: sorted unique array never skips cursor forward */
    } else if (dateStr < cursorStr) {
      break;
    }
  }

  return streak;
}
