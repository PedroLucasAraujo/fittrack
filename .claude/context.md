# FitTrack — Claude Architectural Context

> **Rule #1**: All generated code must comply with the ADR corpus in `/docs/decisions/`.
> ADR violations are blocking defects, not style issues.

---

## ADR Corpus Overview

47 ADRs govern the FitTrack platform. All are ACCEPTED unless noted.
Full files: `docs/decisions/adr-0000.md` through `docs/decisions/adr-0047.md`

---

## Canonical Authorities (reference these first)

| Area | Canonical ADR | Rule |
|------|-------------|------|
| **Project foundation** | ADR-0000 (FROZEN) | 16 non-negotiable domain principles |
| **Bounded contexts** | ADR-0001 | 12 contexts; aggregate root assignments |
| **Module structure** | ADR-0002 | `/src/modules/` layout; import rules |
| **Transaction boundaries** | ADR-0003 | One aggregate per transaction |
| **Repository pattern** | ADR-0004 | Interface in domain; implementation in infra |
| **Execution immutability** | ADR-0005 (CANONICAL) | Execution is permanent; no UPDATE/DELETE |
| **Concurrency** | ADR-0006 | Optimistic locking via `version` field |
| **Idempotency** | ADR-0007 | Required for financial + external-event ops |
| **Entity lifecycles** | ADR-0008 | Formal state machines for all entities |
| **Domain events** | ADR-0009 | Outbox pattern; 23-event catalog |
| **Temporal / logicalDay** | ADR-0010 (CANONICAL) | UTC storage + logicalDay immutability |
| **Snapshots** | ADR-0011 | Immutable snapshot at prescription time |
| **Enum governance** | ADR-0012 | Central shared enums; no ad-hoc additions |
| **Data retention** | ADR-0013 | 4 tiers; Tier 1 = permanent |
| **Metrics / projections** | ADR-0014 | Execution = source of truth; metrics derived |
| **AccessGrant lifecycle** | ADR-0015 + ADR-0046 | ACTIVE→EXPIRED/REVOKED/SUSPENDED |
| **Eventual consistency** | ADR-0016 | SLA: cross-aggregate ≤5min; metrics ≤1hr |
| **Subscription-first** | ADR-0017 | Payment before delivery; no AccessGrant = no service |
| **Billing / credits** | ADR-0018 | PlatformEntitlement; grace period; trials |
| **Payment integration** | ADR-0019 | Webhook two-phase; IPaymentProvider interface |
| **Chargeback** | ADR-0020 | Non-destructive; compensating records only |
| **Financial ledger** | ADR-0021 (post-MVP) | Integer cents; append-only LedgerEntry |
| **Risk governance** | ADR-0022 (CANONICAL) | NORMAL/WATCHLIST/BANNED; thresholds |
| **Authentication** | ADR-0023 | JWT RS256; 15min access; 30d refresh rotation |
| **Authorization** | ADR-0024 | Policy-based; application layer only |
| **Multi-tenancy** | ADR-0025 + ADR-0040 | `professionalProfileId` as tenant key |
| **Rate limiting** | ADR-0026 | 3-tier; stored in Redis |
| **Audit log** | ADR-0027 | Append-only; 16 audited action codes |
| **LGPD / liability** | ADR-0028 | Platform = primary controller; no clinical interpretation |
| **Public vs internal API** | ADR-0029 | Breaking changes require versioning |
| **Cache** | ADR-0030 | Redis; Execution/Transaction/AccessGrant NEVER cached |
| **Feature flags** | ADR-0031 | No flags on billing/Execution/logicalDay behavior |
| **Deploy / config** | ADR-0032 | Immutable artifact; env vars; no manual migrations |
| **Security depth** | ADR-0033 | Defense-in-depth; no single control is sufficient |
| **Backup / recovery** | ADR-0034 | RPO ≤6h; RTO ≤4h; quarterly restoration tests |
| **Scalability** | ADR-0035 | Stateless app; Redis for distributed state |
| **Indexing** | ADR-0036 | `professionalProfileId` as leading column |
| **LGPD operational** | ADR-0037 | Data category A/B/C; logging prohibitions |
| **Webhooks** | ADR-0038 | Two-phase; idempotent; DLQ after 3 retries |
| **API versioning** | ADR-0039 | Breaking changes = new `/v{n}/` path |
| **Tenant isolation ops** | ADR-0040 | No implicit global queries; 404 for cross-tenant |
| **Hard limits** | ADR-0041 | ServicePlan max 12mo; configurable via env |
| **Timezones** | ADR-0042 | IANA identifiers; logicalDay immutable on TZ change |
| **Metric versioning** | ADR-0043 | DerivationRuleVersion; no retroactive overwrite |
| **Deliverable expansion** | ADR-0044 | New types need ADR + invariant review + feature flag |
| **ADR governance** | ADR-0045 | PROPOSED/ACCEPTED/SUPERSEDED/DEPRECATED/FROZEN |
| **AccessGrant (full)** | ADR-0046 (CANONICAL) | Complete lifecycle + validity check protocol |
| **Aggregate roots** | ADR-0047 (CANONICAL) | 13 aggregate roots; one per transaction |

---

## Absolute Prohibitions (code that violates these must not be generated)

