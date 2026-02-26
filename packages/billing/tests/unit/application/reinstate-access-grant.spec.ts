import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ReinstateAccessGrant } from '../../../application/use-cases/reinstate-access-grant.js';
import { InMemoryAccessGrantRepository } from '../../repositories/in-memory-access-grant-repository.js';
import { InMemoryBillingEventPublisherStub } from '../../stubs/in-memory-billing-event-publisher-stub.js';
import { makeAccessGrant } from '../../factories/make-access-grant.js';
import { AccessGrantStatus } from '../../../domain/enums/access-grant-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';
import { ErrorCodes } from '@fittrack/core';

describe('ReinstateAccessGrant', () => {
  let accessGrantRepository: InMemoryAccessGrantRepository;
  let eventPublisher: InMemoryBillingEventPublisherStub;
  let sut: ReinstateAccessGrant;
  let professionalProfileId: string;

  beforeEach(() => {
    accessGrantRepository = new InMemoryAccessGrantRepository();
    eventPublisher = new InMemoryBillingEventPublisherStub();
    sut = new ReinstateAccessGrant(accessGrantRepository, eventPublisher);
    professionalProfileId = generateId();
  });

  it('reinstates a SUSPENDED grant back to ACTIVE', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.SUSPENDED,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({
      accessGrantId: grant.id,
      professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.accessGrantId).toBe(grant.id);
      expect(result.value.accessGrantStatus).toBe(AccessGrantStatus.ACTIVE);
    }
    expect(accessGrantRepository.items[0]!.status).toBe(AccessGrantStatus.ACTIVE);
  });

  it('returns NOT_FOUND when grant does not exist', async () => {
    const result = await sut.execute({
      accessGrantId: generateId(),
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.ACCESS_GRANT_NOT_FOUND);
    }
  });

  it('returns NOT_FOUND for cross-tenant grant (tenant isolation — ADR-0025)', async () => {
    const grant = makeAccessGrant({
      professionalProfileId: generateId(), // different tenant
      status: AccessGrantStatus.SUSPENDED,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({
      accessGrantId: grant.id,
      professionalProfileId, // caller's tenant
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.ACCESS_GRANT_NOT_FOUND);
    }
  });

  it('returns error when grant is ACTIVE (not suspended)', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.ACTIVE,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({
      accessGrantId: grant.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
    }
  });

  it('returns error when grant is EXPIRED (terminal)', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.EXPIRED,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({
      accessGrantId: grant.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
    }
  });

  it('returns error when grant is REVOKED (terminal)', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.REVOKED,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({
      accessGrantId: grant.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_ACCESS_GRANT_TRANSITION);
    }
  });

  it('returns error for invalid accessGrantId UUID', async () => {
    const result = await sut.execute({
      accessGrantId: 'not-a-uuid',
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('publishes AccessGrantReinstated event on success', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.SUSPENDED,
    });
    accessGrantRepository.items.push(grant);

    await sut.execute({ accessGrantId: grant.id, professionalProfileId });

    expect(eventPublisher.publishedAccessGrantReinstated).toHaveLength(1);
    expect(eventPublisher.publishedAccessGrantReinstated[0]!.aggregateId).toBe(grant.id);
  });

  it('does not publish event when grant is not found', async () => {
    await sut.execute({ accessGrantId: generateId(), professionalProfileId });

    expect(eventPublisher.publishedAccessGrantReinstated).toHaveLength(0);
  });

  it('does not publish event when transition fails', async () => {
    const grant = makeAccessGrant({
      professionalProfileId,
      status: AccessGrantStatus.ACTIVE,
    });
    accessGrantRepository.items.push(grant);

    await sut.execute({ accessGrantId: grant.id, professionalProfileId });

    expect(eventPublisher.publishedAccessGrantReinstated).toHaveLength(0);
  });
});
