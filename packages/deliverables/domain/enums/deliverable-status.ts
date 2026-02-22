/**
 * Deliverable lifecycle states (ADR-0008 pattern, ADR-0044 §2).
 *
 * ```
 * DRAFT → ACTIVE  (event: DeliverableActivated)
 * DRAFT → ARCHIVED (event: DeliverableArchived)
 * ACTIVE → ARCHIVED (event: DeliverableArchived)
 * ```
 *
 * Terminal state: ARCHIVED (no transitions out).
 * Content (exercises, fields) may only be mutated in DRAFT state.
 * Once ACTIVE the content snapshot is locked — changes require archiving
 * and creating a new Deliverable.
 */
export const DeliverableStatus = {
  /** Content is being assembled. Mutable. Not yet assignable. */
  DRAFT: 'DRAFT',
  /** Content is locked. Assignable to clients via AccessGrant. */
  ACTIVE: 'ACTIVE',
  /** Permanently retired. Terminal. No new assignments permitted. */
  ARCHIVED: 'ARCHIVED',
} as const;

export type DeliverableStatus = (typeof DeliverableStatus)[keyof typeof DeliverableStatus];
