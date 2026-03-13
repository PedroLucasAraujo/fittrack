/**
 * Represents the outcome of a scheduled job execution (ADR-0054).
 *
 * Jobs never throw — they always return a JobResult so the scheduler can
 * log, alert, and retry without unhandled rejection.
 */
export class JobResult {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly data?: Record<string, unknown>,
    public readonly error?: Error,
  ) {}

  static success(data?: Record<string, unknown>): JobResult {
    return new JobResult(true, data);
  }

  static failure(error: Error): JobResult {
    return new JobResult(false, undefined, error);
  }
}
