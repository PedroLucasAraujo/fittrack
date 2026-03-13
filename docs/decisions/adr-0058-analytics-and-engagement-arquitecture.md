# ADR-0069: Analytics and Engagement Architecture

**Status:** Proposed  
**Date:** 2026-03-12  
**Deciders:** Architecture Team  
**Related ADRs:**

- ADR-0005: Bounded Context Isolation via Anti-Corruption Layers
- ADR-0022: Timestamp-Based State Over Terminal Enums
- ADR-0047: UseCase-Only Event Dispatching
- ADR-0054: Aggregated Metrics System
- ADR-0066: Streak Tracking and Habit Formation

---

## Context

FitTrack currently has multiple domain modules that capture user activities:

- **Execution**: Workout completions, volume lifted
- **Self-Log**: Nutrition tracking, water intake
- **Scheduling**: Bookings, session attendance
- **Goals**: Progress tracking
- **Gamification**: Streaks, achievements, challenges

However, there is **no unified system** to:

1. **Aggregate user engagement** across all activities (workouts + nutrition + bookings + goals)
2. **Detect churn risk** (inactive users, declining engagement)
3. **Present dashboards** showing engagement trends to clients and professionals
4. **Calculate platform-level metrics** (DAU, WAU, MAU, retention)

### Current State Audit

**Metrics Module (ADR-0054):**

- ✅ Calculates workout-specific metrics: `WEEKLY_VOLUME`, `EXECUTION_COUNT`
- ❌ Does NOT aggregate activities beyond workouts (no nutrition, bookings, goals)
- ❌ Does NOT track user inactivity or engagement scores
- **Scope:** Workout domain-specific, immutable snapshots

**Gamification Module (ADR-0066):**

- ✅ Manages `StreakTracker` for consecutive activity days (gameplay)
- ✅ Achievements and Challenges
- ❌ Does NOT calculate overall engagement scores
- ❌ Does NOT track user activity beyond streak gameplay
- **Scope:** Gameplay mechanics, not behavioral analytics

**Ledger Module:**

- ✅ Financial transactions only (`REVENUE`, `PLATFORM_FEE`, `REFUND`)
- ❌ NOT an event store for user activities
- **Scope:** Financial domain only

**Gap:** No module owns **cross-module activity aggregation**, **engagement scoring**, or **churn detection**.

---

## Decision

We will create **two new modules** with distinct responsibilities:

### 1. **Engagement Module** (Bounded Context - Write Side)

**Responsibility:**

- Aggregate user activities from multiple modules (Execution, Self-Log, Scheduling, Goals, Gamification)
- Calculate multi-dimensional engagement scores (workout frequency, habit consistency, goal progress, streak)
- Detect behavioral patterns (churn risk, improvement trends)
- Emit domain events (`EngagementScoreCalculatedEvent`, `UserDisengagedEvent`, `EngagementImprovedEvent`)
- Store engagement snapshots (weekly) and historical data

**Key Characteristics:**

- **Analytical Bounded Context:** Aggregates are materialized views (recalculable, not event-sourced)
- **Event-Driven:** Consumes events from other modules, does NOT query them directly
- **Anti-Corruption Layer:** Uses `IEngagementDataQueryService` to isolate from other modules (ADR-0005)
- **Mutable:** Engagement scores can be recalculated (unlike Metrics which are immutable per ADR-0054)

### 2. **Analytics Module** (Read Models - Query Side / CQRS)

**Responsibility:**

- Present dashboards (client personal dashboard, professional client overview, admin platform metrics)
- Calculate platform-level KPIs (DAU, WAU, MAU, retention cohorts)
- Provide optimized read-only queries (no aggregates, only projections)
- Maintain denormalized tables for fast dashboard rendering

**Key Characteristics:**

- **CQRS Read Side:** Consumes `EngagementScoreCalculatedEvent` and other activity events
- **Projections:** Event handlers populate denormalized read models
- **No Business Logic:** Pure data presentation layer
- **Performance-Optimized:** Pre-calculated views, cached queries

---

## Architecture

### Module Boundaries

```
┌─────────────────────────────────────────────────┐
│          ANALYTICS (Read Models)                │
│  - Dashboards (Cliente, Prof, Admin)            │
│  - Platform Metrics (DAU/WAU/MAU)              │
│  - Queries read-only                            │
└─────────────────────────────────────────────────┘
                     ↑ consumes events
┌─────────────────────────────────────────────────┐
│          ENGAGEMENT (Bounded Context)           │
│  - UserEngagement aggregate                     │
│  - Score calculation (multi-dimensional)        │
│  - Churn risk detection                         │
│  - Events: UserDisengaged, EngagementImproved  │
└─────────────────────────────────────────────────┘
                     ↑ aggregates via ACL
┌─────────────────────────────────────────────────┐
│    DOMAIN MODULES (Execution, Self-Log, etc)   │
│  - WorkoutExecutionCompleted                    │
│  - NutritionLogCreated                          │
│  - BookingCompleted                             │
│  - StreakIncremented (from Gamification)       │
└─────────────────────────────────────────────────┘
```

