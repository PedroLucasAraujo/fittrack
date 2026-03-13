-- Migration: create_user_engagement_dashboard
-- Denormalized read model for per-user engagement dashboard (CQRS read side).
-- Part of ADR-0058: Analytics and Engagement Architecture.

CREATE TABLE user_engagement_dashboard (
  user_id             UUID         PRIMARY KEY,
  overall_score       INTEGER      NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  engagement_level    VARCHAR(20)  NOT NULL,
  trend               VARCHAR(20)  NOT NULL,
  trend_percentage    DECIMAL(5,2),
  workout_score       INTEGER      NOT NULL CHECK (workout_score BETWEEN 0 AND 100),
  habit_score         INTEGER      NOT NULL CHECK (habit_score BETWEEN 0 AND 100),
  goal_progress_score INTEGER      NOT NULL CHECK (goal_progress_score BETWEEN 0 AND 100),
  streak_score        INTEGER      NOT NULL CHECK (streak_score BETWEEN 0 AND 100),
  workouts_completed  INTEGER      NOT NULL DEFAULT 0,
  nutrition_logs_created INTEGER   NOT NULL DEFAULT 0,
  bookings_attended   INTEGER      NOT NULL DEFAULT 0,
  current_streak      INTEGER      NOT NULL DEFAULT 0,
  active_goals_count  INTEGER      NOT NULL DEFAULT 0,
  goals_on_track_count INTEGER     NOT NULL DEFAULT 0,
  window_start_date   DATE         NOT NULL,
  window_end_date     DATE         NOT NULL,
  is_at_risk          BOOLEAN      NOT NULL DEFAULT FALSE,
  days_inactive       INTEGER,
  last_activity_date  DATE,
  risk_detected_at    TIMESTAMP WITH TIME ZONE,
  calculated_at       TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fast lookup by engagement level for filtering dashboards
CREATE INDEX idx_ued_level ON user_engagement_dashboard (engagement_level);

-- Partial index: quickly find at-risk users
CREATE INDEX idx_ued_risk ON user_engagement_dashboard (is_at_risk)
  WHERE is_at_risk = TRUE;

-- Leaderboard / ranking queries
CREATE INDEX idx_ued_score ON user_engagement_dashboard (overall_score DESC);
