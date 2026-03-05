/**
 * Error code registry for the DeliverableTemplate bounded context.
 *
 * Namespaced with `TEMPLATE.` prefix to avoid collisions with
 * Deliverable error codes and codes from other bounded contexts.
 */
export const TemplateErrorCodes = {
  INVALID_TEMPLATE: 'TEMPLATE.INVALID_TEMPLATE',
  INVALID_TEMPLATE_TRANSITION: 'TEMPLATE.INVALID_TEMPLATE_TRANSITION',
  INVALID_TEMPLATE_STRUCTURE: 'TEMPLATE.INVALID_TEMPLATE_STRUCTURE',
  TEMPLATE_NOT_FOUND: 'TEMPLATE.TEMPLATE_NOT_FOUND',
  TEMPLATE_NOT_ACTIVE: 'TEMPLATE.TEMPLATE_NOT_ACTIVE',
  TEMPLATE_CANNOT_BE_EDITED: 'TEMPLATE.TEMPLATE_CANNOT_BE_EDITED',
  TEMPLATE_NAME_ALREADY_EXISTS: 'TEMPLATE.TEMPLATE_NAME_ALREADY_EXISTS',
} as const;

export type TemplateErrorCode = (typeof TemplateErrorCodes)[keyof typeof TemplateErrorCodes];
