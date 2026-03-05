import type { TemplateParameterInputDTO } from './create-deliverable-template-input-dto.js';

export interface UpdateDeliverableTemplateInputDTO {
  templateId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  name?: string;
  description?: string | null;
  structure?: Record<string, unknown>;
  parameters?: TemplateParameterInputDTO[];
  tags?: string[];
}
