import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ISessionHistoryQuery } from '../../../domain/services/i-session-history-query.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { InvalidReviewError } from '../../../domain/errors/invalid-review-error.js';

export class InMemorySessionHistoryQuery implements ISessionHistoryQuery {
  /** Override to control how many sessions the stub returns. Default: 10. */
  sessionCount: number = 10;
  /** Set to true to simulate a query failure. */
  shouldFail: boolean = false;

  async countCompletedSessions(
    _clientId: string,
    _professionalProfileId: string,
  ): Promise<DomainResult<SessionCount>> {
    if (this.shouldFail) {
      return left(new InvalidReviewError('session history query failed'));
    }
    return right(SessionCount.create(this.sessionCount).value as SessionCount);
  }

  async hasCompletedSession(
    _clientId: string,
    _professionalProfileId: string,
  ): Promise<DomainResult<boolean>> {
    return right(this.sessionCount > 0);
  }
}
