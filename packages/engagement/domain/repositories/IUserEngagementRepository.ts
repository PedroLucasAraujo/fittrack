import type { UserEngagement } from '../aggregates/UserEngagement.js';

/**
 * Repository interface for UserEngagement aggregate roots (ADR-0047).
 *
 * Defined in domain layer; implemented in infrastructure layer.
 * All methods return plain values or throw on infrastructure failure
 * (infrastructure errors are mapped to DomainErrors by the implementation).
 *
 * ## Tenant isolation (ADR-0025)
 * `findByUser` is sufficient for single-user access because each user
 * belongs to exactly one professionalProfileId (1:1 with userId).
 */
export interface IUserEngagementRepository {
  /** Persists a new or updated UserEngagement aggregate. */
  save(engagement: UserEngagement): Promise<void>;

  /** Finds by engagement aggregate ID. Returns null if not found. */
  findById(id: string): Promise<UserEngagement | null>;

  /**
   * Finds the single UserEngagement for a given user.
   * Returns null if no engagement record exists yet.
   */
  findByUser(userId: string): Promise<UserEngagement | null>;

  /** Returns all engagement aggregates (for admin/platform queries). */
  findAll(): Promise<UserEngagement[]>;

  /**
   * Returns user IDs that had any recorded activity within the last
   * `lastActivityDays` days. Used by the daily batch job to scope
   * recalculation only to active users (performance optimization).
   *
   * This is a SYSTEM-scope query spanning tenants — documented per ADR-0054.
   */
  findActiveUsers(lastActivityDays: number): Promise<string[]>;

  /**
   * Returns all engagements currently flagged as churn risk (isAtRisk=true).
   * Used for operational dashboards and notification triggers.
   */
  findAtRisk(): Promise<UserEngagement[]>;
}