1. **No Execution UPDATE or DELETE** — Execution is immutable (ADR-0005). Use `ExecutionCorrectionRecorded` events.
2. **No cross-aggregate object references** — Aggregates reference each other by ID only (ADR-0047).
3. **No more than one aggregate per transaction** — One aggregate root per database transaction (ADR-0003).
4. **No service delivery without AccessGrant** — AccessGrant must be ACTIVE and pass all 5 validity checks (ADR-0046).
5. **No payment before AccessGrant creation** — Payment confirmed first, AccessGrant created second (ADR-0017).
6. **No logicalDay recomputation from UTC** — logicalDay is stored and immutable; never recomputed (ADR-0010).
7. **No domain logic in Infrastructure/Presentation layers** — Authorization and business logic in Application layer only (ADR-0024).
8. **No `professionalProfileId` from request body for authorization** — Tenant ID from JWT only (ADR-0025).
9. **No PII or health metrics in logs or AuditLog** — AuditLog contains IDs only (ADR-0027, ADR-0037).
10. **No caching of Execution, Transaction, AccessGrant, RiskStatus, or Billing state** (ADR-0030).
11. **No breaking Public API changes without new version path** (ADR-0029, ADR-0039).
12. **No hardcoded secrets or credentials in code** (ADR-0032, ADR-0033).
13. **No domain imports of NestJS/Prisma/HTTP** — Domain layer is pure TypeScript (ADR-0002).
14. **No manual database migration in production** (ADR-0032).
15. **No cross-tenant data access without explicit tenant scope** — Returns 404, not 403 (ADR-0024, ADR-0040).

---

## Absolute Obligations (every relevant code path must satisfy these)

1. **Execution records are permanent** — Created once; immutable fields; corrections via compensating records.
2. **Every Execution requires a valid AccessGrant** — Check all 5 conditions before creating.
3. **All UTC timestamps are ISO 8601 strings** — `createdAtUtc`, `executedAtUtc`, `occurredAtUtc`.
4. **logicalDay = `toLocalDate(occurredAtUtc, timezoneUsed)`** — Stored at creation time; never recomputed.
5. **All state transitions emit Domain Events** — Published via Outbox pattern within the same transaction.
6. **All financial operations are idempotent** — IdempotencyKey required; stored atomically with result.
7. **All tenant-scoped repository queries include `professionalProfileId`** — No implicit global queries.
8. **All snapshot-based Deliverables embed content at prescription time** — Never reference live catalog.
9. **RiskStatus = BANNED blocks all mutations** — Regardless of configured limits.
10. **All AuditLog writes are fire-and-forget** — Failure to write does not roll back the originating operation.

---

## Domain Model Quick Reference

### Bounded Contexts (12)
`Identity` | `UserProfile` | `ProfessionalProfile` | `ServicePlan` | `Scheduling` | `Execution` | `Metrics` | `Billing` | `Catalog` | `PersonalMode` | `Risk` | `Audit`

### Key Aggregate Roots (ADR-0047)
`UserProfile` | `ProfessionalProfile` | `ServicePlan` | `Booking` | `RecurringSchedule` | `Execution` | `SelfLog` | `Metric` | `Transaction` | `AccessGrant` | `ProfessionalClientLink` | `AuditLog`

### Entity Tier Classification (ADR-0013)
- **Tier 1 (Permanent)**: Execution, Transaction, AuditLog, AccessGrant — never deleted
- **Tier 2 (Retained on closure)**: ServicePlan, Booking, UserProfile, ProfessionalProfile
- **Tier 3 (Soft delete)**: Scheduling entities, Deliverables, SelfLog
- **Tier 4 (Ephemeral)**: OutboxEvent, session tokens, temp exports

### AccessGrant Validity Check (ADR-0046)
Before creating any Execution, verify ALL of:
1. `status === 'ACTIVE'`
2. `clientId === requestingUserId`
3. `professionalProfileId === requestingTenantId`
4. `validUntil === null || currentUtc <= validUntil`
5. `sessionAllotment === null || sessionsConsumed < sessionAllotment`

### RiskStatus Impact (ADR-0022)
- `NORMAL`: no restrictions
- `WATCHLIST`: operational limits reduced; new plan activation may require review
- `BANNED`: ALL mutations blocked; all sessions invalidated

---

## Module Structure (ADR-0002)

```
src/
  modules/
    {context-name}/
      domain/
        entities/
        value-objects/
        events/
        repositories/   ← interfaces only
      application/
        use-cases/
        services/
        policies/       ← authorization policies here
      infrastructure/
        repositories/   ← Prisma implementations
        mappers/
      presentation/
        controllers/
        dtos/
```

Cross-module imports: only via the other module's public `index.ts`. Never import from internal paths of another module.

---

## Temporal Model (ADR-0010)

```typescript
// Correct temporal fields
interface TemporalRecord {
  executedAtUtc: string;   // ISO 8601 UTC — e.g. "2025-01-15T13:00:00Z"
  logicalDay: string;      // YYYY-MM-DD — e.g. "2025-01-15"
  timezoneUsed: string;    // IANA — e.g. "America/Sao_Paulo"
}

// logicalDay computation (at creation time only)
const logicalDay = toLocalDate(occurredAtUtc, user.timezone);
// logicalDay is IMMUTABLE after storage — never recompute from UTC
```

---

## Financial Safety (ADR-0021, ADR-0022)

- All monetary amounts in **integer cents** (no floats)
- Transactions are immutable after creation
- Chargebacks produce compensating records, not deletions
- Chargeback rate >2% in 30 days → automatic WATCHLIST trigger

---

## LGPD Compliance (ADR-0028, ADR-0037)

- Platform = primary data controller (not healthcare provider)
- Professionals = authorized operators
- LGPD erasure = field-level anonymization, never structural deletion
- Tier 1 entities retained despite erasure requests (legal obligation)
- PII never in logs, AuditLog, cache, or error responses
