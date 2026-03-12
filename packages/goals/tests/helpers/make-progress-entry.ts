import { ProgressEntry } from '../../domain/entities/progress-entry.js';
import type { ProgressSourceValue } from '../../domain/value-objects/progress-source.js';

interface MakeProgressEntryParams {
  value?: number;
  unit?: string;
  source?: ProgressSourceValue;
  recordedBy?: string | null;
  notes?: string | null;
}

export function makeProgressEntry(params: MakeProgressEntryParams = {}): ProgressEntry {
  const result = ProgressEntry.create({
    value: params.value ?? 80,
    unit: params.unit ?? 'kg',
    source: params.source ?? 'MANUAL',
    recordedBy: params.recordedBy ?? null,
    notes: params.notes ?? null,
  });
  if (result.isLeft()) {
    throw new Error(`makeProgressEntry failed: ${result.value.message}`);
  }
  return result.value;
}
