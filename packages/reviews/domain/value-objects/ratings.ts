import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Rating } from './rating.js';
import { OverallRating } from './overall-rating.js';

export interface RatingsProps {
  professionalism: number;
  communication: number;
  technicalKnowledge: number;
  punctuality: number;
  results: number;
}

/**
 * Composite VO holding the 5 criterion ratings for a review.
 * All five must be valid integers in [1, 5].
 */
export class Ratings {
  private constructor(
    readonly professionalism: Rating,
    readonly communication: Rating,
    readonly technicalKnowledge: Rating,
    readonly punctuality: Rating,
    readonly results: Rating,
  ) {}

  /**
   * Creates a Ratings VO from 5 individual criterion values.
   * Returns Left<InvalidRatingError> on the first invalid criterion.
   */
  static create(props: RatingsProps): DomainResult<Ratings> {
    const profResult = Rating.create(props.professionalism);
    if (profResult.isLeft()) return left(profResult.value);

    const commResult = Rating.create(props.communication);
    if (commResult.isLeft()) return left(commResult.value);

    const techResult = Rating.create(props.technicalKnowledge);
    if (techResult.isLeft()) return left(techResult.value);

    const punctResult = Rating.create(props.punctuality);
    if (punctResult.isLeft()) return left(punctResult.value);

    const resResult = Rating.create(props.results);
    if (resResult.isLeft()) return left(resResult.value);

    return right(
      new Ratings(
        profResult.value,
        commResult.value,
        techResult.value,
        punctResult.value,
        resResult.value,
      ),
    );
  }

  /** Calculates the overall rating as the arithmetic mean of the 5 criteria. */
  calculateOverall(): OverallRating {
    return OverallRating.fromValues(
      this.professionalism.value,
      this.communication.value,
      this.technicalKnowledge.value,
      this.punctuality.value,
      this.results.value,
    );
  }

  toJSON(): RatingsProps {
    return {
      professionalism: this.professionalism.value,
      communication: this.communication.value,
      technicalKnowledge: this.technicalKnowledge.value,
      punctuality: this.punctuality.value,
      results: this.results.value,
    };
  }
}
