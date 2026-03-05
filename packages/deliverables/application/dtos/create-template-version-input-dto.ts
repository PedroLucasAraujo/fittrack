import type { TemplateParameterInputDTO } from './create-deliverable-template-input-dto.js';

export interface CreateTemplateVersionInputDTO {
  /** ID of the ACTIVE template to version from. */
  templateId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  /** Optional changes to apply to the new version (DRAFT). */
  changes?: {
    name?: string;
    description?: string | null;
    structure?: Record<string, unknown>;
    parameters?: TemplateParameterInputDTO[];
    tags?: string[];
  };
  /** ISO 8601 UTC string (must end with 'Z'). */
  createdAtUtc: string;
}
