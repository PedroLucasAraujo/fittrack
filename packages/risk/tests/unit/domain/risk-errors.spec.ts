import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';
import { InvalidRiskReasonError } from '../../../domain/errors/invalid-risk-reason-error.js';
import { ProfessionalRiskNotFoundError } from '../../../domain/errors/professional-risk-not-found-error.js';

// ── InvalidRiskReasonError ────────────────────────────────────────────────────

describe('InvalidRiskReasonError', () => {
  it('has code REASON_INVALID', () => {
    const error = new InvalidRiskReasonError('bad');
    expect(error.code).toBe(RiskErrorCodes.REASON_INVALID);
  });

  it('has a descriptive message mentioning reason constraints', () => {
    const error = new InvalidRiskReasonError('bad');
    expect(error.message).toMatch(/reason/i);
    expect(error.message).toMatch(/500/);
  });

  it('exposes reasonLength in context (non-PII diagnostic)', () => {
    const reason = 'some reason here';
    const error = new InvalidRiskReasonError(reason);
    expect(error.context).toMatchObject({ reasonLength: reason.length });
  });

  it('context reasonLength reflects the original (untrimmed) reason length', () => {
    const reason = '   '; // whitespace-only, length 3
    const error = new InvalidRiskReasonError(reason);
    expect(error.context?.['reasonLength']).toBe(3);
  });

  it('is an instance of Error', () => {
    expect(new InvalidRiskReasonError('x')).toBeInstanceOf(Error);
  });
});

// ── ProfessionalRiskNotFoundError ─────────────────────────────────────────────

describe('ProfessionalRiskNotFoundError', () => {
  it('has code PROFESSIONAL_NOT_FOUND', () => {
    const error = new ProfessionalRiskNotFoundError(generateId());
    expect(error.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
  });

  it('has a message mentioning ProfessionalProfile', () => {
    const profileId = generateId();
    const error = new ProfessionalRiskNotFoundError(profileId);
    expect(error.message).toMatch(/ProfessionalProfile/);
  });

  it('exposes professionalProfileId in context', () => {
    const profileId = generateId();
    const error = new ProfessionalRiskNotFoundError(profileId);
    expect(error.context).toMatchObject({ professionalProfileId: profileId });
  });

  it('is an instance of Error', () => {
    expect(new ProfessionalRiskNotFoundError(generateId())).toBeInstanceOf(Error);
  });
});
