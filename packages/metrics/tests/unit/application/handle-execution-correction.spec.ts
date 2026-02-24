import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { ExecutionCorrectionRecordedEvent } from '@fittrack/execution';
import { HandleExecutionCorrection } from '../../../application/use-cases/handle-execution-correction.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExecutionCorrectionRecordedEvent(
  overrides: Partial<{
    correctionId: string;
    originalExecutionId: string;
    reason: string;
    tenantId: string;
  }> = {},
): ExecutionCorrectionRecordedEvent {
  const correctionId = overrides.correctionId ?? generateId();
  return new ExecutionCorrectionRecordedEvent(correctionId, overrides.tenantId ?? generateId(), {
    correctionId,
    originalExecutionId: overrides.originalExecutionId ?? generateId(),
    reason: overrides.reason ?? 'Wrong client',
  });
}

// ── HandleExecutionCorrection ─────────────────────────────────────────────────

describe('HandleExecutionCorrection', () => {
  describe('execute()', () => {
    it('returns Right(undefined) for a valid correction event (no side effects in MVP)', async () => {
      const useCase = new HandleExecutionCorrection();
      const event = makeExecutionCorrectionRecordedEvent();

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
    });

    it('returns Right(undefined) regardless of reason content (ADR-0043 §3 — no automatic recomputation)', async () => {
      const useCase = new HandleExecutionCorrection();
      const event = makeExecutionCorrectionRecordedEvent({
        reason: 'Accidental duplicate entry',
      });

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
    });
  });
});
