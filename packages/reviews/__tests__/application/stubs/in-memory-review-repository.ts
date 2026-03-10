import type { IProfessionalReviewRepository } from '../../../domain/repositories/i-professional-review-repository.js';
import type { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';

export class InMemoryReviewRepository implements IProfessionalReviewRepository {
  items: ProfessionalReview[] = [];

  async save(review: ProfessionalReview): Promise<void> {
    const index = this.items.findIndex((r) => r.id === review.id);
    if (index >= 0) {
      this.items[index] = review;
    } else {
      this.items.push(review);
    }
  }

  async findById(id: string): Promise<ProfessionalReview | null> {
    return this.items.find((r) => r.id === id) ?? null;
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<ProfessionalReview | null> {
    return (
      this.items.find((r) => r.id === id && r.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findByProfessional(professionalProfileId: string): Promise<ProfessionalReview[]> {
    return this.items.filter((r) => r.professionalProfileId === professionalProfileId);
  }

  async findByClient(clientId: string): Promise<ProfessionalReview[]> {
    return this.items.filter((r) => r.clientId === clientId);
  }

  async findByProfessionalAndClient(
    professionalProfileId: string,
    clientId: string,
  ): Promise<ProfessionalReview | null> {
    return (
      this.items.find(
        (r) =>
          r.professionalProfileId === professionalProfileId &&
          r.clientId === clientId &&
          r.isVisible(),
      ) ?? null
    );
  }

  async findVisibleByProfessional(professionalProfileId: string): Promise<ProfessionalReview[]> {
    return this.items.filter(
      (r) => r.professionalProfileId === professionalProfileId && r.isVisible(),
    );
  }

  async findFlagged(): Promise<ProfessionalReview[]> {
    return this.items.filter((r) => r.isFlagged());
  }

  async existsByProfessionalAndClient(
    professionalProfileId: string,
    clientId: string,
  ): Promise<boolean> {
    return this.items.some(
      (r) => r.professionalProfileId === professionalProfileId && r.clientId === clientId,
    );
  }
}
