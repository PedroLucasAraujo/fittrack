import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { Goal } from '../../domain/aggregates/goal.js';
import type { GoalMetricValue } from '../../domain/value-objects/goal-metric.js';

export class InMemoryGoalRepository implements IGoalRepository {
  private goals: Map<string, Goal> = new Map();

  async save(goal: Goal): Promise<void> {
    this.goals.set(goal.id, goal);
  }

  async findById(id: string): Promise<Goal | null> {
    return this.goals.get(id) ?? null;
  }

  async findByClient(clientId: string): Promise<Goal[]> {
    return [...this.goals.values()].filter((g) => g.clientId === clientId);
  }

  async findActiveByClient(clientId: string): Promise<Goal[]> {
    return [...this.goals.values()].filter((g) => g.clientId === clientId && g.isActive());
  }

  async findByProfessional(professionalProfileId: string): Promise<Goal[]> {
    return [...this.goals.values()].filter(
      (g) => g.professionalProfileId === professionalProfileId,
    );
  }

  async findPendingApproval(professionalProfileId: string): Promise<Goal[]> {
    return [...this.goals.values()].filter(
      (g) => g.professionalProfileId === professionalProfileId && g.isDraft(),
    );
  }

  async findActiveGoalsByMetric(clientId: string, metricType: GoalMetricValue): Promise<Goal[]> {
    return [...this.goals.values()].filter(
      (g) => g.clientId === clientId && g.isActive() && g.metricType === metricType,
    );
  }

  async findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<Goal | null> {
    const goal = this.goals.get(id) ?? null;
    if (!goal) return null;
    return goal.professionalProfileId === professionalProfileId ? goal : null;
  }

  /** Test helper: clears all data. */
  clear(): void {
    this.goals.clear();
  }
}
