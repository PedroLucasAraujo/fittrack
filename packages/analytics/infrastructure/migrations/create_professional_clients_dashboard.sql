-- Migration: create_professional_clients_dashboard
-- Denormalized read model for professional → clients engagement view (CQRS read side).
-- Tenant-scoped by professional_profile_id (ADR-0025).
-- Part of ADR-0058: Analytics and Engagement Architecture.

CREATE TABLE professional_clients_dashboard (
  professional_profile_id UUID         NOT NULL,
  client_id               UUID         NOT NULL,
  client_name             VARCHAR(255) NOT NULL,
  engagement_score        INTEGER      NOT NULL CHECK (engagement_score BETWEEN 0 AND 100),
  engagement_level        VARCHAR(20)  NOT NULL,
  trend                   VARCHAR(20)  NOT NULL,
  trend_percentage        DECIMAL(5,2),
  is_at_risk              BOOLEAN      NOT NULL DEFAULT FALSE,
  days_inactive           INTEGER,
  last_activity_date      DATE,
  calculated_at           TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (professional_profile_id, client_id)
);

-- All clients for a professional (main list query)
CREATE INDEX idx_pcd_prof ON professional_clients_dashboard (professional_profile_id);

-- At-risk clients for a professional (alert panel query)
CREATE INDEX idx_pcd_risk ON professional_clients_dashboard (professional_profile_id, is_at_risk)
  WHERE is_at_risk = TRUE;

-- Ordering by score within a professional's client list
CREATE INDEX idx_pcd_score ON professional_clients_dashboard (professional_profile_id, engagement_score DESC);
