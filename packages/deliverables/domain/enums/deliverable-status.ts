/**
 * Deliverable lifecycle states (ADR-0008 pattern, ADR-0044 §2).
 *
 * ```
 * DRAFT → ACTIVE
 * DRAFT → ARCHIVED
 * ACTIVE → ARCHIVED
 * ```
 *
 * Terminal state: ARCHIVED (no transitions out).
 * Content (exercises, fields) may only be mutated in DRAFT state.
 * Once ACTIVE the content snapshot is locked — changes require archiving
 * and creating a new Deliverable.
 *
 * Note: Deliverable emits no domain events (ADR-0047 §2; ADR-0009 §6 prohibits
 * generic lifecycle events). State transitions are plain mutations within the aggregate.
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
