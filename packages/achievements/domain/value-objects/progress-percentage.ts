/**
 * Calculated progress percentage (0–100), capped and rounded to integer.
 * Computed from currentValue / targetValue * 100.
 */
export class ProgressPercentage {
  readonly value: number;

  private constructor(value: number) {
    this.value = Math.min(100, Math.max(0, Math.round(value)));
  }

  static compute(current: number, target: number): ProgressPercentage {
    if (target <= 0) return new ProgressPercentage(0);
    return new ProgressPercentage((current / target) * 100);
  }

  isComplete(): boolean {
    return this.value >= 100;
  }

  equals(other: ProgressPercentage): boolean {
    return this.value === other.value;
  }
}
