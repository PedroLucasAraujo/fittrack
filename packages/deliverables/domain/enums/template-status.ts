/**
 * Lifecycle states for the DeliverableTemplate aggregate.
 *
 * Transitions:
 *   DRAFT → ACTIVE  (activate) — locks structure; enables instantiation
 *   DRAFT → ARCHIVED (archive) — abandon before activation
 *   ACTIVE → ARCHIVED (archive) — retire template; existing deliverables unaffected
 *
 * ARCHIVED → ACTIVE is NOT permitted. To create an updated version of an
 * ACTIVE template, use CreateTemplateVersion to produce a new DRAFT (v+1).
 */
export const TemplateStatus = {
  /** Mutable; can be edited freely. Not instantiable. */
  DRAFT: 'DRAFT',
  /** Locked; cannot be edited directly. Instantiable by authorized professionals. */
  ACTIVE: 'ACTIVE',
  /** Terminal; cannot instantiate. Existing deliverables are unaffected. */
  ARCHIVED: 'ARCHIVED',
} as const;

export type TemplateStatus = (typeof TemplateStatus)[keyof typeof TemplateStatus];
