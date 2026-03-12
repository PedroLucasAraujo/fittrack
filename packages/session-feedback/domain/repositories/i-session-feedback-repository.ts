import type { SessionFeedback } from '../aggregates/session-feedback.js';

/**
 * Repository contract for the SessionFeedback aggregate (ADR-0025).
 *
 * Defined in the domain layer; implemented in the infrastructure layer.
 * All queries include professionalProfileId for tenant isolation (ADR-0025).
 *
 * Queries that accept `includeHidden` default to false — hidden feedbacks
 * are excluded from risk detection by design (ADR-0057 §7).
 */
export interface ISessionFeedbackRepository {
  /** Persists a new or modified SessionFeedback. */
  save(feedback: SessionFeedback): Promise<void>;

  /** Loads a feedback by its own ID. Returns null if not found. */
  findById(feedbackId: string): Promise<SessionFeedback | null>;

  /**
   * Loads the feedback attached to a specific booking (1:1 relationship).
   * Returns null if no feedback has been submitted yet.
   */
  findByBookingId(bookingId: string): Promise<SessionFeedback | null>;

  /**
   * Returns true if a feedback already exists for the given booking.
   * Used to enforce the 1-booking-1-feedback constraint.
   */
  existsByBookingId(bookingId: string): Promise<boolean>;

  /**
   * Returns all feedbacks for a professional, ordered by submittedAtUtc DESC.
   * When includeHidden is false (default), hidden feedbacks are excluded.
   */
  findByProfessionalId(
    professionalProfileId: string,
    includeHidden?: boolean,
  ): Promise<SessionFeedback[]>;

  /**
   * Returns all feedbacks submitted by a client, ordered by submittedAtUtc DESC.
   */
  findByClientId(clientId: string): Promise<SessionFeedback[]>;

  /**
   * Counts negative feedbacks (rating ≤ 2) within a rolling window.
   * Hidden feedbacks are excluded when includeHidden is false (default).
   * Used by risk detection (ADR-0057 §5).
   */
  countNegativeInWindow(
    professionalProfileId: string,
    windowDays: number,
    includeHidden?: boolean,
  ): Promise<number>;

  /**
   * Computes the average rating for a professional.
   * When windowDays is undefined, considers all-time feedbacks.
   * Hidden feedbacks are always excluded from average calculation.
   */
  getAverageRating(professionalProfileId: string, windowDays?: number): Promise<number | null>;

  /**
   * Returns all flagged feedbacks pending moderation review.
   * Used by admin moderation dashboard.
   */
  findFlagged(): Promise<SessionFeedback[]>;
}
