import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateGoal } from '../../../../application/use-cases/create-goal.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import type { CreateGoalInputDTO } from '../../../../application/dtos/index.js';

function makeDTO(overrides: Partial<CreateGoalInputDTO> = {}): CreateGoalInputDTO {
  const profId = generateId();
  return {
    clientId: generateId(),
    professionalProfileId: profId,
    createdBy: profId,
    name: 'Lose 10kg',
    description: 'Weight loss goal',
    category: 'WEIGHT_LOSS',
    metricType: 'WEIGHT',
    baselineValue: 85,
    targetValue: 75,
    unit: 'kg',
    priority: 'HIGH',
    ...overrides,
  };
}

describe('CreateGoal', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: CreateGoal;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new CreateGoal(repo, publisher);
  });

  it('creates a goal auto-approved when professional creates it', async () => {
    const dto = makeDTO();
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { goalId: string; autoApproved: boolean };
    expect(output.autoApproved).toBe(true);

    const saved = await repo.findById(output.goalId);
    expect(saved).not.toBeNull();
    expect(saved!.isActive()).toBe(true);

    expect(publisher.created).toHaveLength(1);
    expect(publisher.approved).toHaveLength(1);
    expect(publisher.started).toHaveLength(1);
  });

  it('creates a DRAFT goal when client creates it', async () => {
    const clientId = generateId();
    const dto = makeDTO({ clientId, createdBy: clientId });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { autoApproved: boolean };
    expect(output.autoApproved).toBe(false);

    const saved = await repo.findById((result.value as { goalId: string }).goalId);
    expect(saved!.isDraft()).toBe(true);
    expect(publisher.approved).toHaveLength(0);
  });

  it('rejects invalid clientId', async () => {
    const result = await useCase.execute(makeDTO({ clientId: 'not-a-uuid' }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid professionalProfileId', async () => {
    const result = await useCase.execute(
      makeDTO({ professionalProfileId: 'bad-id', createdBy: 'bad-id' }),
    );
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid name', async () => {
    const result = await useCase.execute(makeDTO({ name: 'X' })); // too short
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid category', async () => {
    const result = await useCase.execute(makeDTO({ category: 'INVALID' }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid metric', async () => {
    const result = await useCase.execute(makeDTO({ metricType: 'UNKNOWN' }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid priority', async () => {
    const result = await useCase.execute(makeDTO({ priority: 'ULTRA' }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects malformed targetDate format', async () => {
    const result = await useCase.execute(makeDTO({ targetDate: '31/12/2099' }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects milestones with invalid name in loop', async () => {
    const dto = makeDTO({
      milestones: [{ name: 'X', targetValue: 80 }], // too short
    });
    const result = await useCase.execute(dto);
    expect(result.isLeft()).toBe(true);
  });

  it('rejects milestones out of range in loop', async () => {
    const dto = makeDTO({
      baselineValue: 85,
      targetValue: 75,
      milestones: [{ name: 'Out of bounds', targetValue: 90 }], // above baseline for decreasing goal
    });
    const result = await useCase.execute(dto);
    expect(result.isLeft()).toBe(true);
  });

  it('rejects when baseline equals target', async () => {
    const result = await useCase.execute(makeDTO({ baselineValue: 80, targetValue: 80 }));
    expect(result.isLeft()).toBe(true);
  });

  it('rejects past targetDate', async () => {
    const result = await useCase.execute(makeDTO({ targetDate: '2020-01-01' }));
    expect(result.isLeft()).toBe(true);
  });

  it('adds milestones when provided', async () => {
    const dto = makeDTO({
      milestones: [
        { name: 'First step', targetValue: 82 },
        { name: 'Second step', targetValue: 79 },
      ],
    });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const saved = await repo.findById((result.value as { goalId: string }).goalId);
    expect(saved!.milestones).toHaveLength(2);
  });

  it('detects risk for aggressive weight loss goal and emits GoalRiskDetected', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const targetDate = futureDate.toISOString().slice(0, 10);

    // 20kg loss in 1 month is VERY HIGH risk
    const dto = makeDTO({ baselineValue: 100, targetValue: 80, targetDate });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(true);
    expect(publisher.riskDetected).toHaveLength(1);
  });

  it('no risk for moderate weight loss goal', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const targetDate = futureDate.toISOString().slice(0, 10);

    // 5kg over 6 months ≈ 0.83 kg/month — safe
    const dto = makeDTO({ baselineValue: 85, targetValue: 80, targetDate });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(false);
  });

  it('detects HIGH risk for extreme weight loss with no target date (>30kg)', async () => {
    // 35kg loss with no date → HIGH risk
    const dto = makeDTO({ baselineValue: 120, targetValue: 85 });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(true);
    expect(publisher.riskDetected[0]!.payload.riskLevel).toBe('HIGH');
  });

  it('detects HIGH risk for moderate-aggressive weight loss (4-8 kg/month)', async () => {
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    const targetDate = twoMonthsFromNow.toISOString().slice(0, 10);

    // 10kg in 2 months = 5 kg/month — above safe (4) but below very high (8)
    const dto = makeDTO({ baselineValue: 95, targetValue: 85, targetDate });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(true);
    expect(publisher.riskDetected[0]!.payload.riskLevel).toBe('HIGH');
  });

  it('no risk for non-weight goals', async () => {
    const dto = makeDTO({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 60,
      targetValue: 100,
    });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(false);
  });

  it('no risk for weight gain goal (target > baseline)', async () => {
    // Weight gain — totalLoss <= 0
    const dto = makeDTO({ baselineValue: 70, targetValue: 80 });
    const result = await useCase.execute(dto);
    expect(result.isRight()).toBe(true);
    const output = result.value as { riskDetected: boolean };
    expect(output.riskDetected).toBe(false);
  });
});
