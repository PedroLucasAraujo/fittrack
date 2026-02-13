import { describe, it, expect } from 'vitest';
import { generateId } from '../../utils/generate-id.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateId()', () => {
  it('returns a string that matches the UUIDv4 format', () => {
    expect(UUID_V4_REGEX.test(generateId())).toBe(true);
  });

  it('produces a different ID on each call', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBe(20);
  });

  it('version nibble is always 4', () => {
    for (let i = 0; i < 10; i++) {
      const id = generateId();
      expect(id[14]).toBe('4');
    }
  });

  it('variant nibble is always 8, 9, a or b', () => {
    for (let i = 0; i < 10; i++) {
      const id = generateId();
      expect(['8', '9', 'a', 'b']).toContain(id[19].toLowerCase());
    }
  });
});
