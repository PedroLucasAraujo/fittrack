import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableType } from '../../enums/deliverable-type.js';
import { InvalidTemplateStructureError } from '../../errors/invalid-template-structure-error.js';
import type { ITemplateStructure, TemplateSnapshot } from './i-template-structure.js';

export type QuestionType = 'text' | 'number' | 'select';

export interface AssessmentQuestion {
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  /** Allowed options (for "select" type). */
  options: string[] | null;
}

/**
 * Template structure for PHYSIOLOGICAL_ASSESSMENT deliverables.
 *
 * Contains an ordered list of assessment questions.
 *
 * Validation rules:
 *   - At least one question required.
 *   - Each question must have a non-empty key and label.
 *   - "select" questions must have at least one option.
 */
export class AssessmentTemplateStructure implements ITemplateStructure {
  readonly type = DeliverableType.PHYSIOLOGICAL_ASSESSMENT;

  private constructor(private readonly questions: AssessmentQuestion[]) {}

  static create(questions: AssessmentQuestion[]): AssessmentTemplateStructure {
    return new AssessmentTemplateStructure(
      questions.map((q) => ({ ...q, options: q.options ? [...q.options] : null })),
    );
  }

  /** Returns a copy of the questions array. */
  getQuestions(): AssessmentQuestion[] {
    return this.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : null }));
  }

  validate(): DomainResult<void> {
    if (this.questions.length === 0) {
      return left(
        new InvalidTemplateStructureError(
          'PHYSIOLOGICAL_ASSESSMENT template must have at least one question',
        ),
      );
    }

    for (const q of this.questions) {
      if (!q.key || q.key.trim().length === 0) {
        return left(new InvalidTemplateStructureError('each question must have a non-empty key'));
      }

      if (!q.label || q.label.trim().length === 0) {
        return left(new InvalidTemplateStructureError('each question must have a non-empty label'));
      }

      if (q.type === 'select' && (!q.options || q.options.length === 0)) {
        return left(
          new InvalidTemplateStructureError(
            `select question "${q.key}" must have at least one option`,
          ),
        );
      }
    }

    return right(undefined);
  }

  toSnapshot(_parameterValues?: Map<string, string | number | boolean>): TemplateSnapshot {
    return {
      type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
      description: `Assessment with ${this.questions.length} question(s)`,
      exercises: [],
    };
  }
}
