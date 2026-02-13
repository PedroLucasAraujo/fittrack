# ADR-0031 — Feature Flags and Controlled Rollout

## Status

ACCEPTED

## Context

FitTrack has post-MVP features (Immutable Financial Ledger, advanced Risk analytics, Metrics v2, new Deliverable types) that must be deployed to production before being activated for all users. Without a formal feature flag policy, feature exposure and rollback become risky and ad-hoc. Feature flags must be governed to prevent misuse: flags must not replace domain invariants, override billing behavior, or become permanent infrastructure.

## Decision

### 1. Feature Flag Data Model

```typescript
interface FeatureFlag {
  readonly key: string;                    // Unique identifier (e.g., 'LEDGER_V2_ENABLED')
  readonly description: string;            // Human-readable purpose
  isEnabled: boolean;                      // Global toggle
  rolloutStrategy: 'GLOBAL' | 'PERCENTAGE' | 'PROFILE_TARGET';
  rolloutPercentage?: number;              // 0–100 for PERCENTAGE strategy
  targetProfessionalProfileIds?: string[]; // For PROFILE_TARGET strategy
  readonly createdAtUtc: string;
  readonly expiresAtUtc?: string;          // Flags must have a planned removal date
}
```

### 2. Permitted Uses of Feature Flags

Feature flags may control:
- Activation of post-MVP modules (Ledger, advanced Risk, external integrations).
- UI feature visibility (show/hide components).
- Experimental features under A/B testing.
- Graduated rollout of new Deliverable types (ADR-0044).
- New Public API endpoints in preview.

### 3. Prohibited Uses of Feature Flags

Feature flags must **never** be used to:
- Override billing rules, payment flows, or subscription logic.
- Alter the behavior of Execution creation or immutability (ADR-0005).
- Change logicalDay computation logic (ADR-0010).
- Bypass AccessGrant validation or subscription-first enforcement (ADR-0017).
- Modify financial safety invariants (ADR-0021, ADR-0022).
- Replace permanent architectural decisions. Flags are not a substitute for ADR governance.

### 4. Feature Flag Lifecycle

| Phase | Description |
|-------|-------------|
| **Created** | Flag created in disabled state before deployment. Code path exists but is inactive. |
| **Activated** | Flag enabled globally or for a target segment. Feature is live. |
| **Graduated** | Feature is stable; flag is no longer needed. Removal scheduled. |
| **Removed** | Flag deleted from codebase. Code path is unconditional. |

Flags in the **Activated** phase must have a target graduation date recorded. Flags must not remain indefinitely in the Activated phase — permanent flags are architectural decisions, not flags.

### 5. Rollout Strategies

| Strategy | Use Case |
|----------|----------|
| `GLOBAL` | Feature enabled or disabled for all users simultaneously. |
| `PERCENTAGE` | Feature enabled for a random N% of users (for load testing, A/B). |
| `PROFILE_TARGET` | Feature enabled for specific `professionalProfileId` list (for beta testers, early access). |

### 6. Flag Evaluation

- Flags are evaluated at the application layer, not the domain layer.
- Domain logic must not branch on feature flag state. Feature flags wrap use cases or presentation layer components.
- Flag evaluation is cached in Redis (ADR-0030) with a short TTL (≤5 minutes). Changes are not instantaneous.

### 7. Flag Governance

- All new feature flags must be documented with: key, purpose, permitted rollout strategy, planned removal date.
- Flags that control security-relevant behavior (new auth flows, new permission checks) require ADR-level documentation before activation.
- Abandoned flags (Activated >180 days with no graduation plan) are subject to mandatory review and removal.

## Invariants

1. Feature flags never control core billing, Execution immutability, or financial safety behavior.
2. Every feature flag has a planned removal date recorded at creation.
3. Feature flags are evaluated at the application layer only; domain aggregates are flag-unaware.
4. Flag evaluation uses cached values with a maximum staleness of 5 minutes.
5. A flag in the Activated phase does not constitute a permanent architectural decision.

## Constraints

- Feature flags are stored in the database and cached in Redis. They are not environment variables.
- Flag configuration changes do not require deployment. Changes propagate within the cache TTL window.
- A flag controlling a complete module (e.g., Ledger) must be accompanied by an ADR documenting the module's architecture before activation in production.

## Consequences

**Positive:**
- Safe deployment of incomplete features to production.
- Gradual rollout with measurable impact before full activation.
- Instant kill-switch for problematic features without deployment.

**Negative:**
- Flag debt accumulates if governance is not enforced.
- Percentage-based rollout introduces temporary behavioral inconsistency for different users.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (flags must not alter Execution behavior)
- ADR-0010: Canonical Temporal Policy (flags must not alter logicalDay computation)
- ADR-0017: Subscription-First Model (flags must not bypass AccessGrant validation)
- ADR-0021: Immutable Financial Ledger (flags control ledger activation)
- ADR-0030: Cache and Performance Strategy (flag evaluation cache)
- ADR-0044: Deliverable Type Expansion Policy (flags used for new type rollout)
- ADR-0045: ADR Governance Policy (security-relevant flags require ADR before activation)
