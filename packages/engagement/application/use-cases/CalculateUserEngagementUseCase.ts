import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { UserEngagement } from '../../domain/aggregates/UserEngagement.js';
import { EngagementScore } from '../../domain/value-objects/EngagementScore.js';
import { DaysInactive } from '../../domain/value-objects/DaysInactive.js';
import { InvalidEngagementError } from '../../domain/errors/InvalidEngagementError.js';
import { EngagementScoreCalculatedEvent } from '../../domain/events/EngagementScoreCalculatedEvent.js';
import { UserDisengagedEvent } from '../../domain/events/UserDisengagedEvent.js';
import { EngagementImprovedEvent } from '../../domain/events/EngagementImprovedEvent.js';
import type { IUserEngagementRepository } from '../../domain/repositories/IUserEngagementRepository.js';
import type { IEngagementDataQueryService } from '../../domain/services/IEngagementDataQueryService.js';
import type { IEngagementEventPublisher } from '../ports/IEngagementEventPublisher.js';
import type {
  CalculateUserEngagementInputDTO,
  CalculateUserEngagementOutputDTO,
} from '../dtos/CalculateUserEngagementDTO.js';

/** Default workout target per week (configurable post-MVP). */
const TARGET_WORKOUTS_PER_WEEK = 4;

/** Default streak target in days (configurable post-MVP). */
const TARGET_STREAK_DAYS = 30;

/**
 * Calculates or recalculates all engagement scores for a user (ADR-0058).
 *
 * ## Flow
 * 1. Load or create UserEngagement aggregate.
 * 2. Define the 7-day calculation window (UTC).
 * 3. Query all activity data via IEngagementDataQueryService (ACL — ADR-0005).
 * 4. Calculate individual score VOs using static factory methods.
 * 5. Call aggregate.updateScores() — pure state mutation, returns outcome.
 * 6. Append a weekly history snapshot.
 * 7. Persist.
 * 8. Publish domain events based on outcome flags (ADR-0047 §4).
 *
 * ## Event dispatching (ADR-0047)
 * This UseCase is the SOLE dispatcher of Engagement domain events.
 * The aggregate returns an `UpdateScoresOutcome`; this class constructs
 * and publishes events accordingly.
 */
export class CalculateUserEngagementUseCase {
  constructor(
    private readonly engagementRepo: IUserEngagementRepository,
    private readonly dataQueryService: IEngagementDataQueryService,
    private readonly eventPublisher: IEngagementEventPublisher,
  ) {}

