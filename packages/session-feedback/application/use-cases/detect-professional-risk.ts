import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidFeedbackError } from '../../domain/errors/invalid-feedback-error.js';
import { ProfessionalRiskDetectedEvent } from '../../domain/events/professional-risk-detected-event.js';
import { ProfessionalRiskResolvedEvent } from '../../domain/events/professional-risk-resolved-event.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../ports/i-session-feedback-event-publisher.js';
import type {
  DetectProfessionalRiskInputDTO,
  DetectProfessionalRiskOutputDTO,
} from '../dtos/detect-professional-risk-dto.js';

const WINDOW_DAYS = 30;
const WATCHLIST_THRESHOLD = 5;
const FLAGGED_THRESHOLD = 10;

/**
 * Evaluates a professional's negative feedback count against risk thresholds
 * and emits the appropriate event so the Risk module can update status (ADR-0057 §5).
 *
 * ## Thresholds
 * - ≥5 negative feedbacks (rating ≤ 2, visible) in 30 days → WATCHLIST
 * - ≥10 negative feedbacks in 30 days → FLAGGED
 * - <5 negative feedbacks → emits ProfessionalRiskResolvedEvent (clears status)
 *
 * ## When called
 * - By OnSessionFeedbackSubmitted event handler when isNegative=true
 * - By OnSessionFeedbackHidden event handler when wasNegative=true (recalculate)
 *
 * ## Hidden feedbacks
 * Hidden feedbacks do NOT count toward the threshold (ADR-0057 §7).
 */
export class DetectProfessionalRisk {
  constructor(
    private readonly feedbackRepo: ISessionFeedbackRepository,
    private readonly eventPublisher: ISessionFeedbackEventPublisher,
  ) {}

  async execute(
    dto: DetectProfessionalRiskInputDTO,
  ): Promise<DomainResult<DetectProfessionalRiskOutputDTO>> {
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidFeedbackError('professionalProfileId is required'));
    }

    // 1. Count visible negative feedbacks in rolling 30-day window
    const count = await this.feedbackRepo.countNegativeInWindow(
      dto.professionalProfileId,
      WINDOW_DAYS,
      false, // exclude hidden
    );

    // 2. Determine risk level
    let riskLevel: 'WATCHLIST' | 'FLAGGED' | null = null;
    let threshold = 0;

    if (count >= FLAGGED_THRESHOLD) {
      riskLevel = 'FLAGGED';
      threshold = FLAGGED_THRESHOLD;
    } else if (count >= WATCHLIST_THRESHOLD) {
      riskLevel = 'WATCHLIST';
      threshold = WATCHLIST_THRESHOLD;
    }

    const riskDetected = riskLevel !== null;

    // 3. Emit event so Risk module can update professional status (ADR-0047 §4)
    if (riskDetected) {
      await this.eventPublisher.publishProfessionalRiskDetected(
        new ProfessionalRiskDetectedEvent(dto.professionalProfileId, dto.professionalProfileId, {
          professionalProfileId: dto.professionalProfileId,
          riskType: 'NEGATIVE_SESSION_FEEDBACK',
          negativeFeedbackCount: count,
          windowDays: WINDOW_DAYS,
          threshold,
          detectedAtUtc: new Date().toISOString(),
        }),
      );
    } else {
      // Count dropped below all thresholds — Risk module should clear the status
      await this.eventPublisher.publishProfessionalRiskResolved(
        new ProfessionalRiskResolvedEvent(dto.professionalProfileId, dto.professionalProfileId, {
          professionalProfileId: dto.professionalProfileId,
          negativeFeedbackCount: count,
          windowDays: WINDOW_DAYS,
          resolvedAtUtc: new Date().toISOString(),
        }),
      );
    }

    return right({
      professionalProfileId: dto.professionalProfileId,
      negativeFeedbackCount: count,
      riskDetected,
      riskLevel,
    });
  }
}
