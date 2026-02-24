/**
 * AuditLog port for the Risk bounded context.
 *
 * Writes are fire-and-forget (ADR-0027 Constraints). A failure to write an
 * AuditLog entry does not roll back the originating domain operation.
 * Infrastructure implementations must swallow errors internally and route
 * them to infrastructure monitoring.
 */

export interface RiskStatusChangedAuditData {
  /** userId of the actor, or 'SYSTEM' for automated actions (ADR-0027 §3). */
  actorId: string;
  /** Role of the actor at time of action, or 'SYSTEM' (ADR-0027 §3). */
  actorRole: string;
  /** ID of the ProfessionalProfile whose RiskStatus changed. */
  targetEntityId: string;
  /** professionalProfileId — tenant scope of the audit entry (ADR-0027 §1). */
  tenantId: string;
  previousStatus: string;
  newStatus: string;
  /** Human-readable reason for the transition (non-empty, ≤500 chars). */
  reason: string;
  /** ISO 8601 UTC timestamp of the transition. */
  occurredAtUtc: string;
}

export interface IRiskAuditLog {
  /**
   * Writes a RISK_STATUS_CHANGED AuditLog entry (ADR-0027 §2).
   * Called in the application layer after the domain transaction commits
   * (ADR-0027 Constraints).
   */
  writeRiskStatusChanged(data: RiskStatusChangedAuditData): Promise<void>;
}
