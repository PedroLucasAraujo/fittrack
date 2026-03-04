import { describe, it, expect, beforeEach, vi } from 'vitest';
import { left, right, generateId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { InvalidEntitlementTransitionError } from '../../../domain/errors/invalid-entitlement-transition-error.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import type { IPlatformEntitlementRepository } from '../../../domain/repositories/platform-entitlement-repository.js';
import type { ExpireEntitlement } from '../../../application/use-cases/expire-entitlement.js';
import { ExpirePlatformEntitlementsJob } from '../../../jobs/ExpirePlatformEntitlementsJob.js';
import { JobResult } from '../../../shared/jobs/JobResult.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEntitlement(): PlatformEntitlement {
  return PlatformEntitlement.create(
    generateId(),
    generateId(),
    [EntitlementType.API_ACCESS],
    new Date(Date.now() - 1000).toISOString(), // expired 1s ago
    new Date().toISOString(),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ExpirePlatformEntitlementsJob', () => {
  let mockRepo: IPlatformEntitlementRepository;
  let mockUseCase: ExpireEntitlement;
  let job: ExpirePlatformEntitlementsJob;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByProfessionalProfileId: vi.fn(),
      save: vi.fn(),
      findExpiredEntitlements: vi.fn(),
    };

    mockUseCase = {
      execute: vi.fn(),
    } as unknown as ExpireEntitlement;

    job = new ExpirePlatformEntitlementsJob(mockRepo, mockUseCase);
  });

  // ── Metadata ───────────────────────────────────────────────────────────────

  describe('name', () => {
    it('should have descriptive name', () => {
      expect(job.name).toBe('ExpirePlatformEntitlements');
    });
  });

  describe('schedule', () => {
    it('should be configured for daily execution at midnight UTC', () => {
      expect(job.schedule).toBe('0 0 * * *');
    });
  });

  // ── execute ────────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('succeeds with zero counts when no expired entitlements found', async () => {
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue([]);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toMatchObject({ processed: 0, succeeded: 0, failed: 0 });
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('passes current UTC ISO string to repository query (ADR-0010)', async () => {
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue([]);
      const before = new Date().toISOString();

      await job.execute();

      const after = new Date().toISOString();
      const calledWith = vi.mocked(mockRepo.findExpiredEntitlements).mock.calls[0]![0]!;
      expect(typeof calledWith).toBe('string');
      expect(calledWith >= before).toBe(true);
      expect(calledWith <= after).toBe(true);
    });

    it('processes all expired entitlements through UseCase', async () => {
      const entitlements = [makeEntitlement(), makeEntitlement(), makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      vi.mocked(mockUseCase.execute).mockResolvedValue(right(undefined) as DomainResult<void>);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toMatchObject({ processed: 3, succeeded: 3, failed: 0 });
      expect(mockUseCase.execute).toHaveBeenCalledTimes(3);
    });

    it('calls UseCase with correct entitlementId and professionalProfileId', async () => {
      const ent1 = makeEntitlement();
      const ent2 = makeEntitlement();
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue([ent1, ent2]);
      vi.mocked(mockUseCase.execute).mockResolvedValue(right(undefined) as DomainResult<void>);

      await job.execute();

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        entitlementId: ent1.id,
        professionalProfileId: ent1.professionalProfileId,
      });
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        entitlementId: ent2.id,
        professionalProfileId: ent2.professionalProfileId,
      });
    });

    it('handles partial UseCase failures gracefully', async () => {
      const entitlements = [makeEntitlement(), makeEntitlement(), makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      const domainError = new InvalidEntitlementTransitionError('UseCase failed', {});
      vi.mocked(mockUseCase.execute)
        .mockResolvedValueOnce(right(undefined) as DomainResult<void>)
        .mockResolvedValueOnce(left(domainError) as DomainResult<void>)
        .mockResolvedValueOnce(right(undefined) as DomainResult<void>);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toMatchObject({ processed: 3, succeeded: 2, failed: 1 });
      expect(result.data!['failures']).toHaveLength(1);
    });

    it('failure details contain errorCode and error message, not entity IDs (ADR-0037)', async () => {
      const ent = makeEntitlement();
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue([ent]);
      const domainError = new InvalidEntitlementTransitionError('Cannot expire: already EXPIRED.', {
        code: PlatformErrorCodes.INVALID_TRANSITION,
      });
      vi.mocked(mockUseCase.execute).mockResolvedValue(left(domainError) as DomainResult<void>);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
      expect(failures).toHaveLength(1);
      // No entity IDs in failure details (ADR-0037 §4)
      expect(Object.keys(failures[0]!)).not.toContain('entitlementId');
      expect(Object.keys(failures[0]!)).not.toContain('professionalProfileId');
      expect(failures[0]!.error).toContain('Cannot expire');
    });

    it('handles UseCase promise rejections gracefully', async () => {
      const entitlements = [makeEntitlement(), makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      vi.mocked(mockUseCase.execute)
        .mockResolvedValueOnce(right(undefined) as DomainResult<void>)
        .mockRejectedValueOnce(new Error('Unexpected infrastructure error'));

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toMatchObject({ processed: 2, succeeded: 1, failed: 1 });
      const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
      expect(failures[0]!.errorCode).toBe('INFRASTRUCTURE_ERROR');
      expect(failures[0]!.error).toContain('Unexpected infrastructure error');
    });

    it('result data includes no failures key when all succeed', async () => {
      const entitlements = [makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      vi.mocked(mockUseCase.execute).mockResolvedValue(right(undefined) as DomainResult<void>);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.data).not.toHaveProperty('failures');
    });

    it('result data includes UTC ISO timestamp when entitlements are processed', async () => {
      const entitlements = [makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      vi.mocked(mockUseCase.execute).mockResolvedValue(right(undefined) as DomainResult<void>);

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      const ts = result.data!['timestamp'] as string;
      expect(typeof ts).toBe('string');
      expect(new Date(ts).getTime()).not.toBeNaN();
    });

    it('all 3 UseCase failures are reported in failures array', async () => {
      const entitlements = [makeEntitlement(), makeEntitlement(), makeEntitlement()];
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue(entitlements);
      const err = new InvalidEntitlementTransitionError('fail', {});
      vi.mocked(mockUseCase.execute).mockResolvedValue(left(err) as DomainResult<void>);

      const result = await job.execute();

      expect(result.data).toMatchObject({ processed: 3, succeeded: 0, failed: 3 });
      const failures = result.data!['failures'] as unknown[];
      expect(failures).toHaveLength(3);
    });

    it('returns JobResult.failure when repository throws (S4)', async () => {
      vi.mocked(mockRepo.findExpiredEntitlements).mockRejectedValue(
        new Error('Database connection lost'),
      );

      const result = await job.execute();

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toContain('Database connection lost');
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('wraps non-Error repository throws in a proper Error', async () => {
      vi.mocked(mockRepo.findExpiredEntitlements).mockRejectedValue('plain string error');

      const result = await job.execute();

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toContain('Repository error');
    });

    it('falls back to DOMAIN_ERROR code when Left value has no code property', async () => {
      const ent = makeEntitlement();
      vi.mocked(mockRepo.findExpiredEntitlements).mockResolvedValue([ent]);
      // Simulate a Left value whose error object has no `code` property
      const errorWithoutCode = { message: 'some error without code' } as unknown as Error;
      vi.mocked(mockUseCase.execute).mockResolvedValue(
        left(errorWithoutCode) as unknown as DomainResult<void>,
      );

      const result = await job.execute();

      expect(result.isSuccess).toBe(true);
      const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
      expect(failures[0]!.errorCode).toBe('DOMAIN_ERROR');
    });
  });
});

// ── JobResult ─────────────────────────────────────────────────────────────────

describe('JobResult', () => {
  it('success() returns isSuccess=true with data', () => {
    const result = JobResult.success({ count: 5 });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ count: 5 });
    expect(result.error).toBeUndefined();
  });

  it('success() without data returns isSuccess=true', () => {
    const result = JobResult.success();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('failure() returns isSuccess=false with error', () => {
    const err = new Error('something went wrong');
    const result = JobResult.failure(err);
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe(err);
    expect(result.data).toBeUndefined();
  });
});
