import { left, right } from '@fittrack/core';
import type { DomainResult, UTCDateTime } from '@fittrack/core';
import type {
  RespondToProfessionalReviewInputDTO,
  RespondToProfessionalReviewOutputDTO,
} from '../dtos/respond-to-professional-review-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import type { IReviewEventPublisher } from '../ports/i-review-event-publisher.js';
import { ProfessionalResponse } from '../../domain/value-objects/professional-response.js';
import { ReviewNotFoundError } from '../../domain/errors/review-not-found-error.js';
import { ProfessionalReviewRespondedEvent } from '../../domain/events/professional-review-responded-event.js';

/**
 * RespondToProfessionalReview use case.
 *
 * The professional can respond once (respond()) or update their response
 * (updateResponse()). Both operations are handled here — the use case
 * detects which to call based on existing state.
 */
export class RespondToProfessionalReview {
  constructor(
    private readonly reviewRepository: IProfessionalReviewRepository,
    private readonly eventPublisher: IReviewEventPublisher,
  ) {}

  async execute(
    dto: RespondToProfessionalReviewInputDTO,
  ): Promise<DomainResult<RespondToProfessionalReviewOutputDTO>> {
    // 1. Validate response text
    const responseResult = ProfessionalResponse.create(dto.response);
    if (responseResult.isLeft()) return left(responseResult.value);
    const response = responseResult.value;

    // 2. Load review scoped to the requesting professional (ADR-0025).
    // Returns null when the review does not exist OR belongs to a different
    // professional — caller receives ReviewNotFoundError (404), never 403.
    const review = await this.reviewRepository.findByIdAndProfessionalProfileId(
      dto.reviewId,
      dto.professionalProfileId,
    );
    if (!review) {
      return left(new ReviewNotFoundError(dto.reviewId));
    }

    // 3. Respond or update existing response.
    // Both methods return Right<UTCDateTime> on success — the timestamp is
    // captured here to avoid non-null assertions on the aggregate property.
    let operationResult: DomainResult<UTCDateTime>;
    if (review.hasProfessionalResponse()) {
      operationResult = review.updateResponse(response);
    } else {
      operationResult = review.respond(response);
    }
    /* v8 ignore next */
    if (operationResult.isLeft()) return left(operationResult.value);
    const respondedAtIso = operationResult.value.toISO();

    // 4. Persist
    await this.reviewRepository.save(review);

    // 5. Publish event post-commit
    await this.eventPublisher.publishReviewResponded(
      new ProfessionalReviewRespondedEvent(review.id, review.professionalProfileId, {
        reviewId: review.id,
        professionalProfileId: review.professionalProfileId,
        clientId: review.clientId,
        respondedAtUtc: respondedAtIso,
      }),
    );

    return right({
      reviewId: review.id,
      respondedAtUtc: respondedAtIso,
    });
  }
}
