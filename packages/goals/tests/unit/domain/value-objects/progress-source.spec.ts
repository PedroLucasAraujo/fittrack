import { describe, it, expect } from 'vitest';
import { ProgressSource } from '../../../../domain/value-objects/progress-source.js';

describe('ProgressSource.create()', () => {
  it.each(['ASSESSMENT', 'METRIC', 'MANUAL'])('accepts "%s"', (s) => {
    const r = ProgressSource.create(s);
    expect(r.isRight()).toBe(true);
  });

  it('rejects invalid source', () => {
    expect(ProgressSource.create('AUTO').isLeft()).toBe(true);
  });

  it('isAutomatic() true for ASSESSMENT and METRIC', () => {
    expect((ProgressSource.create('ASSESSMENT').value as ProgressSource).isAutomatic()).toBe(true);
    expect((ProgressSource.create('METRIC').value as ProgressSource).isAutomatic()).toBe(true);
    expect((ProgressSource.create('MANUAL').value as ProgressSource).isAutomatic()).toBe(false);
  });
});