  async execute(
    dto: CalculateUserEngagementInputDTO,
  ): Promise<DomainResult<CalculateUserEngagementOutputDTO>> {
    // 1. Validate input
    if (!dto.userId || dto.userId.trim().length === 0) {
      return left(new InvalidEngagementError('userId is required'));
    }
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidEngagementError('professionalProfileId is required'));
    }

    // 2. Load or create aggregate
    let engagement = await this.engagementRepo.findByUser(dto.userId);
    if (!engagement) {
      const createResult = UserEngagement.create({
        userId: dto.userId,
        professionalProfileId: dto.professionalProfileId,
      });
      /* v8 ignore next */
      if (createResult.isLeft()) return createResult;
      engagement = createResult.value;
    }

    // 3. Define 7-day window (UTC)
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setUTCHours(23, 59, 59, 999);
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 7);
    windowStart.setUTCHours(0, 0, 0, 0);

    const startDate = windowStart.toISOString();
    const endDate = windowEnd.toISOString();
    const calculatedAtUtc = now.toISOString();

    // 4. Query all activity data via ACL
    const [
      workoutsResult,
      daysWithLogResult,
      nutritionLogsResult,
      bookingsResult,
      streakResult,
      activeGoalsResult,
      goalsOnTrackResult,
      lastActivityResult,
      daysInactiveResult,
    ] = await Promise.all([
      this.dataQueryService.getWorkoutsInWindow(dto.userId, startDate, endDate),
      this.dataQueryService.getDaysWithNutritionLog(dto.userId, 7),
      this.dataQueryService.getNutritionLogsInWindow(dto.userId, startDate, endDate),
      this.dataQueryService.getBookingsAttendedInWindow(dto.userId, startDate, endDate),
      this.dataQueryService.getCurrentStreak(dto.userId),
      this.dataQueryService.getActiveGoalsCount(dto.userId),
      this.dataQueryService.getGoalsOnTrackCount(dto.userId),
      this.dataQueryService.getLastActivityDate(dto.userId),
      this.dataQueryService.getDaysInactive(dto.userId),
    ]);

    if (workoutsResult.isLeft()) return left(workoutsResult.value);
    if (daysWithLogResult.isLeft()) return left(daysWithLogResult.value);
    if (nutritionLogsResult.isLeft()) return left(nutritionLogsResult.value);
    if (bookingsResult.isLeft()) return left(bookingsResult.value);
    if (streakResult.isLeft()) return left(streakResult.value);
    if (activeGoalsResult.isLeft()) return left(activeGoalsResult.value);
    if (goalsOnTrackResult.isLeft()) return left(goalsOnTrackResult.value);
    if (lastActivityResult.isLeft()) return left(lastActivityResult.value);
    if (daysInactiveResult.isLeft()) return left(daysInactiveResult.value);

    const workoutsCompleted = workoutsResult.value;
    const daysWithNutritionLog = daysWithLogResult.value;
    const nutritionLogsCreated = nutritionLogsResult.value;
    const bookingsAttended = bookingsResult.value;
    const currentStreak = streakResult.value;
    const activeGoalsCount = activeGoalsResult.value;
    const goalsOnTrackCount = goalsOnTrackResult.value;
    const lastActivityDate = lastActivityResult.value;
    const daysInactiveRaw = daysInactiveResult.value;

    // 5. Calculate score VOs
    const workoutScore = EngagementScore.fromWorkouts(workoutsCompleted, TARGET_WORKOUTS_PER_WEEK);
    const habitScore = EngagementScore.fromHabit(daysWithNutritionLog);
    const goalProgressScore = EngagementScore.fromGoalProgress(goalsOnTrackCount, activeGoalsCount);
    const streakScore = EngagementScore.fromStreak(currentStreak, TARGET_STREAK_DAYS);

    const daysInactiveResult2 = DaysInactive.create(daysInactiveRaw);
    /* v8 ignore next */
    if (daysInactiveResult2.isLeft()) return left(daysInactiveResult2.value);
    const daysInactive = daysInactiveResult2.value;

    // 6. Retrieve previous week score (last history entry)
    const history = engagement.history;
    const previousWeekScore = history.length > 0 ? history[history.length - 1].overallScore : null;

    // 7. Update scores — aggregate performs pure state mutation
    const updateResult = engagement.updateScores({
      workoutScore,
      habitScore,
      goalProgressScore,
      streakScore,
      workoutsCompleted,
      nutritionLogsCreated,
      bookingsAttended,
      currentStreak,
      activeGoalsCount,
      goalsOnTrackCount,
      windowStartDate: windowStart.toISOString().slice(0, 10),
      windowEndDate: windowEnd.toISOString().slice(0, 10),
      calculatedAtUtc,
      daysInactive,
      lastActivityDate: lastActivityDate ? lastActivityDate.slice(0, 10) : null,
      previousWeekScore,
    });

    /* v8 ignore next */
    if (updateResult.isLeft()) return left(updateResult.value);
    const outcome = updateResult.value;

    // 8. Add history snapshot
    const historyResult = engagement.addHistorySnapshot();
    /* v8 ignore next */
    if (historyResult.isLeft()) return left(historyResult.value);

    // 9. Persist
    await this.engagementRepo.save(engagement);

    // 10. Publish EngagementScoreCalculatedEvent (always)
    await this.eventPublisher.publishEngagementScoreCalculated(
      new EngagementScoreCalculatedEvent(engagement.id, engagement.professionalProfileId, {
        userId: engagement.userId,
        overallScore: outcome.overallScore,
        engagementLevel: outcome.engagementLevel,
        trend: outcome.trend,
        trendPercentage: outcome.trendPercentage,
        workoutScore: workoutScore.value,
        habitScore: habitScore.value,
        goalProgressScore: goalProgressScore.value,
        streakScore: streakScore.value,
        workoutsCompleted,
        nutritionLogsCreated,
        bookingsAttended,
        currentStreak,
        activeGoalsCount,
        goalsOnTrackCount,
        windowStartDate: engagement.windowStartDate,
        windowEndDate: engagement.windowEndDate,
        calculatedAtUtc,
        isAtRisk: engagement.isAtRisk,
      }),
    );

    // 11. Publish UserDisengagedEvent if churn risk detected
    if (outcome.churnRiskDetected) {
      await this.eventPublisher.publishUserDisengaged(
        new UserDisengagedEvent(engagement.id, engagement.professionalProfileId, {
          userId: engagement.userId,
          engagementLevel: outcome.engagementLevel,
          overallScore: outcome.overallScore,
          daysInactive: outcome.daysInactive,
          lastActivityDate: outcome.lastActivityDate,
          detectedAtUtc: calculatedAtUtc,
        }),
      );
    }

    // 12. Publish EngagementImprovedEvent if significant improvement
    if (outcome.engagementImproved && outcome.previousScore !== null && outcome.improvementPercentage !== null) {
      await this.eventPublisher.publishEngagementImproved(
        new EngagementImprovedEvent(engagement.id, engagement.professionalProfileId, {
          userId: engagement.userId,
          previousScore: outcome.previousScore,
          currentScore: outcome.overallScore,
          improvementPercentage: outcome.improvementPercentage,
          detectedAtUtc: calculatedAtUtc,
        }),
      );
    }

    return right({
      engagementId: engagement.id,
      userId: engagement.userId,
      overallScore: outcome.overallScore,
      engagementLevel: outcome.engagementLevel,
      trend: outcome.trend,
      trendPercentage: outcome.trendPercentage,
      isAtRisk: engagement.isAtRisk,
      calculatedAtUtc,
    });
  }
}