### Data Flow

**1. Activity Occurs (Write):**

```
Client completes workout
  ↓
ExecutionModule.CompleteWorkoutExecutionUseCase
  ↓
WorkoutExecution.complete()
  ↓
WorkoutExecutionCompletedEvent emitted
```

**2. Engagement Updates (Event-Driven):**

```
WorkoutExecutionCompletedEvent
  ↓
Engagement.OnWorkoutExecutionCompleted handler
  ↓
Increments workoutsCompleted counter
  ↓
Awaits daily job for score recalculation
```

**3. Daily Job Recalculates Scores:**

```
CalculateAllEngagementScoresJob (00:00 UTC)
  ↓
For each active user:
  ↓
  CalculateUserEngagementUseCase.execute()
  ↓
  IEngagementDataQueryService queries:
    - getWorkoutsInWindow(7d) → 3 workouts
    - getNutritionLogsInWindow(7d) → 5 logs
    - getCurrentStreak() → 12 days (from Gamification)
    - getGoalsOnTrackCount() → 1/2 goals
  ↓
  Calculates scores:
    - workoutScore = 75 (3/4 target * 100)
    - habitScore = 71 (5/7 days * 100)
    - goalProgressScore = 50 (1/2 goals * 100)
    - streakScore = 40 (12/30 target * 100)
    - overallScore = 65 (weighted: 40% workout + 25% habit + 20% goal + 15% streak)
  ↓
  UserEngagement.updateScores()
  ↓
  EngagementScoreCalculatedEvent emitted
  ↓
  If score < 20 AND 7+ days inactive:
    UserDisengagedEvent emitted (churn risk)
```

**4. Analytics Projects (Read):**

```
EngagementScoreCalculatedEvent
  ↓
Analytics.UserEngagementProjection handler
  ↓
Updates user_engagement_dashboard (denormalized table)
  ↓
Dashboard query returns instantly
```

---

## Engagement Module Design

### Aggregate: UserEngagement

```typescript
UserEngagement (Aggregate Root)
  - engagementId: EngagementId
  - userId: UserId

  // Scores by dimension (last 7 days)
  - workoutScore: WorkoutScore (0-100, based on frequency vs target)
  - habitScore: HabitScore (0-100, nutrition log consistency)
  - goalProgressScore: GoalProgressScore (0-100, % goals on track)
  - streakScore: StreakScore (0-100, consecutive activity days)

  // Overall score (weighted average)
  - overallScore: OverallEngagementScore (0-100)
  - engagementLevel: EngagementLevel (VERY_HIGH | HIGH | MEDIUM | LOW | VERY_LOW)

  // Trend (vs previous week)
  - trend: EngagementTrend (IMPROVING | STABLE | DECLINING)
  - trendPercentage: number (e.g., +15%, -20%)

  // Raw metrics (last 7 days)
  - workoutsCompleted: number
  - nutritionLogsCreated: number
  - bookingsAttended: number
  - currentStreak: number
  - activeGoalsCount: number

  // Metadata
  - calculatedAt: CalculatedTimestamp
  - windowStartDate: Date
  - windowEndDate: Date

  // Churn risk
  - isAtRisk: boolean (very low engagement + inactive)
  - riskDetectedAt: RiskDetectedTimestamp | null
```

**Methods:**

```typescript
+ updateScores(scores: ScoreUpdate): Either<DomainError, void>
+ detectChurnRisk(): boolean
+ calculateTrend(previousWeekScore: number): EngagementTrend
+ isActive(): boolean // has recent activity
```

**Invariants:**

- Scores are 0-100 (capped)
- Engagement level derived from overallScore (deterministic mapping)
- Trend calculated only if previous week data exists
- Churn risk = (engagementLevel === VERY_LOW) AND (daysInactive >= 7)

### Entity: EngagementHistory

```typescript
EngagementHistory (Entity - immutable snapshots)
  - historyId: EngagementHistoryId
  - userId: UserId
  - weekStartDate: Date
  - weekEndDate: Date
  - scoresSnapshot: EngagementScoresSnapshot (all scores frozen)
  - createdAt: Date
```

**Purpose:** Store weekly snapshots for trend analysis and historical graphs.

### Anti-Corruption Layer (ADR-0005)

**Domain Interface:**

