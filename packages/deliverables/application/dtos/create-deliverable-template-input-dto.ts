import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { ParameterType } from '../../domain/value-objects/template-parameter.js';

export interface TemplateParameterInputDTO {
  name: string;
  type: ParameterType;
  required: boolean;
  defaultValue: string | number | boolean | null;
  min?: number | null;
  max?: number | null;
  options?: string[] | null;
}

export interface CreateDeliverableTemplateInputDTO {
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  name: string;
  description?: string | null;
  type: DeliverableType;
  /**
   * Serialized structure specific to the template type.
   * For TRAINING_PRESCRIPTION: { sessions: WorkoutSession[] }
   * For DIET_PLAN: { meals: MealTemplate[] }
   * For PHYSIOLOGICAL_ASSESSMENT: { questions: AssessmentQuestion[] }
   */
  structure: Record<string, unknown>;
  parameters?: TemplateParameterInputDTO[];
  tags?: string[];
  /** ISO 8601 UTC string (must end with 'Z'). */
  createdAtUtc: string;
}
