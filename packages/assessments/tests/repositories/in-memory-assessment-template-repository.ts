import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { AssessmentTemplate } from '../../domain/aggregates/assessment-template.js';

/**
 * In-memory implementation of IAssessmentTemplateRepository for unit tests.
 *
 * All query methods enforce tenant isolation by filtering on `professionalProfileId`,
 * mirroring the invariant from ADR-0025.
 */
export class InMemoryAssessmentTemplateRepository implements IAssessmentTemplateRepository {
  public items: AssessmentTemplate[] = [];

  async save(template: AssessmentTemplate): Promise<void> {
    const index = this.items.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      this.items[index] = template;
    } else {
      this.items.push(template);
    }
  }

  async findById(id: string, professionalProfileId: string): Promise<AssessmentTemplate | null> {
    return (
      this.items.find((t) => t.id === id && t.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findAllByProfessional(professionalProfileId: string): Promise<AssessmentTemplate[]> {
    return this.items.filter((t) => t.professionalProfileId === professionalProfileId);
  }
}
