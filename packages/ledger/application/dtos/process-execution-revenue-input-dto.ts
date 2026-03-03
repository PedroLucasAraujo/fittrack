/**
 * Input DTO for ProcessExecutionRevenue use case.
 * Triggered by ExecutionRecorded event. Per-session amounts are pre-computed
 * by the infrastructure event handler following ADR-0052.
 */
export interface ProcessExecutionRevenueInputDTO {
  readonly professionalProfileId: string;
  readonly executionId: string;
  readonly accessGrantId: string;
  readonly transactionId: string;
  /** Per-session professional amount in cents (after platform fee). ADR-0052 §3. */
  readonly professionalAmountCents: number;
  /** Per-session platform fee in cents. ADR-0052 §3. */
  readonly platformFeeAmountCents: number;
  /** ISO 4217 currency code (e.g., 'BRL'). */
  readonly currency: string;
  /** YYYY-MM-DD logical day of the execution (ADR-0010). */
  readonly logicalDay: string;
}
