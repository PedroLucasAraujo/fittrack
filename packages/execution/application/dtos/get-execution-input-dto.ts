/**
 * Input for the GetExecution use case.
 *
 * `professionalProfileId` scopes the lookup to the requesting tenant (ADR-0025).
 */
export interface GetExecutionInputDTO {
  /** UUID of the Execution to retrieve. */
  executionId: string;

  /** UUID of the professional; sourced from JWT (ADR-0025). */
  professionalProfileId: string;
}
