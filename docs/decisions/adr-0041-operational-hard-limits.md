# ADR-0041 — Operational Hard Limits

## Status

ACCEPTED

## Context

Without explicit operational limits, the platform is vulnerable to resource exhaustion from legitimate overuse and malicious abuse: excessively long service plans lock financial commitments indefinitely, unlimited recurring sessions consume scheduler capacity, unbounded uploads exhaust storage, and unlimited client lists per professional make admin operations unpredictable. Hard limits are a necessary operational control that must be visible, configurable, and applied before domain transactions execute.

## Decision

### 1. Hard Limit Catalog

The following limits are enforced at the application layer before any domain transaction:

| Entity | Limit | Default Value | Configuration Key |
|--------|-------|--------------|------------------|
| ServicePlan maximum duration | Duration | 12 months | `MAX_SERVICE_PLAN_DURATION_MONTHS` |
| Active ServicePlans per professional | Count | 50 | `MAX_ACTIVE_SERVICE_PLANS_PER_PROFESSIONAL` |
| Recurring sessions per RecurringSchedule | Count | 52 (1 year weekly) | `MAX_RECURRING_SESSIONS_PER_SCHEDULE` |
| Open bookings per client | Count | 10 | `MAX_OPEN_BOOKINGS_PER_CLIENT` |
| Attachments per physiological assessment | Count | 10 | `MAX_ATTACHMENTS_PER_ASSESSMENT` |
| Maximum file upload size | Bytes | 10 MB | `MAX_UPLOAD_SIZE_BYTES` |
| Clients per professional | Count | 500 | `MAX_CLIENTS_PER_PROFESSIONAL` |
| Active AccessGrants per client per professional | Count | 5 | `MAX_ACTIVE_ACCESS_GRANTS_PER_CLIENT` |
| Deliverables per ServicePlan | Count | 30 | `MAX_DELIVERABLES_PER_SERVICE_PLAN` |

All default values are configurable via environment variables (ADR-0032). Limits are conservative by default.

### 2. RiskStatus-Adjusted Limits

Professionals on WATCHLIST have reduced operational limits:

| Limit | NORMAL | WATCHLIST | BANNED |
|-------|--------|-----------|--------|
| ServicePlan maximum duration | 12 months | 3 months | 0 (all mutations blocked) |
| Active ServicePlans | 50 | 10 | 0 |
| New client onboarding | Permitted | Permitted (manual review recommended) | Blocked |
| Recurring session creation | Permitted | Limited to 12 sessions | Blocked |

BANNED professionals have all mutations blocked regardless of limit values (ADR-0022).

### 3. Limit Enforcement Layer

Limits are enforced at the **application layer** (use case layer), not the domain layer:
- The domain aggregate receives the command only after the limit check passes.
- Limit violations return a structured error with a reason code, not a domain exception.
- Limit checks are performed against the current database state; they are not cached.

### 4. Limit Violation Response

```typescript
// Limit violation structure
{
  "error": "OPERATIONAL_LIMIT_EXCEEDED",
  "code": "MAX_SERVICE_PLAN_DURATION_MONTHS",
  "message": "Service plan duration exceeds the maximum allowed (12 months)",
  "limit": 12,
  "provided": 18
}
```

HTTP response code: **422 Unprocessable Entity**.

### 5. Historical Data Preservation

Hard limits are pre-creation guards only. They never:
- Modify or delete existing entities that were created before a limit was introduced or reduced.
- Apply retroactively to existing data.
- Affect the reading of historical records.

Reducing a limit affects only future creation operations, not existing records.

### 6. Limit Review Process

Limits must be reviewed:
- When a professional's RiskStatus changes (automated: WATCHLIST limits applied automatically).
- When a new feature introduces a new resource type (requires a corresponding limit in this ADR).
- Annually in operational review.

Limit changes that affect production require a changelog entry or ADR amendment.

## Invariants

1. Hard limits are enforced before any domain transaction executes. No domain aggregate is modified without passing the relevant limit check.
2. Limit violations return HTTP 422 with a structured reason code.
3. Hard limits never modify or delete existing historical records.
4. BANNED professionals cannot create any new domain entities regardless of configured limits.
5. All limit values are configurable via environment variables; no limit is hardcoded.

## Constraints

- Limit enforcement is at the application layer, not the database layer. The database does not enforce row count limits.
- Limit checks use the current database state; they are not cached. This may cause a slight performance overhead on high-concurrency creation paths.
- Limit changes do not require redeployment (environment variable changes propagate per ADR-0032).

## Consequences

**Positive:**
- Platform capacity is predictable and bounded.
- WATCHLIST adjustments provide a graduated operational response to risk.
- Resource exhaustion attacks are bounded at the application layer.

**Negative:**
- Legitimate professional workflows may be constrained by conservative defaults.
- Limit tuning requires operational monitoring and periodic review.

## Dependencies

- ADR-0022: Financial Risk Governance Framework (WATCHLIST and BANNED limit adjustments)
- ADR-0024: Policy-Based Authorization (authorization checked before limit check)
- ADR-0032: Deploy, Environments, and Configuration (limits as environment variables)
- ADR-0041 is referenced by: ADR-0008 (lifecycle), ADR-0022 (risk), ADR-0025 (multi-tenant)
