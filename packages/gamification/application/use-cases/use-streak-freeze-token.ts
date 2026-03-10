import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { StreakTrackerNotFoundError } from '../../domain/errors/streak-tracker-not-found-error.js';
import { InvalidUserIdError } from '../../domain/errors/invalid-user-id-error.js';
import { FreezeTokenUsedEvent } from '../../domain/events/freeze-token-used-event.js';
import type { IStreakTrackerRepository } from '../../domain/repositories/i-streak-tracker-repository.js';
import type { IGamificationEventPublisher } from '../ports/i-gamification-event-publisher.js';
import type {
  UseStreakFreezeTokenInputDTO,
  UseStreakFreezeTokenOutputDTO,
} from '../dtos/use-streak-freeze-token-dto.js';

/** UUIDv4 regex. */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Manually spends one freeze token to preserve an at-risk streak.
 *
 * ## Anti-frustration principle (ADR-0066 §3)
 *
 * The system NEVER automatically consumes freeze tokens. Users must actively
 * choose to spend a token. This preserves user agency and prevents frustration
 * from silent token consumption.
 *
 * ## Preconditions
 *
 * - User must have ≥ 1 freeze token (checked by domain).
 * - Streak must be `isAtRisk()` — lastActivityDay < yesterday (checked by domain).
 *   If not at risk, the token would be wasted; the domain rejects the call.
 */
export class UseStreakFreezeToken {
  constructor(
    private readonly repo: IStreakTrackerRepository,
    private readonly publisher: IGamificationEventPublisher,
  ) {}

  async execute(
    dto: UseStreakFreezeTokenInputDTO,
  ): Promise<DomainResult<UseStreakFreezeTokenOutputDTO>> {
    // 1. Validate userId
    if (!UUID_V4_REGEX.test(dto.userId)) {
      return left(new InvalidUserIdError());
    }

    // 2. Load tracker
    const tracker = await this.repo.findByUserId(dto.userId);
    if (tracker === null) {
      return left(new StreakTrackerNotFoundError());
    }

    // 3. Today string for isAtRisk check
    const todayStr = new Date().toISOString().slice(0, 10);

    // 4. Apply domain transition (validates hasTokens + isAtRisk internally)
    const result = tracker.useFreezeToken(todayStr);
    if (result.isLeft()) return left(result.value);

    // 5. Persist
    await this.repo.save(tracker);

    // 6. Publish event post-commit (ADR-0009 §4)
    await this.publisher.publishFreezeTokenUsed(
      new FreezeTokenUsedEvent(tracker.id, tracker.userId, {
        userId: tracker.userId,
        currentStreak: tracker.currentStreak,
        freezeTokenCount: tracker.freezeTokenCount,
      }),
    );

    return right({
      currentStreak: tracker.currentStreak,
      freezeTokensRemaining: tracker.freezeTokenCount,
    });
  }
}
