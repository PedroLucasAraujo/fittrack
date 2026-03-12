import { describe, it, expect, beforeEach } from 'vitest';
import { SubmitProfessionalReview } from '../../../application/use-cases/submit-professional-review.js';
import { InMemoryReviewRepository } from '../stubs/in-memory-review-repository.js';
import { InMemorySessionHistoryQuery } from '../stubs/in-memory-session-history-query.js';
import { InMemoryEventPublisher } from '../stubs/in-memory-event-publisher.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

const validInput = {
  clientId: 'client-abc',
  professionalProfileId: 'prof-xyz',
  ratings: {
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 4,
    punctuality: 5,
    results: 4,
  },
  comment: 'Excellent professional, highly recommended!',
  wouldRecommend: true,
};

describe('SubmitProfessionalReview', () => {
  let sut: SubmitProfessionalReview;
  let reviewRepo: InMemoryReviewRepository;
  let sessionQuery: InMemorySessionHistoryQuery;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    reviewRepo = new InMemoryReviewRepository();
    sessionQuery = new InMemorySessionHistoryQuery();
    eventPublisher = new InMemoryEventPublisher();
    sut = new SubmitProfessionalReview(reviewRepo, sessionQuery, eventPublisher);
  });

  it('creates a review and returns output DTO when client has ≥5 sessions', async () => {
    sessionQuery.sessionCount = 10;

    const result = await sut.execute(validInput);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.professionalProfileId).toBe('prof-xyz');
      expect(result.value.clientId).toBe('client-abc');
      expect(result.value.overallRating).toBe(4.4); // (4+5+4+5+4)/5
      expect(result.value.sessionCountAtReview).toBe(10);
    }
  });

  it('persists the review', async () => {
    sessionQuery.sessionCount = 5;

    await sut.execute(validInput);

    expect(reviewRepo.items).toHaveLength(1);
    expect(reviewRepo.items[0]!.professionalProfileId).toBe('prof-xyz');
  });

  it('publishes ProfessionalReviewSubmittedEvent', async () => {
    sessionQuery.sessionCount = 10;

    await sut.execute(validInput);

    expect(eventPublisher.submittedEvents).toHaveLength(1);
    expect(eventPublisher.submittedEvents[0]!.payload.wouldRecommend).toBe(true);
    expect(eventPublisher.submittedEvents[0]!.payload.sessionCountAtReview).toBe(10);
    expect(eventPublisher.submittedEvents[0]!.payload.verifiedInteraction).toBe(true);
  });

  it('returns Left<InsufficientSessionsError> when client has <5 sessions', async () => {
    sessionQuery.sessionCount = 3;

    const result = await sut.execute(validInput);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INSUFFICIENT_SESSIONS);
    }
    expect(reviewRepo.items).toHaveLength(0);
  });

  it('returns Left<InsufficientSessionsError> for exactly 4 sessions', async () => {
    sessionQuery.sessionCount = 4;

    const result = await sut.execute(validInput);

    expect(result.isLeft()).toBe(true);
  });

  it('accepts submission with exactly 5 sessions', async () => {
    sessionQuery.sessionCount = 5;

    const result = await sut.execute(validInput);

    expect(result.isRight()).toBe(true);
  });

  it('returns Left<DuplicateReviewError> when client already has a review and <20 additional sessions', async () => {
    sessionQuery.sessionCount = 10;

    // First submission
    await sut.execute(validInput);

    // Second submission with same count (0 additional sessions)
    const result = await sut.execute(validInput);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.DUPLICATE_REVIEW);
    }
  });

  it('allows new review after +20 additional sessions (hides old review)', async () => {
    sessionQuery.sessionCount = 10;
    await sut.execute(validInput);

    // Now simulate 20 more sessions
    sessionQuery.sessionCount = 30;
    const result = await sut.execute(validInput);

    expect(result.isRight()).toBe(true);
    // Old review is hidden, new review exists
    const visibleReviews = reviewRepo.items.filter((r) => r.isVisible());
    expect(visibleReviews).toHaveLength(1);
  });

  it('returns Left<InvalidRatingError> for invalid ratings', async () => {
    sessionQuery.sessionCount = 10;

    const result = await sut.execute({
      ...validInput,
      ratings: { ...validInput.ratings, professionalism: 6 },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_RATING);
    }
  });

  it('returns Left<InvalidCommentError> for comment shorter than 10 chars', async () => {
    sessionQuery.sessionCount = 10;

    const result = await sut.execute({
      ...validInput,
      comment: 'Short',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
    }
  });

  it('allows submission without comment', async () => {
    sessionQuery.sessionCount = 10;

    const { comment: _comment, ...inputWithoutComment } = validInput;
    const result = await sut.execute(inputWithoutComment);

    expect(result.isRight()).toBe(true);
    expect(reviewRepo.items[0]!.comment).toBeNull();
  });

  it('returns Left<InvalidReviewError> for empty clientId', async () => {
    const result = await sut.execute({ ...validInput, clientId: '' });
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left<InvalidReviewError> for empty professionalProfileId', async () => {
    const result = await sut.execute({ ...validInput, professionalProfileId: '' });
    expect(result.isLeft()).toBe(true);
  });

  it('does not publish event when validation fails', async () => {
    sessionQuery.sessionCount = 3;

    await sut.execute(validInput);

    expect(eventPublisher.submittedEvents).toHaveLength(0);
  });

  it('returns Left when session history query fails', async () => {
    sessionQuery.shouldFail = true;

    const result = await sut.execute(validInput);

    expect(result.isLeft()).toBe(true);
    expect(reviewRepo.items).toHaveLength(0);
  });
});