```typescript
interface IEngagementDataQueryService {
  // From Execution
  getWorkoutsInWindow(
    userId: UserId,
    startDate: Date,
    endDate: Date,
  ): Promise<Either<QueryError, number>>;

  // From Self-Log
  getNutritionLogsInWindow(
    userId: UserId,
    startDate: Date,
    endDate: Date,
  ): Promise<Either<QueryError, number>>;
  getDaysWithNutritionLog(userId: UserId, windowDays: number): Promise<Either<QueryError, number>>;

  // From Scheduling
  getBookingsAttendedInWindow(
    userId: UserId,
    startDate: Date,
    endDate: Date,
  ): Promise<Either<QueryError, number>>;

  // From Gamification (StreakTracker - ADR-0066)
  getCurrentStreak(userId: UserId): Promise<Either<QueryError, number>>;

  // From Goals
  getActiveGoalsCount(userId: UserId): Promise<Either<QueryError, number>>;
  getGoalsOnTrackCount(userId: UserId): Promise<Either<QueryError, number>>;

  // From Metrics (ADR-0054)
  getLatestWeeklyVolume(userId: UserId): Promise<Either<QueryError, number>>;
}
```

**Infrastructure Implementation:**

```typescript
class EngagementDataQueryService implements IEngagementDataQueryService {
  constructor(
    private executionRepo: IWorkoutExecutionRepository,
    private nutritionLogRepo: INutritionLogRepository,
    private bookingRepo: IBookingRepository,
    private streakRepo: IStreakTrackerRepository, // Gamification
    private goalRepo: IGoalRepository,
    private metricsRepo: IWeeklyVolumeMetricRepository, // Metrics
  ) {}

  async getWorkoutsInWindow(userId, startDate, endDate) {
    const executions = await this.executionRepo.findByUserInWindow(userId, startDate, endDate);
    return right(executions.length);
  }

  async getCurrentStreak(userId) {
    // Consumes StreakTracker from Gamification (does NOT duplicate logic)
    const tracker = await this.streakRepo.findByUserId(userId);
    return right(tracker?.currentStreak.value || 0);
  }

  // ... other queries
}
```

**Rationale:**

- ✅ Engagement domain does NOT depend on concrete implementations of other modules
- ✅ Infrastructure layer can query multiple bounded contexts safely
- ✅ Does NOT violate ADR-0005 (cross-module queries isolated to infrastructure)

### Domain Events

```typescript
EngagementScoreCalculatedEvent
  - userId: string
  - overallScore: number
  - engagementLevel: string
  - trend: string
  - workoutScore: number
  - habitScore: number
  - goalProgressScore: number
  - streakScore: number
  - calculatedAt: Date
  - occurredAt: Date

UserDisengagedEvent (churn risk detected)
  - userId: string
  - engagementLevel: "VERY_LOW"
  - overallScore: number
  - daysInactive: number
  - lastActivityDate: Date
  - detectedAt: Date
  - occurredAt: Date

EngagementImprovedEvent (motivational trigger)
  - userId: string
  - previousScore: number
  - currentScore: number
  - improvement: number (percentage)
  - trend: "IMPROVING"
  - detectedAt: Date
  - occurredAt: Date
```

**Consumers:**

- `UserDisengagedEvent` → Notification service (alert professional, email client)
- `EngagementImprovedEvent` → Achievements module (unlock "Comeback Kid" badge)
- `EngagementScoreCalculatedEvent` → Analytics projections (update dashboards)

### Score Calculation (Weighted)

**Overall Score Formula:**

```typescript
overallScore =
  workoutScore * 0.4 + // Workouts are most important (40%)
  habitScore * 0.25 + // Nutrition habits (25%)
  goalProgressScore * 0.2 + // Goal progress (20%)
  streakScore * 0.15; // Consistency streak (15%)
```

**Individual Score Calculations:**

**WorkoutScore (0-100):**

```typescript
targetWorkoutsPerWeek = 4; // Configurable (global or per-client)
workoutsCompleted = 3; // Last 7 days

workoutScore = Math.min((workoutsCompleted / targetWorkoutsPerWeek) * 100, 100);
// Example: 3/4 * 100 = 75
// Capped at 100 (if 5 workouts, score = 100, not 125)
```

**HabitScore (0-100):**

```typescript
daysWithNutritionLog = 5; // Last 7 days

habitScore = (daysWithNutritionLog / 7) * 100;
// Example: 5/7 * 100 = 71.4 ≈ 71
```

**GoalProgressScore (0-100):**

```typescript
activeGoals = 2;
goalsOnTrack = 1; // Progress >= expected

goalProgressScore = (goalsOnTrack / activeGoals) * 100;
// Example: 1/2 * 100 = 50
// If no active goals → score = 100 (does not penalize)
```

**StreakScore (0-100):**

