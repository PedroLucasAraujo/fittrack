/**
 * Execution lifecycle status (ADR-0005 §8-9 — CANONICAL).
 *
 * | Status     | Description                                      | Terminal? |
 * |------------|--------------------------------------------------|-----------|
 * | PENDING    | Initiated, not yet confirmed                     | No        |
 * | CONFIRMED  | Delivery confirmed; triggers metric derivation   | Yes       |
 * | CANCELLED  | Cancelled before confirmation; retained forever  | Yes       |
 *
 * Transitions (ADR-0005 §9):
 * - PENDING → CONFIRMED via `Execution.confirm()`
 * - PENDING → CANCELLED via `Execution.cancel()`
 * - CONFIRMED and CANCELLED have no further valid transitions.
 */
export const ExecutionStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];
