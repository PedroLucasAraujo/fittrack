import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ActivityDay } from '../../domain/value-objects/activity-day.js';
import { StreakTracker } from '../../domain/aggregates/streak-tracker.js';
import { InvalidUserIdError } from '../../domain/errors/invalid-user-id-error.js';
import { InvalidActivityDayError } from '../../domain/errors/invalid-activity-day-error.js';
import { ActivityDayTooOldError } from '../../domain/errors/activity-day-too-old-error.js';
import { StreakIncrementedEvent } from '../../domain/events/streak-incremented-event.js';
import { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import { FreezeTokenEarnedEvent } from '../../domain/events/freeze-token-earned-event.js';
import type { IStreakTrackerRepository } from '../../domain/repositories/i-streak-tracker-repository.js';
import type { IGamificationEventPublisher } from '../ports/i-gamification-event-publisher.js';
import type {
  UpdateStreakTrackerInputDTO,
  UpdateStreakTrackerOutputDTO,
} from '../dtos/update-streak-tracker-dto.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Maximum retroactive correction window in calendar days (ADR-0066 §4). */
const MAX_RETROACTIVE_DAYS = 2;

/**
 * Records a confirmed Execution activity day against a user's StreakTracker.
 *
 * ## Called by
 *
 * `OnExecutionRecorded` event handler, which subscribes to `ExecutionRecordedEvent`
 * published by the Execution bounded context.
 *
 * ## Idempotency
 *
 * Multiple executions on the same `activityDay` produce exactly one streak
 * increment. Re-delivery of the same event returns `wasNoop = true`.
 *
 * ## Anti-fraud validations (ADR-0066 §4)
 *
 * - `activityDay` cannot be in the future.
 * - `activityDay` cannot be more than 2 days in the past (retroactive window).
 * - Only CONFIRMED Executions count — the event handler filters on status.
 *
 * ## Event dispatch (ADR-0009 §4)
 *
 * Events are published AFTER `repository.save()`.
 */
export class UpdateStreakTracker {
  constructor(
    private readonly repo: IStreakTrackerRepository,
    private readonly publisher: IGamificationEventPublisher,
  ) {}

  async execute(
    dto: UpdateStreakTrackerInputDTO,
  ): Promise<DomainResult<UpdateStreakTrackerOutputDTO>> {
    // 1. Validate userId
    if (!UUID_V4_REGEX.test(dto.userId)) {
      return left(new InvalidUserIdError());
    }

    // 2. Parse and validate activityDay
    const activityDayResult = ActivityDay.fromString(dto.activityDay);
    if (activityDayResult.isLeft()) return left(activityDayResult.value);
    const activityDay = activityDayResult.value;

    const today = ActivityDay.today();

    // 3. Reject dates more than 1 calendar day ahead of UTC today.
    //    1-day buffer accommodates logicalDay values from UTC+ timezones (ADR-0010 §2).
    const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (activityDay.value > tomorrowStr) {
      return left(
        new InvalidActivityDayError(
          `Activity day "${dto.activityDay}" is too far in the future. Only current or recent days are valid.`,
        ),
      );
    }

    // 4. Reject dates older than MAX_RETROACTIVE_DAYS in the past
    if (activityDay.daysBetween(today) > MAX_RETROACTIVE_DAYS) {
      return left(new ActivityDayTooOldError());
    }

    // 5. Load or create StreakTracker
    let tracker = await this.repo.findByUserId(dto.userId);
    if (tracker === null) {
      const now = UTCDateTime.now();
      const createResult = StreakTracker.create({
        userId: dto.userId,
        createdAtUtc: now,
        updatedAtUtc: now,
      });
      /* c8 ignore next — create() only fails if userId is empty; guarded by UUID check above */
      if (createResult.isLeft()) return left(createResult.value);
      tracker = createResult.value;
    }

    // 6. Capture state before mutation for event construction
    const prevLongestStreak = tracker.longestStreak;

    // 7. Apply domain transition
    const outcomeResult = tracker.recordActivity(activityDay);
    /* c8 ignore next — recordActivity only fails on VO invariants already checked above */
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    if (outcome.type === 'noop') {
      return right({
        currentStreak: tracker.currentStreak,
        longestStreak: tracker.longestStreak,
        wasNoop: true,
      });
    }

    // 8. Persist (ADR-0003 — one aggregate per transaction)
    await this.repo.save(tracker);

    // 9. Publish events post-commit (ADR-0009 §4)
    const trackerId = tracker.id;
    const userId = tracker.userId;

    // Implicit break: gap was detected, old streak was lost
    if (outcome.type === 'restarted') {
      await this.publisher.publishStreakBroken(
        new StreakBrokenEvent(trackerId, userId, {
          userId,
          previousStreak: outcome.previousStreak,
          lastActivityDay: null,
        }),
      );
    }

    // Streak was incremented (started / incremented / restarted → now at 1+)
    await this.publisher.publishStreakIncremented(
      new StreakIncrementedEvent(trackerId, userId, {
        userId,
        currentStreak: tracker.currentStreak,
        longestStreak: tracker.longestStreak,
        activityDay: dto.activityDay,
      }),
    );

    // Freeze token earned at milestone
    if (outcome.type === 'incremented' && outcome.earnedFreezeToken) {
      await this.publisher.publishFreezeTokenEarned(
        new FreezeTokenEarnedEvent(trackerId, userId, {
          userId,
          currentStreak: tracker.currentStreak,
          freezeTokenCount: tracker.freezeTokenCount,
        }),
      );
    }

    // Note: NewLongestStreak is intentionally NOT emitted here.
    // Achievements consume StreakMetricComputedEvent from the Metrics context
    // (ADR-0066 §5 — no breaking changes to achievements flow).
    // prevLongestStreak retained for post-MVP NewLongestStreakEvent.
    /* c8 ignore next */
    void prevLongestStreak;

    return right({
      currentStreak: tracker.currentStreak,
      longestStreak: tracker.longestStreak,
      wasNoop: false,
    });
  }
}