```typescript
currentStreak = 12 days
targetStreak = 30 days // Configurable

streakScore = Math.min((currentStreak / targetStreak) * 100, 100)
// Example: 12/30 * 100 = 40
```

### Engagement Levels (Thresholds)

```typescript
EngagementLevel (derived from overallScore)
  - VERY_HIGH: score >= 80
  - HIGH: score >= 60
  - MEDIUM: score >= 40
  - LOW: score >= 20
  - VERY_LOW: score < 20
```

### Trend Detection

```typescript
EngagementTrend (weekly comparison)
  currentWeekScore = 65
  previousWeekScore = 50
  change = +15 points
  changePercentage = +30%

  trend =
    if change >= +10 → IMPROVING
    if change <= -10 → DECLINING
    else → STABLE
```

### Churn Risk Detection

**Rules:**

```typescript
UserDisengaged (churn risk) if:
  1. engagementLevel === VERY_LOW (score < 20)
  AND
  2. daysInactive >= 7 (no activity in 7+ days)
  AND
  3. trend === DECLINING (getting worse)

OR

  1. currentStreak === 0 (streak broken)
  AND
  2. previousStreak >= 30 (had long streak, lost momentum)
```

**Actions on UserDisengagedEvent:**

- Notify professional (email + in-app notification)
- _(Post-MVP: Email re-engagement to client, suggest easy challenge)_

---

## Analytics Module Design

### Read Models (Denormalized Tables)

**user_engagement_dashboard:**

```sql
CREATE TABLE user_engagement_dashboard (
  user_id UUID PRIMARY KEY,
  overall_score INTEGER NOT NULL,
  engagement_level VARCHAR(20) NOT NULL,
  trend VARCHAR(20) NOT NULL,
  trend_percentage DECIMAL(5,2),

  workout_score INTEGER NOT NULL,
  habit_score INTEGER NOT NULL,
  goal_progress_score INTEGER NOT NULL,
  streak_score INTEGER NOT NULL,

  workouts_completed INTEGER NOT NULL,
  nutrition_logs_created INTEGER NOT NULL,
  bookings_attended INTEGER NOT NULL,
  current_streak INTEGER NOT NULL,

  window_start_date DATE NOT NULL,
  window_end_date DATE NOT NULL,
  calculated_at TIMESTAMP NOT NULL,

  is_at_risk BOOLEAN NOT NULL DEFAULT FALSE,
  days_inactive INTEGER
);

CREATE INDEX idx_engagement_dashboard_level ON user_engagement_dashboard (engagement_level);
CREATE INDEX idx_engagement_dashboard_at_risk ON user_engagement_dashboard (is_at_risk) WHERE is_at_risk = TRUE;
```

**professional_clients_dashboard:**

```sql
CREATE TABLE professional_clients_dashboard (
  professional_profile_id UUID NOT NULL,
  client_id UUID NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  engagement_score INTEGER NOT NULL,
  engagement_level VARCHAR(20) NOT NULL,
  trend VARCHAR(20) NOT NULL,
  trend_percentage DECIMAL(5,2),
  is_at_risk BOOLEAN NOT NULL,
  days_inactive INTEGER,
  last_activity_date DATE,
  calculated_at TIMESTAMP NOT NULL,

  PRIMARY KEY (professional_profile_id, client_id)
);

CREATE INDEX idx_prof_clients_at_risk ON professional_clients_dashboard (professional_profile_id, is_at_risk) WHERE is_at_risk = TRUE;
CREATE INDEX idx_prof_clients_score ON professional_clients_dashboard (professional_profile_id, engagement_score DESC);
```

**platform_metrics:**

```sql
CREATE TABLE platform_metrics (
  metric_date DATE PRIMARY KEY,
  daily_active_users INTEGER NOT NULL,
  weekly_active_users INTEGER NOT NULL,
  monthly_active_users INTEGER NOT NULL,
  average_engagement_score DECIMAL(5,2),
  very_high_count INTEGER NOT NULL,
  high_count INTEGER NOT NULL,
  medium_count INTEGER NOT NULL,
  low_count INTEGER NOT NULL,
  very_low_count INTEGER NOT NULL,
  at_risk_count INTEGER NOT NULL,
  calculated_at TIMESTAMP NOT NULL
);
```

### Projections (Event Handlers)

**UserEngagementProjection:**

```typescript
class UserEngagementProjection {
  async handle(event: EngagementScoreCalculatedEvent) {
    // Update user_engagement_dashboard table (upsert)
    await this.db.upsert('user_engagement_dashboard', {
      user_id: event.userId,
      overall_score: event.overallScore,
      engagement_level: event.engagementLevel,
      trend: event.trend,
      workout_score: event.workoutScore,
      // ... all other fields
      calculated_at: event.calculatedAt,
    });
  }

  async handle(event: UserDisengagedEvent) {
    // Mark user as at_risk in dashboard
    await this.db.update('user_engagement_dashboard', {
      user_id: event.userId,
      is_at_risk: true,
      days_inactive: event.daysInactive,
    });
  }
}
```

