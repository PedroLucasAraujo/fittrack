/**
 * Operational capabilities that can be granted to a professional.
 *
 * The domain sees capabilities only. Plan tiers (PRO, ENTERPRISE, etc.) are a
 * commercial / infrastructure concern managed by the Billing context — they map
 * to capability sets at the product layer but do NOT appear in the domain model.
 *
 * Adding a new capability never requires a domain tier-model change.
 */
export enum EntitlementType {
  /** Create multiple ProfessionalProfile records under one account. */
  MULTI_PROFILE = 'MULTI_PROFILE',
  /** Access advanced analytics dashboards (Self-Log, Metrics, cohort analysis). */
  ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',
  /** Create ServicePlans with duration exceeding the baseline limit. */
  LONG_TERM_PLANS = 'LONG_TERM_PLANS',
  /** Manage organization structure and sub-professional accounts. */
  ORG_MANAGEMENT = 'ORG_MANAGEMENT',
  /** Receive priority processing in payout scheduling. */
  PRIORITY_PAYOUT = 'PRIORITY_PAYOUT',
  /** Access the external REST/Webhook API. */
  API_ACCESS = 'API_ACCESS',
}
