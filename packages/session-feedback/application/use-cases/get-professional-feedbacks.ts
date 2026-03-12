import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidFeedbackError } from '../../domain/errors/invalid-feedback-error.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type {
  GetProfessionalFeedbacksInputDTO,
  GetProfessionalFeedbacksOutputDTO,
  SessionFeedbackItemDTO,
} from '../dtos/get-professional-feedbacks-dto.js';

/**
 * Returns all session feedbacks for a professional (ADR-0057 §8).
 *
 * ## Visibility rules
 * - Professional sees only visible (non-hidden) feedbacks about himself
 * - Admin may request includeHidden=true to see all feedbacks
 * - clientId is OMITTED from results to protect client privacy
 */
export class GetProfessionalFeedbacks {
  constructor(private readonly feedbackRepo: ISessionFeedbackRepository) {}

  async execute(
    dto: GetProfessionalFeedbacksInputDTO,
  ): Promise<DomainResult<GetProfessionalFeedbacksOutputDTO>> {
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidFeedbackError('professionalProfileId is required'));
    }

    const includeHidden = dto.includeHidden ?? false;

    // 1. Fetch feedbacks
    let feedbacks = await this.feedbackRepo.findByProfessionalId(
      dto.professionalProfileId,
      includeHidden,
    );

    // 2. Apply optional time window filter
    if (dto.windowDays !== undefined && dto.windowDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dto.windowDays);
      feedbacks = feedbacks.filter((f) => new Date(f.submittedAtUtc.toISO()) >= cutoff);
    }

    // 3. Map to DTOs (omit clientId for privacy)
    const items: SessionFeedbackItemDTO[] = feedbacks.map((f) => ({
      feedbackId: f.id,
      bookingId: f.bookingId,
      rating: f.rating.toNumber(),
      comment: f.comment?.value ?? null,
      sessionDate: f.sessionDate,
      submittedAtUtc: f.submittedAtUtc.toISO(),
      isFlagged: f.isFlagged(),
      isHidden: f.isHidden(),
      flaggedAtUtc: f.flaggedAtUtc?.toISO() ?? null,
      flagReason: f.flagReason?.value ?? null,
    }));

    return right({
      feedbacks: items,
      total: items.length,
    });
  }
}
