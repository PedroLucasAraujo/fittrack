/**
 * Proof that the client-professional interaction was verified before allowing
 * the review submission (ADR-0068 §3).
 *
 * This VO is always true for persisted reviews — the anti-fraud check in
 * SubmitProfessionalReviewUseCase guarantees it before creation.
 */
export class VerifiedInteraction {
  private constructor(readonly value: boolean) {}

  /** Returns a VerifiedInteraction confirming a verified interaction. Always true. */
  static verified(): VerifiedInteraction {
    return new VerifiedInteraction(true);
  }

  /** True when the interaction was verified. */
  isVerified(): boolean {
    return this.value;
  }

  equals(other: VerifiedInteraction): boolean {
    return this.value === other.value;
  }
}
