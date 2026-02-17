/**
 * ServicePlan type classification (ADR-0017 §2).
 *
 * - RECURRING: Ongoing subscription with defined duration and session count.
 * - ONE_TIME: Single purchase for a defined number of sessions.
 * - TRIAL: Platform-initiated trial grant; no financial transaction required.
 */
export enum PlanType {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
  TRIAL = 'TRIAL',
}