**PlatformMetricsProjection:**

```typescript
class PlatformMetricsProjection {
  async handle(event: WorkoutExecutionCompletedEvent | NutritionLogCreatedEvent | ...) {
    // Track daily active users (unique set per day)
    await this.redis.sadd(`dau:${today}`, event.userId)

    // Weekly/Monthly active users (rolling windows)
    await this.redis.sadd(`wau:${isoWeek}`, event.userId)
    await this.redis.sadd(`mau:${month}`, event.userId)
  }

  async calculateDailyMetrics() {
    // Daily job aggregates metrics
    const dau = await this.redis.scard(`dau:${today}`)
    const wau = await this.redis.scard(`wau:${isoWeek}`)
    const mau = await this.redis.scard(`mau:${month}`)

    const avgScore = await this.db.query(
      'SELECT AVG(overall_score) FROM user_engagement_dashboard'
    )

    await this.db.insert('platform_metrics', {
      metric_date: today,
      daily_active_users: dau,
      weekly_active_users: wau,
      monthly_active_users: mau,
      average_engagement_score: avgScore,
      // ... engagement level counts
    })
  }
}
```

### Queries (Use Cases)

**GetUserEngagementDashboardQuery:**

```typescript
Input: { userId: string }

Output: {
  currentScore: 68,
  level: "HIGH",
  trend: "IMPROVING",
  trendPercentage: +12,
  scores: {
    workout: 75,
    habit: 71,
    goalProgress: 50,
    streak: 40
  },
  activities: {
    workoutsCompleted: 3,
    nutritionLogsCreated: 5,
    bookingsAttended: 2,
    currentStreak: 12
  },
  insights: [
    "Great work! You trained 3x this week (+50% vs last week)",
    "Keep going for 18 more days to reach 30-day streak milestone!"
  ]
}
```

**GetProfessionalClientEngagementQuery:**

```typescript
Input: {
  professionalProfileId: string,
  filter?: "AT_RISK" | "HIGH_PERFORMERS" | "ALL"
}

Output: {
  clients: [
    {
      clientId: "...",
      name: "João",
      engagementScore: 72,
      level: "HIGH",
      trend: "IMPROVING",
      trendPercentage: +5,
      isAtRisk: false,
      daysInactive: 0
    },
    {
      clientId: "...",
      name: "Maria",
      engagementScore: 18,
      level: "VERY_LOW",
      trend: "DECLINING",
      trendPercentage: -15,
      isAtRisk: true,
      daysInactive: 10
    }
  ],
  averageEngagement: 58,
  atRiskCount: 1,
  highPerformersCount: 2
}
```

**GetPlatformMetricsQuery:**

```typescript
Input: { date?: Date } // default: today

Output: {
  date: "2026-03-12",
  dailyActiveUsers: 1247,
  weeklyActiveUsers: 3892,
  monthlyActiveUsers: 12453,
  averageEngagementScore: 58.3,
  engagementDistribution: {
    veryHigh: 234,
    high: 567,
    medium: 892,
    low: 341,
    veryLow: 213
  },
  atRiskUsers: 213
}
```

---

## Jobs and Scheduled Tasks

### CalculateAllEngagementScoresJob

**Schedule:** Daily at 00:00 UTC  
**Purpose:** Recalculate engagement scores for all active users

```typescript
class CalculateAllEngagementScoresJob {
  async execute() {
    const activeUsers = await this.userRepo.findActive(); // Has activity in last 90 days

    for (const user of activeUsers) {
      await this.calculateEngagementUseCase.execute({
        userId: user.userId.toString(),
      });
    }

    // After all users calculated, run platform metrics aggregation
    await this.platformMetricsProjection.calculateDailyMetrics();
  }
}
```

**Performance Consideration:**

- Process in batches of 1000 users
- Estimated: 10k active users = 10 batches = ~5 minutes total
- Can be parallelized if needed

---

## Relationship with Existing Modules

### Metrics Module (ADR-0054)

**Metrics:**

- Calculates `WEEKLY_VOLUME`, `EXECUTION_COUNT` (workout-specific)
- Immutable snapshots (event-sourced)
- Domain-specific calculations

**Engagement:**

- Consumes Metrics via `IEngagementDataQueryService.getLatestWeeklyVolume()`
- Does NOT duplicate Metrics calculations
- Aggregates Metrics + other modules for engagement score

**Relationship:** Engagement **depends on** Metrics (via ACL).

### Gamification Module (ADR-0066)

