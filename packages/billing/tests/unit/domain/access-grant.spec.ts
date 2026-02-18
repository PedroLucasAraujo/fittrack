import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { AccessGrantStatus } from '../../../domain/enums/access-grant-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';
import { AccessGrantExpiredError } from '../../../domain/errors/access-grant-expired-error.js';
import { AccessGrantSuspendedError } from '../../../domain/errors/access-grant-suspended-error.js';
import { AccessGrantRevokedError } from '../../../domain/errors/access-grant-revoked-error.js';
import { makeAccessGrant, makeNewAccessGrant } from '../../factories/make-access-grant.js';

describe('AccessGrant', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with ACTIVE status', () => {
      const grant = makeNewAccessGrant();

      expect(grant.status).toBe(AccessGrantStatus.ACTIVE);
      expect(grant.sessionsConsumed).toBe(0);
      expect(grant.suspendedAtUtc).toBeNull();
      expect(grant.revokedAtUtc).toBeNull();
      expect(grant.revokedReason).toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const grant = makeNewAccessGrant();
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const grant = makeNewAccessGrant({ id });
      expect(grant.id).toBe(id);
    });

    it('requires transactionId (subscription-first)', () => {
      const transactionId = generateId();
      const grant = makeNewAccessGrant({ transactionId });
      expect(grant.transactionId).toBe(transactionId);
    });

    it('accepts null sessionAllotment (unlimited)', () => {
      const grant = makeNewAccessGrant({ sessionAllotment: null });
      expect(grant.sessionAllotment).toBeNull();
    });

    it('accepts null validUntil (no time limit)', () => {
      const grant = makeNewAccessGrant({ validUntil: null });
      expect(grant.validUntil).toBeNull();
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const grant = makeAccessGrant();
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const grant = makeAccessGrant({ version: 4 });
      expect(grant.version).toBe(4);
    });
  });

  // ── Suspend (ADR-0046 §2) ──────────────────────────────────────────────

  describe('suspend()', () => {
    it('transitions ACTIVE → SUSPENDED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });

      const result = grant.suspend();

      expect(result.isRight()).toBe(true);
      expect(grant.status).toBe(AccessGrantStatus.SUSPENDED);
      expect(grant.suspendedAtUtc).not.toBeNull();
    });

    it('does not emit domain events', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });
      grant.suspend();
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from SUSPENDED (already suspended)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });
      expect(grant.suspend().isLeft()).toBe(true);
    });

    it('rejects from EXPIRED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });

      const result = grant.suspend();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
      }
    });

    it('rejects from REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.suspend().isLeft()).toBe(true);
    });
  });

  // ── Reinstate (ADR-0046 §2) ───────────────────────────────────────────

  describe('reinstate()', () => {
    it('transitions SUSPENDED → ACTIVE', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });

      const result = grant.reinstate();

      expect(result.isRight()).toBe(true);
      expect(grant.status).toBe(AccessGrantStatus.ACTIVE);
      expect(grant.suspendedAtUtc).toBeNull();
    });

    it('does not emit domain events', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });
      grant.reinstate();
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ACTIVE (not suspended)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });
      expect(grant.reinstate().isLeft()).toBe(true);
    });

    it('rejects from EXPIRED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });
      expect(grant.reinstate().isLeft()).toBe(true);
    });

    it('rejects from REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.reinstate().isLeft()).toBe(true);
    });
  });

  // ── Revoke (ADR-0046 §2, ADR-0020) ────────────────────────────────────

  describe('revoke()', () => {
    it('transitions ACTIVE → REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });

      const result = grant.revoke('CHARGEBACK');

      expect(result.isRight()).toBe(true);
      expect(grant.status).toBe(AccessGrantStatus.REVOKED);
      expect(grant.revokedAtUtc).not.toBeNull();
      expect(grant.revokedReason).toBe('CHARGEBACK');
    });

    it('transitions SUSPENDED → REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });

      const result = grant.revoke('Admin action');

      expect(result.isRight()).toBe(true);
      expect(grant.status).toBe(AccessGrantStatus.REVOKED);
      expect(grant.revokedReason).toBe('Admin action');
    });

    it('does not emit domain events', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });
      grant.revoke('CHARGEBACK');
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from EXPIRED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });

      const result = grant.revoke('Too late');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
      }
    });

    it('rejects from REVOKED (already terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.revoke('Double revoke').isLeft()).toBe(true);
    });
  });

  // ── Expire (ADR-0046 §2) ──────────────────────────────────────────────

  describe('expire()', () => {
    it('transitions ACTIVE → EXPIRED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });

      const result = grant.expire();

      expect(result.isRight()).toBe(true);
      expect(grant.status).toBe(AccessGrantStatus.EXPIRED);
    });

    it('does not emit domain events', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });
      grant.expire();
      expect(grant.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from SUSPENDED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });
      expect(grant.expire().isLeft()).toBe(true);
    });

    it('rejects from EXPIRED (already expired)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });
      expect(grant.expire().isLeft()).toBe(true);
    });

    it('rejects from REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.expire().isLeft()).toBe(true);
    });
  });

  // ── ConsumeSession (ADR-0046 §4) ──────────────────────────────────────

  describe('consumeSession()', () => {
    it('increments sessionsConsumed by 1 when ACTIVE', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE, sessionsConsumed: 0 });

      const result = grant.consumeSession();

      expect(result.isRight()).toBe(true);
      expect(grant.sessionsConsumed).toBe(1);
      expect(grant.status).toBe(AccessGrantStatus.ACTIVE);
    });

    it('auto-expires when sessionAllotment is reached', () => {
      const grant = makeAccessGrant({
        status: AccessGrantStatus.ACTIVE,
        sessionAllotment: 3,
        sessionsConsumed: 2,
      });

      const result = grant.consumeSession();

      expect(result.isRight()).toBe(true);
      expect(grant.sessionsConsumed).toBe(3);
      expect(grant.status).toBe(AccessGrantStatus.EXPIRED);
    });

    it('does not auto-expire when allotment not yet reached', () => {
      const grant = makeAccessGrant({
        status: AccessGrantStatus.ACTIVE,
        sessionAllotment: 5,
        sessionsConsumed: 3,
      });

      grant.consumeSession();

      expect(grant.status).toBe(AccessGrantStatus.ACTIVE);
    });

    it('does not auto-expire when sessionAllotment is null (unlimited)', () => {
      const grant = makeAccessGrant({
        status: AccessGrantStatus.ACTIVE,
        sessionAllotment: null,
        sessionsConsumed: 999,
      });

      grant.consumeSession();

      expect(grant.status).toBe(AccessGrantStatus.ACTIVE);
    });

    it('rejects when SUSPENDED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });

      const result = grant.consumeSession();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
      }
    });

    it('rejects when EXPIRED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });
      expect(grant.consumeSession().isLeft()).toBe(true);
    });

    it('rejects when REVOKED (terminal)', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.consumeSession().isLeft()).toBe(true);
    });
  });

  // ── Query methods ──────────────────────────────────────────────────────

  describe('isValid()', () => {
    it('returns true when ACTIVE', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.ACTIVE });
      expect(grant.isValid()).toBe(true);
    });

    it('returns false when SUSPENDED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.SUSPENDED });
      expect(grant.isValid()).toBe(false);
    });

    it('returns false when EXPIRED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.EXPIRED });
      expect(grant.isValid()).toBe(false);
    });

    it('returns false when REVOKED', () => {
      const grant = makeAccessGrant({ status: AccessGrantStatus.REVOKED });
      expect(grant.isValid()).toBe(false);
    });
  });

  describe('hasSessionsRemaining()', () => {
    it('returns true when sessionAllotment is null (unlimited)', () => {
      const grant = makeAccessGrant({ sessionAllotment: null });
      expect(grant.hasSessionsRemaining()).toBe(true);
    });

    it('returns true when consumed < allotment', () => {
      const grant = makeAccessGrant({
        sessionAllotment: 12,
        sessionsConsumed: 5,
      });
      expect(grant.hasSessionsRemaining()).toBe(true);
    });

    it('returns false when consumed >= allotment', () => {
      const grant = makeAccessGrant({
        sessionAllotment: 12,
        sessionsConsumed: 12,
      });
      expect(grant.hasSessionsRemaining()).toBe(false);
    });

    it('returns false when consumed > allotment', () => {
      const grant = makeAccessGrant({
        sessionAllotment: 10,
        sessionsConsumed: 11,
      });
      expect(grant.hasSessionsRemaining()).toBe(false);
    });
  });

  // ── Getters ────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const clientId = generateId();
      const profileId = generateId();
      const planId = generateId();
      const transactionId = generateId();

      const grant = makeAccessGrant({
        clientId,
        professionalProfileId: profileId,
        servicePlanId: planId,
        transactionId,
        sessionAllotment: 12,
        sessionsConsumed: 3,
      });

      expect(grant.clientId).toBe(clientId);
      expect(grant.professionalProfileId).toBe(profileId);
      expect(grant.servicePlanId).toBe(planId);
      expect(grant.transactionId).toBe(transactionId);
      expect(grant.sessionAllotment).toBe(12);
      expect(grant.sessionsConsumed).toBe(3);
      expect(grant.validFrom).toBeDefined();
      expect(grant.createdAtUtc).toBeDefined();
    });
  });
});

// ── AccessGrant state error classes (ADR-0046 §3) ─────────────────────────────

describe('AccessGrantExpiredError', () => {
  it('has the correct error code and message', () => {
    const id = generateId();
    const err = new AccessGrantExpiredError(id);
    expect(err.code).toBe(BillingErrorCodes.ACCESS_GRANT_EXPIRED);
    expect(err.message).toContain(id);
  });
});

describe('AccessGrantSuspendedError', () => {
  it('has the correct error code and message', () => {
    const id = generateId();
    const err = new AccessGrantSuspendedError(id);
    expect(err.code).toBe(BillingErrorCodes.ACCESS_GRANT_SUSPENDED);
    expect(err.message).toContain(id);
  });
});

describe('AccessGrantRevokedError', () => {
  it('has the correct error code and message', () => {
    const id = generateId();
    const err = new AccessGrantRevokedError(id);
    expect(err.code).toBe(BillingErrorCodes.ACCESS_GRANT_REVOKED);
    expect(err.message).toContain(id);
  });
});
