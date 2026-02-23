/**
 * Lifecycle states for the AssessmentTemplate aggregate (ADR-0008 pattern).
 *
 * ```
 * DRAFT → ACTIVE   (activateTemplate) — locks fields; usable at prescription time
 * DRAFT → ARCHIVED (archiveTemplate)  — terminal
 * ACTIVE → ARCHIVED (archiveTemplate) — terminal
 * ```
 *
 * Terminal state: ARCHIVED. No transitions out of ARCHIVED.
 */
export const AssessmentTemplateStatus = {
  /** Template is being configured. Fields are mutable. Not yet usable for prescriptions. */
  DRAFT: 'DRAFT',
  /** Template is locked and usable for Deliverable prescription. Fields are immutable. */
  ACTIVE: 'ACTIVE',
  /** Template is permanently retired. No new prescriptions may reference it. */
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssessmentTemplateStatus =
  (typeof AssessmentTemplateStatus)[keyof typeof AssessmentTemplateStatus];
