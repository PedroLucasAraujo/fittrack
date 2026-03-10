import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateChallengeUseCase } from '../../../../application/use-cases/create-challenge-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    createdBy: generateId(),
    type: 'COMMUNITY',
    visibility: 'PUBLIC',
    name: 'My Challenge',
    description: 'A valid description for this challenge that is long enough.',
    category: 'WORKOUT',
    goalMetricType: 'WORKOUT_COUNT',
    goalTargetValue: 20,
    startDateUtc: new Date(Date.now() + 1000),
    endDateUtc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    rewardPolicy: 'WINNER',
    maxParticipants: null,
    ...overrides,
  } as Parameters<CreateChallengeUseCase['execute']>[0];
}

describe('CreateChallengeUseCase', () => {
  let repo: InMemoryChallengeRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let useCase: CreateChallengeUseCase;

  beforeEach(() => {
    repo = new InMemoryChallengeRepository();
    publisher = new InMemoryChallengesEventPublisher();
    useCase = new CreateChallengeUseCase(repo, publisher);
  });

  it('creates a challenge with valid input and saves it', async () => {
    const result = await useCase.execute(makeValidInput());
    expect(result.isRight()).toBe(true);
    expect(result.value.challengeId).toBeDefined();
    expect(repo.items).toHaveLength(1);
  });

  it('publishes ChallengeCreatedEvent on success', async () => {
    await useCase.execute(makeValidInput());
    expect(publisher.createdEvents).toHaveLength(1);
    expect(publisher.createdEvents[0]!.payload.goalMetricType).toBe('WORKOUT_COUNT');
  });

  it('does NOT auto-start when startDate is in the future', async () => {
    await useCase.execute(makeValidInput({ startDateUtc: new Date(Date.now() + 60_000) }));
    expect(publisher.startedEvents).toHaveLength(0);
    expect(repo.items[0]!.startedAtUtc).toBeNull();
  });

  it('auto-starts challenge when startDate is in the past', async () => {
    const result = await useCase.execute(
      makeValidInput({ startDateUtc: new Date(Date.now() - 1000) }),
    );
    expect(result.isRight()).toBe(true);
    expect(publisher.startedEvents).toHaveLength(1);
    expect(repo.items[0]!.startedAtUtc).not.toBeNull();
  });

  it('auto-starts challenge when startDate equals now (boundary)', async () => {
    // startDate <= new Date() triggers auto-start
    const now = new Date();
    const result = await useCase.execute(
      makeValidInput({
        startDateUtc: now,
        endDateUtc: new Date(now.getTime() + 1000),
      }),
    );
    expect(result.isRight()).toBe(true);
    expect(publisher.startedEvents).toHaveLength(1);
  });

  it('fails with InvalidCreatorIdError for invalid createdBy UUID', async () => {
    const result = await useCase.execute(makeValidInput({ createdBy: 'not-a-uuid' }));
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toBeDefined();
  });

  it('fails with InvalidChallengeTypeError for invalid type', async () => {
    const result = await useCase.execute(makeValidInput({ type: 'INVALID_TYPE' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidVisibilityError for invalid visibility', async () => {
    const result = await useCase.execute(makeValidInput({ visibility: 'HIDDEN' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidChallengeNameError when name is too short (< 3 chars)', async () => {
    const result = await useCase.execute(makeValidInput({ name: 'AB' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidChallengeNameError when name is too long (> 100 chars)', async () => {
    const result = await useCase.execute(makeValidInput({ name: 'A'.repeat(101) }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidChallengeDescriptionError when description is too short (< 10 chars)', async () => {
    const result = await useCase.execute(makeValidInput({ description: 'Short' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidChallengeDescriptionError when description is too long (> 1000 chars)', async () => {
    const result = await useCase.execute(makeValidInput({ description: 'A'.repeat(1001) }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidCategoryError for invalid category', async () => {
    const result = await useCase.execute(makeValidInput({ category: 'YOGA' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidMetricTypeError for invalid goalMetricType', async () => {
    const result = await useCase.execute(makeValidInput({ goalMetricType: 'STEPS' }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidGoalTargetError when goalTargetValue is 0', async () => {
    const result = await useCase.execute(makeValidInput({ goalTargetValue: 0 }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidGoalTargetError when goalTargetValue is 10001', async () => {
    const result = await useCase.execute(makeValidInput({ goalTargetValue: 10001 }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidGoalTargetError when goalTargetValue is not an integer', async () => {
    const result = await useCase.execute(makeValidInput({ goalTargetValue: 5.5 }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidDurationError when startDate >= endDate (equal)', async () => {
    const now = new Date();
    const result = await useCase.execute(makeValidInput({ startDateUtc: now, endDateUtc: now }));
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidDurationError when startDate is after endDate', async () => {
    const result = await useCase.execute(
      makeValidInput({
        startDateUtc: new Date(Date.now() + 2000),
        endDateUtc: new Date(Date.now() + 1000),
      }),
    );
    expect(result.isLeft()).toBe(true);
  });

  it('fails with InvalidRewardPolicyError for invalid rewardPolicy', async () => {
    const result = await useCase.execute(makeValidInput({ rewardPolicy: 'EVERYBODY' }));
    expect(result.isLeft()).toBe(true);
  });

  it('enforces maxParticipants=1 for INDIVIDUAL type regardless of input', async () => {
    const result = await useCase.execute(
      makeValidInput({
        type: 'INDIVIDUAL',
        visibility: 'PRIVATE',
        name: 'Solo Challenge',
        description: 'Individual personal challenge description.',
        startDateUtc: new Date(Date.now() + 1000),
        endDateUtc: new Date(Date.now() + 86_400_000),
        maxParticipants: 99, // ignored — overridden to 1
      }),
    );
    expect(result.isRight()).toBe(true);
    expect(repo.items[0]!.maxParticipants).toBe(1);
  });

  it('enforces maxParticipants=2 for HEAD_TO_HEAD type', async () => {
    const result = await useCase.execute(
      makeValidInput({
        type: 'HEAD_TO_HEAD',
        startDateUtc: new Date(Date.now() + 1000),
        endDateUtc: new Date(Date.now() + 86_400_000),
        maxParticipants: 50, // ignored — overridden to 2
      }),
    );
    expect(result.isRight()).toBe(true);
    expect(repo.items[0]!.maxParticipants).toBe(2);
  });

  it('trims whitespace from name before saving', async () => {
    await useCase.execute(makeValidInput({ name: '  My Challenge  ' }));
    expect(repo.items[0]!.name).toBe('My Challenge');
  });

  it('trims whitespace from description before saving', async () => {
    await useCase.execute(makeValidInput({ description: '  A valid description here.  ' }));
    expect(repo.items[0]!.description).toBe('A valid description here.');
  });

  it('stores ChallengeCreatedEvent payload with the correct maxParticipants after type override', async () => {
    await useCase.execute(
      makeValidInput({
        type: 'INDIVIDUAL',
        visibility: 'PRIVATE',
        name: 'Solo',
        description: 'Solo challenge desc.',
      }),
    );
    expect(publisher.createdEvents[0]!.payload.maxParticipants).toBe(1);
  });

  it('returns right with challengeId on success', async () => {
    const result = await useCase.execute(makeValidInput());
    expect(result.isRight()).toBe(true);
    expect(typeof result.value.challengeId).toBe('string');
    expect(result.value.challengeId).toHaveLength(36); // UUID length
  });
});