**Gamification:**

- Manages `StreakTracker` (consecutive activity days, gameplay)
- Achievements, Challenges
- Emits `StreakIncrementedEvent`, `StreakBrokenEvent`

**Engagement:**

- Consumes `StreakIncrementedEvent` to update `currentStreak` counter
- Queries `IEngagementDataQueryService.getCurrentStreak()` for score calculation
- Does NOT duplicate streak logic (reuses Gamification's StreakTracker)

**Relationship:** Engagement **consumes events** from Gamification.

### Other Domain Modules

**Execution:**

- Emits `WorkoutExecutionCompletedEvent`
- Engagement listens and increments `workoutsCompleted`

**Self-Log:**

- Emits `NutritionLogCreatedEvent`
- Engagement listens and increments `nutritionLogsCreated`

**Scheduling:**

- Emits `BookingCompletedEvent`
- Engagement listens and increments `bookingsAttended`

**Goals:**

- Emits `GoalProgressUpdatedEvent`
- Engagement queries `getGoalsOnTrackCount()` for score

**All:** Engagement is a **pure consumer**, never modifies other bounded contexts.

---

## Dashboard Views (UI Layer)

### Client Dashboard

**Widgets (MVP):**

1. Overall Engagement Score (gauge 0-100)

   - Current score: 68
   - Trend: +12% vs last week (IMPROVING)
   - Badge: "HIGH Engagement"

2. Scores by Dimension (mini gauges)

   - Workout: 75/100
   - Habits: 71/100
   - Goal Progress: 50/100
   - Streak: 40/100

3. Activities This Week (counters)

   - 3 workouts completed
   - 5 nutrition logs
   - 2 bookings attended
   - 12 day streak

4. Insights & Recommendations
   - "Great work! You trained 3x this week (+50% vs last week)"
   - "Your streak is growing. Keep going for 18 more days to hit 30-day milestone!"
   - "You didn't log nutrition for 2 days. Maintain consistency!"

**Post-MVP:**

- Benchmark comparison ("You're in top 30% of users")
- Historical graph (last 8 weeks trend)

### Professional Dashboard

**Widgets (MVP):**

1. Client List (table)

   - Name | Engagement Score | Trend | Status
   - João | 72 | +5% ↑ | HIGH
   - Maria | 18 | -15% ↓ | VERY_LOW (alert!)
   - Pedro | 45 | 0% → | MEDIUM

2. Clients at Risk (filter: VERY_LOW + LOW)

   - 3 clients with engagement < 40
   - Days inactive, last activity date

3. Average Engagement (all clients)

   - Average: 58
   - Trend: +3% vs last month

4. Top Performers (VERY_HIGH clients)
   - 5 clients with score >= 80

**Post-MVP:**

- Correlation: Engagement vs Goals Achieved
- Drill-down: Click client → see detailed engagement breakdown

### Admin Dashboard (Post-MVP)

**Widgets:**

1. Platform Metrics

   - DAU: 1,247
   - WAU: 3,892
   - MAU: 12,453
   - Average Engagement: 58.3

2. Engagement Distribution (pie chart)

   - Very High: 234 (18.8%)
   - High: 567 (45.5%)
   - Medium: 892 (71.6%)
   - Low: 341 (27.4%)
   - Very Low: 213 (17.1%)

3. At-Risk Users

   - 213 users with VERY_LOW engagement
   - Churn risk alert

4. Professional Comparison
   - Top 10 professionals by average client engagement
   - Worst 10 (need support/training)

---

## Performance Considerations

### Query Optimization

**Problem:** Engagement queries multiple modules (Execution, Self-Log, Scheduling, Goals, Metrics, Gamification).

**Solution:**

1. **Anti-Corruption Layer** isolates queries to infrastructure
2. **Denormalized Read Models** in Analytics (pre-calculated, instant reads)
3. **Event-Driven Updates** (incremental, not full recalc on every activity)
4. **Daily Batch Job** (recalculate scores once per day, not real-time)

### Caching Strategy

**Redis Cache:**

```typescript
// Cache engagement dashboard data (TTL: 24h)
key: `engagement:dashboard:${userId}`;
value: UserEngagementDashboardDTO(JSON);

// Invalidate on EngagementScoreCalculatedEvent
// Re-populate from user_engagement_dashboard table
```

**Database Indices:**

```sql
-- Engagement queries
CREATE INDEX idx_user_engagement_user ON user_engagement (user_id);
CREATE INDEX idx_user_engagement_level ON user_engagement (engagement_level);
CREATE INDEX idx_user_engagement_at_risk ON user_engagement (is_at_risk) WHERE is_at_risk = TRUE;

-- Professional dashboard
CREATE INDEX idx_prof_clients_prof ON professional_clients_dashboard (professional_profile_id);
CREATE INDEX idx_prof_clients_at_risk ON professional_clients_dashboard (professional_profile_id, is_at_risk) WHERE is_at_risk = TRUE;

-- Platform metrics
CREATE INDEX idx_platform_metrics_date ON platform_metrics (metric_date DESC);
```

### Scalability

**Current Design (10k active users):**

- Daily job: ~5 minutes (1000 users/batch)
- Dashboard queries: <100ms (denormalized tables)
- Event handlers: <10ms per event (increment counters)

**Future Scaling (100k+ users):**

- Partition `user_engagement` by date range (rolling 90 days)
- Horizontal scaling: Shard by `userId` hash
- Move daily job to distributed queue (Bull, SQS)
- Read replicas for Analytics queries

---

## Migration Strategy

### Phase 1: Engagement Module (Core)

1. Create Engagement bounded context
2. Implement `UserEngagement` aggregate
3. Implement Anti-Corruption Layer (`IEngagementDataQueryService`)
4. Add event handlers (listen to Execution, Self-Log, Scheduling, Gamification)
5. Create daily job (`CalculateAllEngagementScoresJob`)
6. Emit `EngagementScoreCalculatedEvent`, `UserDisengagedEvent`

**Validation:**

- Calculate engagement scores for 100 test users
- Verify churn risk detection (simulate 7+ days inactivity)
- Confirm no duplicate logic with Metrics/Gamification

### Phase 2: Analytics Module (Dashboards)

1. Create Analytics read models (denormalized tables)
2. Implement projections (populate from events)
3. Create queries (GetUserEngagementDashboard, GetProfessionalClientEngagement)
4. Build UI components (client dashboard, professional dashboard)

**Validation:**

- Dashboard loads in <100ms
- Real-time updates on EngagementScoreCalculatedEvent
- Professional sees at-risk clients correctly

### Phase 3: Platform Metrics (DAU/WAU/MAU)

1. Add PlatformMetricsProjection (track active users)
2. Create platform_metrics read model
3. Implement GetPlatformMetricsQuery
4. Build admin dashboard (post-MVP)

**Validation:**

- DAU/WAU/MAU counts match expected values
- Retention cohorts calculated correctly

### Backward Compatibility

**No Breaking Changes:**

- Engagement is a new bounded context (does not modify existing modules)
- All integrations via events (loose coupling)
- Existing modules (Metrics, Gamification) continue unchanged

---

## Alternatives Considered

### Alternative 1: Expand Metrics Module

**Pros:**

- Reuses existing metrics infrastructure
- No new module

**Cons:**

- ❌ Violates Single Responsibility Principle (Metrics becomes "everything analytics")
- ❌ Couples workout-specific logic with general engagement
- ❌ Conflicts with ADR-0054 (Metrics are immutable, Engagement is mutable/recalculable)

**Rejected:** Metrics should remain domain-specific (workout metrics only).

### Alternative 2: Only Read Models (No Engagement Bounded Context)

**Pros:**

- Simpler architecture (just queries)
- No new aggregates

**Cons:**

- ❌ No place to emit `UserDisengagedEvent` (churn detection requires business logic)
- ❌ Score calculation scattered across read model projections (not DDD-friendly)
- ❌ No aggregate to enforce engagement rules (e.g., score caps, trend thresholds)

**Rejected:** Engagement has business logic (churn detection, score rules) that belongs in a bounded context.

### Alternative 3: Put Everything in Gamification

**Pros:**

- Gamification already has StreakTracker

**Cons:**

- ❌ Gamification is gameplay (achievements, challenges), not analytics
- ❌ Engagement is behavioral analytics, different domain concern
- ❌ Would bloat Gamification with responsibilities outside its scope

**Rejected:** Gamification and Engagement are distinct domains.

---

## Consequences

### Positive

✅ **Unified Engagement Tracking:** Single source of truth for user activity aggregation across all modules

✅ **Churn Detection:** Proactive identification of at-risk users (enables intervention by professionals)

✅ **Separation of Concerns:**

- Metrics = workout-specific (unchanged)
- Gamification = gameplay (unchanged)
- Engagement = cross-module analytics (new)
- Analytics = dashboards (new)

✅ **CQRS Benefits:** Write (Engagement) and Read (Analytics) optimized independently

✅ **ADR Compliance:**

- ADR-0005: Anti-Corruption Layer isolates cross-module queries
- ADR-0022: Timestamps (`isAtRisk`, `calculatedAt`) instead of status enums
- ADR-0047: Events dispatched by UseCases only
- ADR-0054: Does NOT duplicate Metrics (consumes via ACL)
- ADR-0066: Does NOT duplicate StreakTracker (consumes via ACL)

✅ **Scalable:** Event-driven incremental updates + daily batch job + denormalized read models

✅ **Extensible:** Easy to add new dimensions (e.g., sleep tracking, water intake) to engagement score

### Negative

⚠️ **Complexity:** Two new modules (Engagement + Analytics) add architectural overhead

⚠️ **Cross-Module Dependencies:** Engagement queries 6+ modules (mitigated by ACL)

⚠️ **Eventual Consistency:** Dashboard data may lag by up to 24h (daily job recalculation)

⚠️ **Maintenance:** Score formula weights (40% workout, 25% habit, etc.) need periodic tuning based on data

### Risks and Mitigations

**Risk 1: Performance degradation on daily job**

- **Mitigation:** Batch processing (1000 users/batch), parallelization if needed
- **Monitoring:** Job duration alert if >10 minutes

**Risk 2: ACL becomes bottleneck (queries 6+ modules)**

- **Mitigation:** Cache query results (Redis, TTL 1h), denormalize frequently accessed data
- **Monitoring:** Track query latency per module

**Risk 3: Score formula not representative of actual engagement**

- **Mitigation:** A/B test weights, analyze correlation with retention/churn
- **Iteration:** Make weights configurable (professional can override per client in post-MVP)

---

## Implementation Checklist

### Engagement Module

- [ ] Create `UserEngagement` aggregate (scores, trend, churn risk)
- [ ] Create `EngagementHistory` entity (weekly snapshots)
- [ ] Implement `IEngagementDataQueryService` interface (domain)
- [ ] Implement `EngagementDataQueryService` (infrastructure, ACL)
- [ ] Add event handlers: `OnWorkoutExecutionCompleted`, `OnNutritionLogCreated`, `OnStreakIncremented`, `OnBookingCompleted`
- [ ] Create `CalculateUserEngagementUseCase` (calculate scores, detect churn)
- [ ] Create `CalculateAllEngagementScoresJob` (daily 00:00 UTC)
- [ ] Emit events: `EngagementScoreCalculatedEvent`, `UserDisengagedEvent`, `EngagementImprovedEvent`
- [ ] Add tests: Score calculation (all 4 dimensions), trend detection, churn risk logic
- [ ] Coverage: ≥90%

### Analytics Module

- [ ] Create denormalized tables: `user_engagement_dashboard`, `professional_clients_dashboard`, `platform_metrics`
- [ ] Implement `UserEngagementProjection` (populate dashboard on events)
- [ ] Implement `PlatformMetricsProjection` (track DAU/WAU/MAU)
- [ ] Create queries: `GetUserEngagementDashboardQuery`, `GetProfessionalClientEngagementQuery`, `GetPlatformMetricsQuery`
- [ ] Add indices for performance
- [ ] Add Redis caching (TTL 24h)
- [ ] Add tests: Projection handlers, query performance (<100ms)

### UI Layer (Post-ADR)

- [ ] Client dashboard (widgets 1-4 from design section)
- [ ] Professional dashboard (client list, at-risk filter)
- [ ] Admin dashboard (platform metrics) - post-MVP

### Documentation

- [ ] Update README: Explain Engagement vs Metrics vs Gamification
- [ ] API docs: New queries (dashboard endpoints)
- [ ] Runbook: Daily job monitoring, troubleshooting

---

## References

- **ADR-0005:** Bounded Context Isolation via Anti-Corruption Layers
- **ADR-0022:** Timestamp-Based State Over Terminal Enums
- **ADR-0047:** UseCase-Only Event Dispatching
- **ADR-0054:** Aggregated Metrics System
- **ADR-0066:** Streak Tracking and Habit Formation

---

## Appendix: Platform Metrics Formulas

### DAU (Daily Active Users)

```
Users who performed ANY activity today:
- Completed workout
- Created nutrition log
- Attended booking
- Updated goal progress
- Submitted session feedback
- Joined challenge
```

### WAU (Weekly Active Users)

```
Users who performed ANY activity in last 7 days (rolling window)
```

### MAU (Monthly Active Users)

```
Users who performed ANY activity in last 30 days (rolling window)
```

### Retention (Cohort Analysis)

```
D1 Retention: % users active on day 1 after signup
D7 Retention: % users active on day 7 after signup
D30 Retention: % users active on day 30 after signup

Example:
- Cohort: Users who signed up on 2026-03-01 (N=100)
- D1: 80 users active on 2026-03-02 (80% retention)
- D7: 60 users active on 2026-03-08 (60% retention)
- D30: 45 users active on 2026-03-31 (45% retention)
```

### Churn Rate

```
Monthly Churn = (Users lost in month / Total users at start of month) * 100

User is "churned" if:
- No activity in 30+ days
- Subscription cancelled (from Billing module)
```

---
