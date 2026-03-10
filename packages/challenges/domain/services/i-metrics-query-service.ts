/**
 * Anti-corruption layer (ACL) port for reading metric data from the Metrics
 * bounded context. Implemented in the infrastructure layer; never imported
 * by domain aggregates.
 *
 * ## Bounded context boundary
 *
 * The Challenges context must not depend directly on Metrics domain objects.
 * This interface is the ACL that translates Metrics data into the scalar values
 * needed for challenge progress computation.
 *
 * ## Status: pending MVP+1
 *
 * This port is defined but not yet consumed by any use case. It will be wired
 * into OnWorkoutExecutionRecorded to provide idempotent absolute workout counts.
 * The stub `InMemoryMetricsQueryService` is available in tests.
 *
 * @see ADR-0005 — bounded context isolation (Metrics data must not leak into Challenges)
 */
export interface IMetricsQueryService {
  /** Returns total workout count for the user since `sinceUtc`. */
  getWorkoutCountSince(userId: string, sinceUtc: Date): Promise<number>;
  /** Returns total training volume (kg lifted) for the user since `sinceUtc`. */
  getTotalVolumeSince(userId: string, sinceUtc: Date): Promise<number>;
  /** Returns the current streak length (days) for the user since `sinceUtc`. */
  getStreakDaysSince(userId: string, sinceUtc: Date): Promise<number>;
  /** Returns total nutrition log count for the user since `sinceUtc`. */
  getNutritionLogCountSince(userId: string, sinceUtc: Date): Promise<number>;
}
