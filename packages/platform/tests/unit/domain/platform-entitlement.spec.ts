import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeActive(
  entitlements: EntitlementType[] = [EntitlementType.ADVANCED_ANALYTICS],
  expiresAt: string | null = null,
): PlatformEntitlement {
  return PlatformEntitlement.create(
    generateId(),
    generateId(),
    entitlements,
    expiresAt,
    new Date().toISOString(),
  );
}

function makeSuspended(
  entitlements: EntitlementType[] = [EntitlementType.ADVANCED_ANALYTICS],
): PlatformEntitlement {
  const e = makeActive(entitlements);
  e.suspend('test suspension');
  return e;
}

function makeExpired(
  entitlements: EntitlementType[] = [EntitlementType.ADVANCED_ANALYTICS],
): PlatformEntitlement {
  const past = new Date(Date.now() - 1000).toISOString();
  const e = makeActive(entitlements, past);
  e.expire();
  return e;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlatformEntitlement', () => {
  // ── create() factory ──────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates an ACTIVE entitlement with provided capabilities', () => {
      const e = makeActive([EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE]);
      expect(e.status).toBe(EntitlementStatus.ACTIVE);
      expect(e.entitlements).toContain(EntitlementType.API_ACCESS);
      expect(e.entitlements).toContain(EntitlementType.MULTI_PROFILE);
    });

    it('deduplicates capabilities on creation', () => {
      const e = makeActive([EntitlementType.API_ACCESS, EntitlementType.API_ACCESS]);
      expect(e.entitlements.filter((c) => c === EntitlementType.API_ACCESS)).toHaveLength(1);
    });

    it('stores expiresAt', () => {
      const expiresAt = new Date(Date.now() + 86400_000).toISOString();
      const e = makeActive([EntitlementType.API_ACCESS], expiresAt);
      expect(e.expiresAt).toBe(expiresAt);
    });

    it('stores expiresAt as null when not provided', () => {
      const e = makeActive();
      expect(e.expiresAt).toBeNull();
    });

    it('version is 0 for new aggregates', () => {
      const e = makeActive();
      expect(e.version).toBe(0);
    });
  });

  // ── reconstitute() ────────────────────────────────────────────────────────

  describe('reconstitute()', () => {
    it('restores all props and version from persistence', () => {
      const id = generateId();
      const professionalProfileId = generateId();
      const createdAtUtc = new Date().toISOString();
      const e = PlatformEntitlement.reconstitute(
        id,
        {
          professionalProfileId,
          status: EntitlementStatus.SUSPENDED,
          entitlements: [EntitlementType.ORG_MANAGEMENT],
          expiresAt: null,
          createdAtUtc,
        },
        7,
      );
      expect(e.id).toBe(id);
      expect(e.professionalProfileId).toBe(professionalProfileId);
      expect(e.status).toBe(EntitlementStatus.SUSPENDED);
      expect(e.entitlements).toContain(EntitlementType.ORG_MANAGEMENT);
      expect(e.version).toBe(7);
      expect(e.createdAtUtc).toBe(createdAtUtc);
    });
  });

  // ── hasCapability() ───────────────────────────────────────────────────────

  describe('hasCapability()', () => {
    it('returns true when ACTIVE and capability is present', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      expect(e.hasCapability(EntitlementType.API_ACCESS)).toBe(true);
    });

    it('returns false when ACTIVE but capability is absent', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      expect(e.hasCapability(EntitlementType.MULTI_PROFILE)).toBe(false);
    });

    it('returns false when SUSPENDED even if capability is in snapshot', () => {
      const e = makeSuspended([EntitlementType.API_ACCESS]);
      expect(e.hasCapability(EntitlementType.API_ACCESS)).toBe(false);
    });

    it('returns false when EXPIRED', () => {
      const e = makeExpired([EntitlementType.API_ACCESS]);
      expect(e.hasCapability(EntitlementType.API_ACCESS)).toBe(false);
    });
  });

  // ── addCapability() ───────────────────────────────────────────────────────

  describe('addCapability()', () => {
    it('adds capability to ACTIVE entitlement', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      const result = e.addCapability(EntitlementType.MULTI_PROFILE);
      expect(result.isRight()).toBe(true);
      expect(e.entitlements).toContain(EntitlementType.MULTI_PROFILE);
    });

    it('is idempotent: adding already-present capability returns Right without duplicating', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      const result = e.addCapability(EntitlementType.API_ACCESS);
      expect(result.isRight()).toBe(true);
      expect(e.entitlements.filter((c) => c === EntitlementType.API_ACCESS)).toHaveLength(1);
    });

    it('returns Left when SUSPENDED', () => {
      const e = makeSuspended();
      const result = e.addCapability(EntitlementType.MULTI_PROFILE);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when EXPIRED', () => {
      const e = makeExpired();
      const result = e.addCapability(EntitlementType.MULTI_PROFILE);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });
  });

  // ── removeCapability() ────────────────────────────────────────────────────

  describe('removeCapability()', () => {
    it('removes capability from ACTIVE entitlement', () => {
      const e = makeActive([EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE]);
      const result = e.removeCapability(EntitlementType.API_ACCESS);
      expect(result.isRight()).toBe(true);
      expect(e.entitlements).not.toContain(EntitlementType.API_ACCESS);
      expect(e.entitlements).toContain(EntitlementType.MULTI_PROFILE);
    });

    it('returns Left when capability is not present', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      const result = e.removeCapability(EntitlementType.MULTI_PROFILE);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when SUSPENDED', () => {
      const e = makeSuspended([EntitlementType.API_ACCESS]);
      const result = e.removeCapability(EntitlementType.API_ACCESS);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when EXPIRED', () => {
      const e = makeExpired([EntitlementType.API_ACCESS]);
      const result = e.removeCapability(EntitlementType.API_ACCESS);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });
  });

  // ── suspend() ─────────────────────────────────────────────────────────────

  describe('suspend()', () => {
    it('transitions ACTIVE → SUSPENDED and preserves entitlements snapshot', () => {
      const e = makeActive([EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE]);
      const result = e.suspend('risk banned');
      expect(result.isRight()).toBe(true);
      expect(e.status).toBe(EntitlementStatus.SUSPENDED);
      // Snapshot preserved
      expect(e.entitlements).toContain(EntitlementType.API_ACCESS);
      expect(e.entitlements).toContain(EntitlementType.MULTI_PROFILE);
    });

    it('returns Left when already SUSPENDED', () => {
      const e = makeSuspended();
      const result = e.suspend('re-suspend attempt');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when EXPIRED', () => {
      const e = makeExpired();
      const result = e.suspend('suspend expired');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });
  });

  // ── reinstate() ───────────────────────────────────────────────────────────

  describe('reinstate()', () => {
    it('transitions SUSPENDED → ACTIVE and restores entitlements snapshot', () => {
      const e = makeSuspended([EntitlementType.API_ACCESS, EntitlementType.ORG_MANAGEMENT]);
      const result = e.reinstate();
      expect(result.isRight()).toBe(true);
      expect(e.status).toBe(EntitlementStatus.ACTIVE);
      expect(e.entitlements).toContain(EntitlementType.API_ACCESS);
      expect(e.entitlements).toContain(EntitlementType.ORG_MANAGEMENT);
    });

    it('returns Left when ACTIVE', () => {
      const e = makeActive();
      const result = e.reinstate();
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when EXPIRED', () => {
      const e = makeExpired();
      const result = e.reinstate();
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });
  });

  // ── expire() ──────────────────────────────────────────────────────────────

  describe('expire()', () => {
    it('transitions ACTIVE → EXPIRED', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const e = makeActive([EntitlementType.API_ACCESS], past);
      const result = e.expire();
      expect(result.isRight()).toBe(true);
      expect(e.status).toBe(EntitlementStatus.EXPIRED);
    });

    it('returns Left when SUSPENDED', () => {
      const e = makeSuspended();
      const result = e.expire();
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });

    it('returns Left when already EXPIRED', () => {
      const e = makeExpired();
      const result = e.expire();
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    });
  });

  // ── grantCapabilities() ───────────────────────────────────────────────────

  describe('grantCapabilities()', () => {
    it('updates ACTIVE entitlement with new capabilities', () => {
      const e = makeActive([EntitlementType.API_ACCESS]);
      e.grantCapabilities([EntitlementType.MULTI_PROFILE, EntitlementType.ORG_MANAGEMENT], null);
      expect(e.status).toBe(EntitlementStatus.ACTIVE);
      expect(e.entitlements).toContain(EntitlementType.MULTI_PROFILE);
      expect(e.entitlements).toContain(EntitlementType.ORG_MANAGEMENT);
      expect(e.entitlements).not.toContain(EntitlementType.API_ACCESS);
    });

    it('resets SUSPENDED to ACTIVE with new capabilities', () => {
      const e = makeSuspended([EntitlementType.API_ACCESS]);
      e.grantCapabilities([EntitlementType.LONG_TERM_PLANS], null);
      expect(e.status).toBe(EntitlementStatus.ACTIVE);
      expect(e.entitlements).toContain(EntitlementType.LONG_TERM_PLANS);
    });

    it('resets EXPIRED to ACTIVE with new capabilities', () => {
      const e = makeExpired();
      e.grantCapabilities([EntitlementType.PRIORITY_PAYOUT], null);
      expect(e.status).toBe(EntitlementStatus.ACTIVE);
      expect(e.entitlements).toContain(EntitlementType.PRIORITY_PAYOUT);
    });

    it('deduplicates capabilities on re-grant', () => {
      const e = makeActive();
      e.grantCapabilities([EntitlementType.API_ACCESS, EntitlementType.API_ACCESS], null);
      expect(e.entitlements.filter((c) => c === EntitlementType.API_ACCESS)).toHaveLength(1);
    });

    it('updates expiresAt', () => {
      const e = makeActive();
      const newExpiry = new Date(Date.now() + 86400_000).toISOString();
      e.grantCapabilities([EntitlementType.API_ACCESS], newExpiry);
      expect(e.expiresAt).toBe(newExpiry);
    });
  });
});
