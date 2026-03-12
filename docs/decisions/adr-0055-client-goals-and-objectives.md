# ADR-0068 — Client Goals and Objectives System

## Status

ACCEPTED

## Context

FitTrack professionals need a structured way to define, track, and evaluate client progress toward long-term health and fitness objectives. Without a formal Goals system, progress tracking is implicit, scattered across assessments and execution metrics, and lacks a shared language between professional and client about what success looks like. The Goals bounded context formalises this into measurable targets with trackable progress, milestones, and lifecycle management.

## Decision

### 1. Separation of Concerns

The Goals bounded context is responsible for state management of desired outcomes. It does not compute metrics and it does not own execution data.

| Responsibility | Context |
|---|---|
| Define target state (Goal) | **Goals** |
| Record workout data | Execution |
| Compute derived metrics | Metrics |
| Provide baseline measurements | Assessments |
| Unlock rewards | Achievements |

Goals consumes data from upstream contexts via events and anti-corruption layer interfaces. It never queries the Execution context directly.

### 2. Data Flow (ADR-0068 §2)

```
Execution → Metrics → Goals
Assessments → Goals
Gamification (Streak) → Goals
```

Goals never accesses Execution data directly. All progress updates arrive either via domain events or via the `IGoalProgressQueryService` anti-corruption layer.

### 3. Ownership Model

- **Client creates**: Goal is created in DRAFT state; professional must approve.
- **Professional creates**: Goal is auto-approved and starts immediately.
- Both parties can abandon a goal. Only the professional can complete, adjust target, or extend deadline.

### 4. Lifecycle (ADR-0010 — timestamp-based state derivation)

State is derived from timestamp fields rather than a mutable status enum:

| State | Condition |
|---|---|
| DRAFT | `approvedAtUtc === null` |
| ACTIVE | `approvedAtUtc !== null && startedAtUtc !== null && completedAtUtc === null && abandonedAtUtc === null` |
| COMPLETED | `completedAtUtc !== null` |
| ABANDONED | `abandonedAtUtc !== null` |

The `achievedFlag` boolean distinguishes COMPLETED goals that met their target from those that did not.

### 5. Progress Tracking

Progress percentage is computed using the formula:

```
progress% = (current - baseline) / (target - baseline) × 100
```

This formula handles both increasing goals (muscle gain, endurance) and decreasing goals (weight loss, body fat reduction) without needing a separate direction flag. Progress is clamped to [0, 100].

**Baseline is mandatory.** Every goal must capture the starting measurement to enable meaningful progress calculation.

Progress entries are **immutable snapshots** (ADR-0011). New measurements always append; existing entries are never modified.

### 6. Automatic Progress Updates

The following events from upstream contexts trigger automatic progress updates:

| Event | Source Context | Metrics Updated |
|---|---|---|
| `AssessmentCompleted` | Assessments | WEIGHT, BODY_FAT |
| `MetricComputed` | Metrics | WEEKLY_VOLUME |
| `StreakIncremented` | Gamification | STREAK_DAYS |

Manual updates are supported for STRENGTH, ENDURANCE, DAILY_PROTEIN, DAILY_WATER.

### 7. Milestones

Optional intermediate targets (e.g., 83kg on the way to 75kg). Milestones are:
- Ordered within the goal's value range.
- Automatically marked reached when a progress entry crosses the threshold.
- Never auto-completing the goal.

### 8. Risk Detection

Goals are assessed for physiological risk at creation time. Aggressive targets (e.g., weight loss exceeding safe weekly rates) emit a `GoalRiskDetectedEvent` for professional review. Risk detection is informational and does not block goal creation.

### 9. Goal Does Not Auto-Complete

When a client reaches their target value, a `GoalTargetReachedEvent` is emitted but the goal remains ACTIVE. Only the professional can formally complete a goal by calling `CompleteGoalUseCase` with `achieved = true` or `achieved = false`. This ensures professional oversight and clinical validity.

### 10. MVP Metric Scope

Eight metrics are supported in the initial release:

| Metric | Unit | Source |
|---|---|---|
| WEIGHT | kg | Assessments |
| BODY_FAT | % | Assessments |
| STRENGTH | kg | Manual |
| ENDURANCE | min | Manual |
| STREAK_DAYS | days | Gamification |
| WEEKLY_VOLUME | kg | Metrics |
| DAILY_PROTEIN | g | Manual/Self-Log |
| DAILY_WATER | L | Manual/Self-Log |

## Invariants

1. `baselineValue !== targetValue` — enforced in `Goal.create()`.
2. Progress entries are immutable after creation (ADR-0011).
3. A goal must be ACTIVE to record progress, adjust target, extend deadline, or complete.
4. Only the owning professional (matched by `professionalProfileId`) may approve, complete, or adjust a goal.
5. Milestones must have `targetValue` strictly between `baselineValue` and `targetValue`.
6. Goals are never deleted — only abandoned (preserving history).
7. The Goal aggregate is a pure state machine; domain events are published by the Application layer after `repository.save()` (ADR-0009 §4).
8. All queries are scoped by `clientId` or `professionalProfileId` for tenant isolation (ADR-0025).

## Constraints

- The Goals bounded context must not import from Execution directly.
- Cross-context references use IDs only (ADR-0047).
- `IGoalProgressQueryService` is the sole allowed channel for reading upstream context data.
- One aggregate per transaction (ADR-0003); `Goal` is the only aggregate in this context.
- No PII in events, logs, or error messages (ADR-0037).

## Consequences

**Positive:**
- Clear separation of "desired outcome" (Goal) from "how to get there" (Deliverable) and "current state" (Assessment/Metrics).
- Collaborative ownership model empowers clients while keeping professional oversight.
- Immutable progress history enables audit and trend analysis.
- Automatic progress updates reduce manual data entry.

**Negative:**
- Goal does not auto-complete; professionals must actively close goals — requires training and process discipline.
- Manual progress for STRENGTH/ENDURANCE creates a data entry burden if not integrated with future wearable/sensor data.

## Dependencies

- ADR-0003 (One aggregate per transaction)
- ADR-0005 (Bounded context isolation)
- ADR-0009 (Pure state machine / event dispatch)
- ADR-0011 (Snapshot immutability)
- ADR-0022 (Timestamps, not status enums)
- ADR-0025 (Tenant isolation)
- ADR-0037 (No PII in logs/events)
- ADR-0047 (Aggregate root catalog)
