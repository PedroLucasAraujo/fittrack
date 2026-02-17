/**
 * ServicePlan lifecycle states (ADR-0015 §1).
 *
 * | State     | Purchasable | Existing Subscriptions Active |
 * |-----------|-------------|------------------------------|
 * | DRAFT     | No          | N/A                          |
 * | ACTIVE    | Yes         | Yes                          |
 * | PAUSED    | No          | Yes                          |
 * | ARCHIVED  | No          | Yes (until expiry)           |
 * | DELETED   | No          | No                           |
 */
export enum ServicePlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}
