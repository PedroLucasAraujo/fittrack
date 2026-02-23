import type { TemplateFieldType } from '../../domain/enums/template-field-type.js';

export interface AddTemplateFieldOutputDTO {
  assessmentTemplateId: string;
  fieldId: string;
  label: string;
  fieldType: TemplateFieldType;
  unit: string | null;
  required: boolean;
  options: string[] | null;
  orderIndex: number;
  contentVersion: number;
}
