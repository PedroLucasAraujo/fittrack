import { describe, it, expect, vi } from 'vitest';
import { right, left } from '@fittrack/core';
import { OnExecutionRecorded } from '../../../application/event-handlers/OnExecutionRecorded.js';
import { OnSelfLogRecorded } from '../../../application/event-handlers/OnSelfLogRecorded.js';
import { OnBookingCompleted } from '../../../application/event-handlers/OnBookingCompleted.js';
import { OnGoalProgressUpdated } from '../../../application/event-handlers/OnGoalProgressUpdated.js';
import { InvalidEngagementError } from '../../../domain/errors/InvalidEngagementError.js';
import type { CalculateUserEngagementUseCase } from '../../../application/use-cases/CalculateUserEngagementUseCase.js';

function makeUseCase(succeed = true): CalculateUserEngagementUseCase {
  return {
    execute: vi.fn().mockResolvedValue(
      succeed
        ? right({ engagementId: 'id', userId: 'u', overallScore: 65, engagementLevel: 'HIGH', trend: 'STABLE', trendPercentage: null, isAtRisk: false, calculatedAtUtc: '' })
        : left(new InvalidEngagementError('test error')),
    ),
  } as unknown as CalculateUserEngagementUseCase;
}

const payload = {
  clientId: '550e8400-e29b-41d4-a716-446655440001',
  professionalProfileId: '550e8400-e29b-41d4-a716-446655440010',
};

describe('OnExecutionRecorded', () => {
  it('triggers engagement recalculation on success', async () => {
    const useCase = makeUseCase(true);
    const handler = new OnExecutionRecorded(useCase);
    await handler.handle(payload);
    expect(useCase.execute).toHaveBeenCalledOnce();
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: payload.clientId,
      professionalProfileId: payload.professionalProfileId,
    });
  });

  it('logs error but does not throw on failure', async () => {
    const useCase = makeUseCase(false);
    const handler = new OnExecutionRecorded(useCase);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handler.handle(payload)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});

describe('OnSelfLogRecorded', () => {
  it('triggers engagement recalculation on success', async () => {
    const useCase = makeUseCase(true);
    const handler = new OnSelfLogRecorded(useCase);
    await handler.handle(payload);
    expect(useCase.execute).toHaveBeenCalledOnce();
  });

  it('logs error but does not throw on failure', async () => {
    const useCase = makeUseCase(false);
    const handler = new OnSelfLogRecorded(useCase);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handler.handle(payload)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});

describe('OnBookingCompleted', () => {
  it('triggers engagement recalculation on success', async () => {
    const useCase = makeUseCase(true);
    const handler = new OnBookingCompleted(useCase);
    await handler.handle(payload);
    expect(useCase.execute).toHaveBeenCalledOnce();
  });

  it('logs error but does not throw on failure', async () => {
    const useCase = makeUseCase(false);
    const handler = new OnBookingCompleted(useCase);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handler.handle(payload)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});

describe('OnGoalProgressUpdated', () => {
  it('triggers engagement recalculation on success', async () => {
    const useCase = makeUseCase(true);
    const handler = new OnGoalProgressUpdated(useCase);
    await handler.handle(payload);
    expect(useCase.execute).toHaveBeenCalledOnce();
  });

  it('logs error but does not throw on failure', async () => {
    const useCase = makeUseCase(false);
    const handler = new OnGoalProgressUpdated(useCase);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handler.handle(payload)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});
