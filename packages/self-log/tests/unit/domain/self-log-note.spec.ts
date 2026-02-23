import { describe, it, expect } from 'vitest';
import { SelfLogNote } from '../../../domain/value-objects/self-log-note.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';

describe('SelfLogNote', () => {
  describe('create()', () => {
    it('accepts a valid 1-char note', () => {
      const result = SelfLogNote.create('A');

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('A');
      }
    });

    it('accepts a note at exactly 500 characters', () => {
      const note = 'x'.repeat(500);
      const result = SelfLogNote.create(note);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toHaveLength(500);
      }
    });

    it('trims leading and trailing whitespace', () => {
      const result = SelfLogNote.create('  trimmed note  ');

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('trimmed note');
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for an empty string', () => {
      const result = SelfLogNote.create('');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for a whitespace-only string', () => {
      const result = SelfLogNote.create('   ');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for a note exceeding 500 characters', () => {
      const note = 'x'.repeat(501);
      const result = SelfLogNote.create(note);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
      }
    });
  });

  describe('equals()', () => {
    it('two notes with the same value are equal', () => {
      const a = SelfLogNote.create('same note');
      const b = SelfLogNote.create('same note');

      expect(a.isRight() && b.isRight()).toBe(true);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('two notes with different values are not equal', () => {
      const a = SelfLogNote.create('note A');
      const b = SelfLogNote.create('note B');

      expect(a.isRight() && b.isRight()).toBe(true);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });
});
