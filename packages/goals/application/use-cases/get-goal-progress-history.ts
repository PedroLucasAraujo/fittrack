import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { GetGoalProgressHistoryInputDTO, ProgressEntryDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class GetGoalProgressHistory {
  constructor(private readonly repo: IGoalRepository) {}

  async execute(dto: GetGoalProgressHistoryInputDTO): Promise<DomainResult<ProgressEntryDTO[]>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    const entries = [...goal.progressEntries].sort(
      (a, b) => a.recordedAtUtc.getTime() - b.recordedAtUtc.getTime(),
    );

    return right(
      entries.map((e) => ({
        progressEntryId: e.id,
        value: e.value,
        unit: e.unit,
        source: e.source,
        recordedAtUtc: e.recordedAtUtc.toISOString(),
        notes: e.notes,
      })),
    );
  }
}
