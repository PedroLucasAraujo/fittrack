// ── Input DTOs ────────────────────────────────────────────────────────────────

export interface CreateGoalInputDTO {
  readonly clientId: string;
  readonly professionalProfileId: string;
  /** ID of whoever is creating — clientId (DRAFT) or professionalProfileId (auto-approved). */
  readonly createdBy: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly metricType: string;
  readonly baselineValue: number;
  readonly targetValue: number;
  readonly unit: string;
  readonly priority: string;
  readonly reason?: string;
  /** ISO date string (YYYY-MM-DD). */
  readonly targetDate?: string;
  readonly milestones?: ReadonlyArray<{ readonly name: string; readonly targetValue: number }>;
}

export interface CreateGoalOutputDTO {
  readonly goalId: string;
  readonly autoApproved: boolean;
  readonly riskDetected: boolean;
}

export interface ApproveGoalInputDTO {
  readonly goalId: string;
  readonly professionalProfileId: string;
}

export interface UpdateGoalProgressInputDTO {
  readonly goalId: string;
  readonly newValue: number;
  readonly source: string;
  readonly recordedBy?: string;
  readonly notes?: string;
}

export interface CompleteGoalInputDTO {
  readonly goalId: string;
  readonly achieved: boolean;
  readonly completedBy: string;
}

export interface AbandonGoalInputDTO {
  readonly goalId: string;
  readonly reason: string;
  readonly abandonedBy: string;
}

export interface AdjustGoalTargetInputDTO {
  readonly goalId: string;
  readonly newTargetValue: number;
  readonly reason: string;
  readonly adjustedBy: string;
}

export interface ExtendGoalDeadlineInputDTO {
  readonly goalId: string;
  /** ISO date string (YYYY-MM-DD). */
  readonly newTargetDate: string;
  readonly reason: string;
  readonly extendedBy: string;
}

export interface AddMilestoneInputDTO {
  readonly goalId: string;
  readonly milestoneName: string;
  readonly milestoneTargetValue: number;
  readonly addedBy: string;
}

export interface GetClientGoalsInputDTO {
  readonly clientId: string;
  readonly status?: 'ACTIVE' | 'COMPLETED' | 'DRAFT' | 'ABANDONED' | 'ALL';
}

export interface GetGoalProgressHistoryInputDTO {
  readonly goalId: string;
}

// ── Output DTOs ───────────────────────────────────────────────────────────────

export interface MilestoneDTO {
  readonly milestoneId: string;
  readonly name: string;
  readonly targetValue: number;
  readonly unit: string;
  readonly order: number;
  readonly isReached: boolean;
  readonly reachedAtUtc: string | null;
}

export interface GoalDTO {
  readonly goalId: string;
  readonly clientId: string;
  readonly professionalProfileId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly metricType: string;
  readonly priority: string;
  readonly reason: string | null;
  readonly baselineValue: number;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly unit: string;
  readonly progressPercentage: number;
  readonly targetDate: string | null;
  readonly daysRemaining: number | null;
  readonly status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  readonly isAchieved: boolean;
  readonly milestoneProgress: { reached: number; total: number };
  readonly milestones: MilestoneDTO[];
  readonly createdAtUtc: string;
  readonly approvedAtUtc: string | null;
  readonly startedAtUtc: string | null;
  readonly completedAtUtc: string | null;
  readonly abandonedAtUtc: string | null;
}

export interface ProgressEntryDTO {
  readonly progressEntryId: string;
  readonly value: number;
  readonly unit: string;
  readonly source: string;
  readonly recordedAtUtc: string;
  readonly notes: string | null;
}

export interface AddMilestoneOutputDTO {
  readonly milestoneId: string;
}
