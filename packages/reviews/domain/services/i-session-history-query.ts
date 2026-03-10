import type { DomainResult } from '@fittrack/core';
import type { SessionCount } from '../value-objects/session-count.js';

/**
 * Anti-corruption layer: query interface for completed session history
 * between a client and a professional (ADR-0005, ADR-0068 §3).
 *
 * Reviews MUST NOT import from @fittrack/scheduling or @fittrack/execution.
 * This interface defines the boundary — implementation wires up the real
 * query in the infrastructure layer without polluting the domain.
 *
 * "Session" is defined as any completed interaction: booking completion,
 * workout execution confirmation, or equivalent.
 */
export interface ISessionHistoryQuery {
  /**
   * Counts all completed sessions between the given client and professional.
   * Returns Left<DomainError> if the query fails.
   */
  countCompletedSessions(
    clientId: string,
    professionalProfileId: string,
  ): Promise<DomainResult<SessionCount>>;

  /**
   * Returns true if the client has had at least one completed session
   * with the professional.
   */
  hasCompletedSession(
    clientId: string,
    professionalProfileId: string,
  ): Promise<DomainResult<boolean>>;
}
