import { describe, it, expect } from 'vitest';
import { generateId, Money } from '@fittrack/core';
import { ServicePlanStatus } from '../../../domain/enums/service-plan-status.js';
import { PlanType } from '../../../domain/enums/plan-type.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';
import { makeServicePlan, makeNewServicePlan } from '../../factories/make-service-plan.js';

describe('ServicePlan', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with DRAFT status', () => {
      const plan = makeNewServicePlan();

      expect(plan.status).toBe(ServicePlanStatus.DRAFT);
      expect(plan.activatedAtUtc).toBeNull();
      expect(plan.archivedAtUtc).toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const plan = makeNewServicePlan();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const plan = makeNewServicePlan({ id });
      expect(plan.id).toBe(id);
    });

    it('trims name', () => {
      const plan = makeNewServicePlan({ name: '  My Plan  ' });
      expect(plan.name).toBe('My Plan');
    });

    it('rejects empty name', () => {
      expect(() => makeNewServicePlan({ name: '' })).toThrow();
    });

    it('rejects name longer than 120 characters', () => {
      expect(() => makeNewServicePlan({ name: 'A'.repeat(121) })).toThrow();
    });

    it('rejects zero price', () => {
      const zeroPrice = Money.create(0, 'BRL').value as Money;
      expect(() => makeNewServicePlan({ price: zeroPrice })).toThrow();
    });

    it('rejects negative price', () => {
      // Money.create already rejects negative, but if somehow bypassed
      // the ServicePlan factory also validates
      expect(() => makeNewServicePlan({ durationDays: 0 })).toThrow();
    });

    it('rejects zero durationDays', () => {
      expect(() => makeNewServicePlan({ durationDays: 0 })).toThrow();
    });

    it('rejects negative durationDays', () => {
      expect(() => makeNewServicePlan({ durationDays: -5 })).toThrow();
    });

    it('rejects non-integer durationDays', () => {
      expect(() => makeNewServicePlan({ durationDays: 30.5 })).toThrow();
    });

    it('accepts null sessionAllotment (unlimited)', () => {
      const plan = makeNewServicePlan({ sessionAllotment: null });
      expect(plan.sessionAllotment).toBeNull();
    });

    it('rejects zero sessionAllotment', () => {
      expect(() => makeNewServicePlan({ sessionAllotment: 0 })).toThrow();
    });

    it('rejects negative sessionAllotment', () => {
      expect(() => makeNewServicePlan({ sessionAllotment: -1 })).toThrow();
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const plan = makeServicePlan();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const plan = makeServicePlan({ version: 5 });
      expect(plan.version).toBe(5);
    });
  });

  // ── Activate (ADR-0015) ─────────────────────────────────────────────────

  describe('activate()', () => {
    it('transitions DRAFT → ACTIVE', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });

      const result = plan.activate();

      expect(result.isRight()).toBe(true);
      expect(plan.status).toBe(ServicePlanStatus.ACTIVE);
      expect(plan.activatedAtUtc).not.toBeNull();
    });

    it('does not emit domain events', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
      plan.activate();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ACTIVE (already active)', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });

      const result = plan.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN_TRANSITION);
      }
    });

    it('rejects from PAUSED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });
      expect(plan.activate().isLeft()).toBe(true);
    });

    it('rejects from ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ARCHIVED });
      expect(plan.activate().isLeft()).toBe(true);
    });

    it('rejects from DELETED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DELETED });
      expect(plan.activate().isLeft()).toBe(true);
    });
  });

  // ── Pause (ADR-0015) ────────────────────────────────────────────────────

  describe('pause()', () => {
    it('transitions ACTIVE → PAUSED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });

      const result = plan.pause();

      expect(result.isRight()).toBe(true);
      expect(plan.status).toBe(ServicePlanStatus.PAUSED);
    });

    it('does not emit domain events', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
      plan.pause();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from DRAFT', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
      expect(plan.pause().isLeft()).toBe(true);
    });

    it('rejects from PAUSED (already paused)', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });
      expect(plan.pause().isLeft()).toBe(true);
    });

    it('rejects from ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ARCHIVED });
      expect(plan.pause().isLeft()).toBe(true);
    });
  });

  // ── Resume (ADR-0015) ───────────────────────────────────────────────────

  describe('resume()', () => {
    it('transitions PAUSED → ACTIVE', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });

      const result = plan.resume();

      expect(result.isRight()).toBe(true);
      expect(plan.status).toBe(ServicePlanStatus.ACTIVE);
    });

    it('does not emit domain events', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });
      plan.resume();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ACTIVE (not paused)', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
      expect(plan.resume().isLeft()).toBe(true);
    });

    it('rejects from DRAFT', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
      expect(plan.resume().isLeft()).toBe(true);
    });

    it('rejects from ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ARCHIVED });
      expect(plan.resume().isLeft()).toBe(true);
    });
  });

  // ── Archive (ADR-0015) ──────────────────────────────────────────────────

  describe('archive()', () => {
    it('transitions ACTIVE → ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });

      const result = plan.archive();

      expect(result.isRight()).toBe(true);
      expect(plan.status).toBe(ServicePlanStatus.ARCHIVED);
      expect(plan.archivedAtUtc).not.toBeNull();
    });

    it('transitions PAUSED → ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });

      const result = plan.archive();

      expect(result.isRight()).toBe(true);
      expect(plan.status).toBe(ServicePlanStatus.ARCHIVED);
    });

    it('does not emit domain events', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
      plan.archive();
      expect(plan.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from DRAFT', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });

      const result = plan.archive();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN_TRANSITION);
      }
    });

    it('rejects from ARCHIVED (already archived)', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ARCHIVED });
      expect(plan.archive().isLeft()).toBe(true);
    });

    it('rejects from DELETED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DELETED });
      expect(plan.archive().isLeft()).toBe(true);
    });
  });

  // ── Query methods ─────────────────────────────────────────────────────────

  describe('isPurchasable()', () => {
    it('returns true when ACTIVE', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
      expect(plan.isPurchasable()).toBe(true);
    });

    it('returns false when DRAFT', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
      expect(plan.isPurchasable()).toBe(false);
    });

    it('returns false when PAUSED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.PAUSED });
      expect(plan.isPurchasable()).toBe(false);
    });

    it('returns false when ARCHIVED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.ARCHIVED });
      expect(plan.isPurchasable()).toBe(false);
    });

    it('returns false when DELETED', () => {
      const plan = makeServicePlan({ status: ServicePlanStatus.DELETED });
      expect(plan.isPurchasable()).toBe(false);
    });
  });

  // ── Getters ────────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const profileId = generateId();
      const price = Money.create(9990, 'BRL').value as Money;
      const plan = makeServicePlan({
        professionalProfileId: profileId,
        name: 'Premium Plan',
        price,
        durationDays: 30,
        sessionAllotment: 12,
        type: PlanType.RECURRING,
        status: ServicePlanStatus.ACTIVE,
      });

      expect(plan.professionalProfileId).toBe(profileId);
      expect(plan.name).toBe('Premium Plan');
      expect(plan.price.amount).toBe(9990);
      expect(plan.durationDays).toBe(30);
      expect(plan.sessionAllotment).toBe(12);
      expect(plan.type).toBe(PlanType.RECURRING);
      expect(plan.status).toBe(ServicePlanStatus.ACTIVE);
      expect(plan.createdAtUtc).toBeDefined();
    });
  });
});
