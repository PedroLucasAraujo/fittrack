import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { RiskStatus } from '../../../domain/enums/risk-status.js';
import { PersonName } from '../../../domain/value-objects/person-name.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';
import {
  makeProfessionalProfile,
  makeNewProfessionalProfile,
} from '../../factories/make-professional-profile.js';

describe('ProfessionalProfile', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with PENDING_APPROVAL status and NORMAL riskStatus', () => {
      const profile = makeNewProfessionalProfile();

      expect(profile.status).toBe(ProfessionalProfileStatus.PENDING_APPROVAL);
      expect(profile.riskStatus).toBe(RiskStatus.NORMAL);
      expect(profile.bannedAtUtc).toBeNull();
      expect(profile.bannedReason).toBeNull();
      expect(profile.deactivatedAtUtc).toBeNull();
      expect(profile.closedAtUtc).toBeNull();
      expect(profile.closedReason).toBeNull();
      expect(profile.suspendedAtUtc).toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeNewProfessionalProfile();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const profile = makeNewProfessionalProfile({ id });
      expect(profile.id).toBe(id);
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const profile = makeProfessionalProfile();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const profile = makeProfessionalProfile({ version: 3 });
      expect(profile.version).toBe(3);
    });
  });

  // ── Approve (ADR-0008) ────────────────────────────────────────────────────

  describe('approve()', () => {
    it('transitions PENDING_APPROVAL → ACTIVE', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });

      const result = profile.approve();

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.ACTIVE);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });
      profile.approve();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ACTIVE (invalid transition)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });

      const result = profile.approve();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PROFILE_TRANSITION);
      }
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.approve().isLeft()).toBe(true);
    });

    it('rejects from DEACTIVATED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      expect(profile.approve().isLeft()).toBe(true);
    });

    it('rejects from CLOSED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.approve().isLeft()).toBe(true);
    });
  });

  // ── Suspend (ADR-0008) ────────────────────────────────────────────────────

  describe('suspend()', () => {
    it('transitions ACTIVE → SUSPENDED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });

      const result = profile.suspend();

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.SUSPENDED);
      expect(profile.suspendedAtUtc).not.toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      profile.suspend();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from PENDING_APPROVAL', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });
      expect(profile.suspend().isLeft()).toBe(true);
    });

    it('rejects from SUSPENDED (already suspended)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });
      expect(profile.suspend().isLeft()).toBe(true);
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.suspend().isLeft()).toBe(true);
    });

    it('rejects from CLOSED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.suspend().isLeft()).toBe(true);
    });
  });

  // ── Reactivate (ADR-0008) ────────────────────────────────────────────────

  describe('reactivate()', () => {
    it('transitions SUSPENDED → ACTIVE', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });

      const result = profile.reactivate();

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.ACTIVE);
      expect(profile.suspendedAtUtc).toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });
      profile.reactivate();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ACTIVE', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      expect(profile.reactivate().isLeft()).toBe(true);
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.reactivate().isLeft()).toBe(true);
    });

    it('rejects from CLOSED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.reactivate().isLeft()).toBe(true);
    });
  });

  // ── Ban (ADR-0008, ADR-0022) ─────────────────────────────────────────────

  describe('ban()', () => {
    it('transitions ACTIVE → BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });

      const result = profile.ban('Confirmed fraud');

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
      expect(profile.riskStatus).toBe(RiskStatus.BANNED);
      expect(profile.bannedAtUtc).not.toBeNull();
      expect(profile.bannedReason).toBe('Confirmed fraud');
    });

    it('transitions SUSPENDED → BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });

      const result = profile.ban('Escalation from watchlist');
      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
    });

    it('transitions PENDING_APPROVAL → BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });

      const result = profile.ban('Fraudulent registration');
      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.NORMAL,
      });
      profile.ban('Violation');
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('forces riskStatus to BANNED even when already BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.BANNED,
      });
      profile.ban('Admin action');
      expect(profile.riskStatus).toBe(RiskStatus.BANNED);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
    });

    it('rejects from BANNED (already terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });

      const result = profile.ban('Double ban');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PROFILE_TRANSITION);
      }
    });

    it('rejects from DEACTIVATED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.DEACTIVATED,
      });

      const result = profile.ban('After closure');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects from CLOSED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });

      const result = profile.ban('After close');
      expect(result.isLeft()).toBe(true);
    });
  });

  // ── Deactivate (ADR-0008) ────────────────────────────────────────────────

  describe('deactivate()', () => {
    it('transitions ACTIVE → DEACTIVATED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });

      const result = profile.deactivate();

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.DEACTIVATED);
      expect(profile.deactivatedAtUtc).not.toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      profile.deactivate();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from SUSPENDED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });
      expect(profile.deactivate().isLeft()).toBe(true);
    });

    it('rejects from PENDING_APPROVAL', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });
      expect(profile.deactivate().isLeft()).toBe(true);
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.deactivate().isLeft()).toBe(true);
    });

    it('rejects from DEACTIVATED (already terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      expect(profile.deactivate().isLeft()).toBe(true);
    });

    it('rejects from CLOSED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.deactivate().isLeft()).toBe(true);
    });
  });

  // ── Close (ADR-0008, ADR-0013 Extension) ──────────────────────────────

  describe('close()', () => {
    it('transitions ACTIVE → CLOSED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });

      const result = profile.close('Trial expired');

      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.CLOSED);
      expect(profile.closedAtUtc).not.toBeNull();
      expect(profile.closedReason).toBe('Trial expired');
    });

    it('transitions SUSPENDED → CLOSED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });

      const result = profile.close('Administrative closure');
      expect(result.isRight()).toBe(true);
      expect(profile.status).toBe(ProfessionalProfileStatus.CLOSED);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      profile.close('Account termination');
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from PENDING_APPROVAL', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.PENDING_APPROVAL,
      });
      expect(profile.close('Too early').isLeft()).toBe(true);
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.close('After ban').isLeft()).toBe(true);
    });

    it('rejects from DEACTIVATED (terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      expect(profile.close('After deactivation').isLeft()).toBe(true);
    });

    it('rejects from CLOSED (already terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });

      const result = profile.close('Double close');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PROFILE_TRANSITION);
      }
    });
  });

  // ── RiskStatus: escalateToWatchlist (ADR-0022) ────────────────────────────

  describe('escalateToWatchlist()', () => {
    it('transitions NORMAL → WATCHLIST', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
      });

      const result = profile.escalateToWatchlist();

      expect(result.isRight()).toBe(true);
      expect(profile.riskStatus).toBe(RiskStatus.WATCHLIST);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
      });
      profile.escalateToWatchlist();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from WATCHLIST (already there)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.WATCHLIST,
      });
      const result = profile.escalateToWatchlist();
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_RISK_STATUS_TRANSITION);
      }
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.escalateToWatchlist().isLeft()).toBe(true);
    });
  });

  // ── RiskStatus: escalateToBanned (ADR-0022) ──────────────────────────────

  describe('escalateToBanned()', () => {
    it('transitions NORMAL risk → BANNED and also bans profile', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.NORMAL,
      });

      const result = profile.escalateToBanned('Confirmed fraud');

      expect(result.isRight()).toBe(true);
      expect(profile.riskStatus).toBe(RiskStatus.BANNED);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
    });

    it('transitions WATCHLIST risk → BANNED and also bans profile', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.WATCHLIST,
      });

      const result = profile.escalateToBanned('Escalation');

      expect(result.isRight()).toBe(true);
      expect(profile.riskStatus).toBe(RiskStatus.BANNED);
      expect(profile.status).toBe(ProfessionalProfileStatus.BANNED);
    });

    it('rejects from BANNED risk (already terminal)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
        riskStatus: RiskStatus.BANNED,
      });

      const result = profile.escalateToBanned('Re-ban');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_RISK_STATUS_TRANSITION);
      }
    });
  });

  // ── RiskStatus: resolveRisk (ADR-0022) ───────────────────────────────────

  describe('resolveRisk()', () => {
    it('transitions WATCHLIST → NORMAL', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.WATCHLIST,
      });

      const result = profile.resolveRisk();

      expect(result.isRight()).toBe(true);
      expect(profile.riskStatus).toBe(RiskStatus.NORMAL);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.WATCHLIST,
      });
      profile.resolveRisk();
      expect(profile.getDomainEvents()).toHaveLength(0);
    });

    it('does not change profile status (SUSPENDED stays SUSPENDED)', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
        riskStatus: RiskStatus.WATCHLIST,
      });

      profile.resolveRisk();
      expect(profile.status).toBe(ProfessionalProfileStatus.SUSPENDED);
      expect(profile.riskStatus).toBe(RiskStatus.NORMAL);
    });

    it('rejects from NORMAL (nothing to resolve)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
      });
      expect(profile.resolveRisk().isLeft()).toBe(true);
    });

    it('rejects from BANNED (terminal)', () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.resolveRisk().isLeft()).toBe(true);
    });
  });

  // ── Query methods ────────────────────────────────────────────────────────

  describe('isOperational()', () => {
    it('returns true when ACTIVE and NORMAL risk', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.NORMAL,
      });
      expect(profile.isOperational()).toBe(true);
    });

    it('returns true when ACTIVE and WATCHLIST risk', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.WATCHLIST,
      });
      expect(profile.isOperational()).toBe(true);
    });

    it('returns false when ACTIVE but BANNED risk', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.BANNED,
      });
      expect(profile.isOperational()).toBe(false);
    });

    it('returns false when SUSPENDED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
        riskStatus: RiskStatus.NORMAL,
      });
      expect(profile.isOperational()).toBe(false);
    });

    it('returns false when BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
        riskStatus: RiskStatus.BANNED,
      });
      expect(profile.isOperational()).toBe(false);
    });

    it('returns false when CLOSED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
        riskStatus: RiskStatus.NORMAL,
      });
      expect(profile.isOperational()).toBe(false);
    });
  });

  describe('canAcceptNewSales()', () => {
    it('returns true only when ACTIVE and NORMAL risk', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.NORMAL,
      });
      expect(profile.canAcceptNewSales()).toBe(true);
    });

    it('returns false when ACTIVE but WATCHLIST risk', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.WATCHLIST,
      });
      expect(profile.canAcceptNewSales()).toBe(false);
    });

    it('returns false when SUSPENDED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.SUSPENDED,
      });
      expect(profile.canAcceptNewSales()).toBe(false);
    });

    it('returns false when CLOSED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.canAcceptNewSales()).toBe(false);
    });
  });

  describe('isBanned()', () => {
    it('returns true when BANNED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.BANNED,
      });
      expect(profile.isBanned()).toBe(true);
    });

    it('returns false when ACTIVE', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      expect(profile.isBanned()).toBe(false);
    });
  });

  describe('isClosed()', () => {
    it('returns true when CLOSED', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.CLOSED,
      });
      expect(profile.isClosed()).toBe(true);
    });

    it('returns false when ACTIVE', () => {
      const profile = makeProfessionalProfile({
        status: ProfessionalProfileStatus.ACTIVE,
      });
      expect(profile.isClosed()).toBe(false);
    });
  });

  // ── Getters ──────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const displayName = PersonName.create('Dr. Smith').value as PersonName;
      const userId = generateId();

      const profile = makeProfessionalProfile({
        userId,
        displayName,
        status: ProfessionalProfileStatus.ACTIVE,
        riskStatus: RiskStatus.NORMAL,
      });

      expect(profile.userId).toBe(userId);
      expect(profile.displayName.value).toBe('Dr. Smith');
      expect(profile.status).toBe(ProfessionalProfileStatus.ACTIVE);
      expect(profile.riskStatus).toBe(RiskStatus.NORMAL);
      expect(profile.createdAtUtc).toBeDefined();
      expect(profile.bannedAtUtc).toBeNull();
      expect(profile.bannedReason).toBeNull();
      expect(profile.deactivatedAtUtc).toBeNull();
      expect(profile.closedAtUtc).toBeNull();
      expect(profile.closedReason).toBeNull();
      expect(profile.suspendedAtUtc).toBeNull();
    });
  });
});
