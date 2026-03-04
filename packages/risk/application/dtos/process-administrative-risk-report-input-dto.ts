/**
 * Input DTO for `ProcessAdministrativeRiskReport`.
 *
 * Admin-driven risk escalation to any target state (WATCHLIST or BANNED).
 * Requires human actor context for audit traceability (ADR-0027 §2).
 */
export interface ProcessAdministrativeRiskReportInputDTO {
  professionalProfileId: string;
  /** Target risk status. Automated assessments only reach WATCHLIST; admin can set BANNED. */
  targetRiskStatus: 'WATCHLIST' | 'BANNED';
  /** Human-readable reason. Non-empty, ≤ 500 characters (ADR-0022 §5). */
  reason: string;
  /** Optional report or case reference for audit traceability. */
  evidenceRef?: string;
  /** UUID of the admin performing the action (ADR-0027 §2). */
  actorId: string;
  /** Role of the admin performing the action (ADR-0027 §2). */
  actorRole: string;
}
