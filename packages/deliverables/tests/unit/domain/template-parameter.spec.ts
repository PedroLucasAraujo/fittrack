import { describe, it, expect } from 'vitest';
import { TemplateParameter } from '../../../domain/value-objects/template-parameter.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';

describe('TemplateParameter', () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it('creates a valid number parameter', () => {
    const result = TemplateParameter.create({
      name: 'weeks',
      type: 'number',
      required: false,
      defaultValue: 12,
      min: 4,
      max: 52,
      options: null,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('weeks');
      expect(result.value.type).toBe('number');
      expect(result.value.min).toBe(4);
      expect(result.value.max).toBe(52);
      expect(result.value.required).toBe(false);
      expect(result.value.defaultValue).toBe(12);
    }
  });

  it('creates a valid string parameter', () => {
    const result = TemplateParameter.create({
      name: 'label',
      type: 'string',
      required: false,
      defaultValue: 'Default',
      min: null,
      max: null,
      options: null,
    });

    expect(result.isRight()).toBe(true);
  });

  it('creates a valid boolean parameter', () => {
    const result = TemplateParameter.create({
      name: 'advanced',
      type: 'boolean',
      required: false,
      defaultValue: false,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isRight()).toBe(true);
  });

  it('creates a valid select parameter with options', () => {
    const result = TemplateParameter.create({
      name: 'goal',
      type: 'select',
      required: true,
      defaultValue: 'strength',
      min: null,
      max: null,
      options: ['strength', 'endurance', 'flexibility'],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.options).toEqual(['strength', 'endurance', 'flexibility']);
    }
  });

  it('creates a required parameter with a defaultValue', () => {
    const result = TemplateParameter.create({
      name: 'weeks',
      type: 'number',
      required: true,
      defaultValue: 8,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isRight()).toBe(true);
  });

  it('allows min === max (boundary)', () => {
    const result = TemplateParameter.create({
      name: 'exact',
      type: 'number',
      required: false,
      defaultValue: null,
      min: 5,
      max: 5,
      options: null,
    });

    expect(result.isRight()).toBe(true);
  });

  it('defensive copy: mutating external options array does not affect the value object', () => {
    const options = ['a', 'b'];
    const result = TemplateParameter.create({
      name: 'choice',
      type: 'select',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options,
    });

    options.push('c');

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.options).toHaveLength(2);
    }
  });

  // ── Invariant: name cannot be empty ───────────────────────────────────────

  it('returns error when name is empty string', () => {
    const result = TemplateParameter.create({
      name: '',
      type: 'number',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when name is whitespace only', () => {
    const result = TemplateParameter.create({
      name: '   ',
      type: 'number',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  // ── Invariant: select requires at least one option ─────────────────────────

  it('returns error when select parameter has empty options array', () => {
    const result = TemplateParameter.create({
      name: 'goal',
      type: 'select',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when select parameter has null options', () => {
    const result = TemplateParameter.create({
      name: 'goal',
      type: 'select',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  // ── Invariant: min must be ≤ max ──────────────────────────────────────────

  it('returns error when min > max', () => {
    const result = TemplateParameter.create({
      name: 'weeks',
      type: 'number',
      required: false,
      defaultValue: null,
      min: 52,
      max: 4,
      options: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  // ── Invariant: required parameter must have a defaultValue ─────────────────

  it('returns error when required parameter has null defaultValue', () => {
    const result = TemplateParameter.create({
      name: 'weeks',
      type: 'number',
      required: true,
      defaultValue: null,
      min: null,
      max: null,
      options: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });
});
