# FitTrack — Claude Code Instructions

## Project Overview

FitTrack is a B2B SaaS platform for fitness professionals to manage clients, prescriptions, and billing. Built as a **modular monolith with DDD** in TypeScript + Node.js.

## Architecture Rules

All architecture rules, domain invariants, and coding conventions are defined in `.claude/rules.json`. That file is the single source of truth for development guidelines.

## Critical Domain Invariants

These invariants must NEVER be violated in any code change:

1. **Execution immutability** (ADR-0005): Executions are never updated or deleted. Corrections use `ExecutionCorrectionRecorded` compensating events.
2. **Tenant isolation** (ADR-0025): All queries must include `professionalProfileId`. Cross-tenant access returns `404`, never `403`.
3. **logicalDay immutability** (ADR-0010): Computed once at creation using the user's IANA timezone and never recomputed.
4. **Snapshot at prescription** (ADR-0011): Deliverable content is embedded as an immutable snapshot; never references live catalog.
5. **Subscription-first** (ADR-0017): Payment confirmation always precedes `AccessGrant` creation.
6. **AccessGrant validity** (ADR-0046): 5 mandatory checks — status ACTIVE, correct clientId, correct professionalProfileId, validUntil not expired, sessionAllotment not exhausted.
7. **Banned state** (ADR-0022): Blocks all mutations and invalidates all sessions. Not terminal (can be lifted).
8. **Financial amounts** (ADR-0004): Integer cents only, never floating point.
9. **One aggregate per transaction** (ADR-0003): Cross-aggregate references by ID only (ADR-0047).
10. **No PII in logs/audit/cache/errors** (ADR-0037): Health data and financial amounts also prohibited in logs.

## ADR Corpus

All architectural decisions are documented in `docs/decisions/` (ADR-0000 through ADR-0048). ADRs are the authoritative source — code that contradicts an ADR is a bug.

### Canonical ADRs (resolve conflicts in favor of these)

| ADR | Authority |
|-----|-----------|
| ADR-0005 | Execution immutability |
| ADR-0010 | Temporal policy (logicalDay, UTC) |
| ADR-0016 | Eventual consistency |
| ADR-0022 | Financial risk governance |
| ADR-0029 | Public vs internal API |
| ADR-0039 | External contract versioning |
| ADR-0045 | ADR governance |
| ADR-0046 | AccessGrant lifecycle |
| ADR-0047 | Aggregate root definition |
| ADR-0048 | Notification architecture |

## Tech Stack

- **Language**: TypeScript (ES2022, strict mode)
- **Runtime**: Node.js 22
- **ORM**: Prisma
- **Cache/Rate-limiting**: Redis
- **Auth**: JWT RS256 (15min access, 30d refresh with rotation)
- **Testing**: Vitest with v8 coverage (100% threshold on domain + application layers)
- **Compliance**: LGPD (Brazilian data protection)

## Package Structure

```
packages/
  core/       → @fittrack/core (value objects, entities, Either, domain events, invariants)
  identity/   → @fittrack/identity (users, professional profiles, authentication)
```

## Coding Conventions

- Repository interfaces in domain layer, implementations in infrastructure: `I{AggregateName}Repository`
- UTC timestamps: `{event}AtUtc`; calendar dates: `logicalDay`; timezone: `timezoneUsed`
- Modules import only via public `index.ts`
- Domain layer has zero infrastructure dependencies
- Domain tests must be pure functions (no mocks of infrastructure)

## Running Tests

```bash
# Core
cd packages/core && npx vitest run --coverage

# Identity
cd packages/identity && npx vitest run --coverage
```

Coverage thresholds are enforced at 100% for lines, functions, branches, and statements.
