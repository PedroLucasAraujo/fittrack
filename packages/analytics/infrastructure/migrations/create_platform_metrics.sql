-- Migration: create_platform_metrics
-- Denormalized read model for platform-wide engagement metrics (CQRS read side).
-- Admin-only, not tenant-scoped.
-- Part of ADR-0058: Analytics and Engagement Architecture.

CREATE TABLE platform_metrics (
  metric_date              DATE         PRIMARY KEY,
  daily_active_users       INTEGER      NOT NULL DEFAULT 0,
  weekly_active_users      INTEGER      NOT NULL DEFAULT 0,
  monthly_active_users     INTEGER      NOT NULL DEFAULT 0,
  average_engagement_score DECIMAL(5,2),
  very_high_count          INTEGER      NOT NULL DEFAULT 0,
  high_count               INTEGER      NOT NULL DEFAULT 0,
  medium_count             INTEGER      NOT NULL DEFAULT 0,
  low_count                INTEGER      NOT NULL DEFAULT 0,
  very_low_count           INTEGER      NOT NULL DEFAULT 0,
  at_risk_count            INTEGER      NOT NULL DEFAULT 0,
  calculated_at            TIMESTAMP WITH TIME ZONE NOT NULL
);
