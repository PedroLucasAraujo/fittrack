You are performing a strict ADR compliance audit on the module **[NOME_DO_MODULO]** located at `[CAMINHO_DO_MODULO]`.

## PHASE 1 — LOAD ALL ADRs

Read every file in `docs/adr/` (or wherever ADRs are stored in this project). Parse each one completely. Build an internal compliance checklist based on ALL rules, constraints, naming conventions, architectural patterns, and domain policies defined across every ADR.

Pay special attention to:

- ADR-0009: Aggregate purity — Aggregates are pure state machines, NO domain events, NO side effects
- ADR-0022: BANNED is a terminal state — no transition out under any circumstance
- ADR-0047: UseCase is the SOLE event dispatcher (post-commit, via Outbox)
- ADR-0051: All domain errors must use DomainResult<T> — no thrown exceptions in domain layer
- ADR-0050: One-Time Product architecture rules
- ADR-0000: Foundational constraints (FROZEN — never modify)
- All other ADRs relevant to the bounded context of this module

Also read:

- `.claude/rules.json`
- `CLAUDE.md`
- `.claude/context.md`

These are secondary sources. Where they conflict with an ADR, the ADR is canonical.

---

## PHASE 2 — AUDIT THE MODULE

Recursively read ALL files in `[CAMINHO_DO_MODULO]`, including:

- Domain entities, aggregates, value objects
- Domain services
- Application use cases / command handlers / query handlers
- Infrastructure adapters (repositories, mappers, event publishers)
- DTOs, schemas, validators
- Tests (unit, integration)
- Any index/barrel files

For each file, check:

### 2.1 Layer Architecture

- [ ] Domain layer has ZERO infrastructure imports
- [ ] Domain layer has ZERO framework imports (NestJS decorators, etc.)
- [ ] Aggregates do NOT collect or publish domain events
- [ ] Aggregates are pure state machines (receive input → return new state or DomainResult<T>)
- [ ] Use cases are the SOLE place where domain events are dispatched
- [ ] Domain events are dispatched post-commit via the Outbox pattern

### 2.2 Domain Error Handling

- [ ] All domain methods return `DomainResult<T>` (or equivalent defined in ADR-0051)
- [ ] No `throw` statements inside aggregates or domain services
- [ ] Error codes follow the naming convention defined in ADRs

### 2.3 State Machine & Lifecycle

- [ ] All entity state transitions follow the lifecycle diagram in the relevant ADR
- [ ] No illegal state transitions exist in the code
- [ ] BANNED (or equivalent terminal states) have no outbound transitions

### 2.4 Naming & Conventions

- [ ] File names follow the ADR-defined convention
- [ ] Class names follow the ADR-defined convention
- [ ] Event names follow the pattern defined in ADRs
- [ ] Repository interface names follow convention

### 2.5 Bounded Context Boundaries

- [ ] Module only imports from its own context or from shared kernel (as defined in ADRs)
- [ ] No direct imports across bounded context boundaries
- [ ] Cross-context communication only via domain events or anti-corruption layers

### 2.6 Access & Authorization

- [ ] AccessGrant usage follows ADR-0046 rules
- [ ] source field values are only those defined in ADRs

### 2.7 Persistence & Infrastructure

- [ ] Repository implementations follow the interface pattern defined in ADRs
- [ ] Outbox pattern is used for event publishing (not direct dispatch)
- [ ] No business logic in infrastructure layer

### 2.8 Tests

- [ ] Unit tests exist for all aggregate state transitions
- [ ] Unit tests cover all DomainResult<T> error paths
- [ ] Tests do NOT mock domain internals (test behaviour, not implementation)

---

## PHASE 3 — FIX ALL VIOLATIONS

For EVERY violation found:

1. State clearly which ADR is being violated and which section
2. Show the current code
3. Show the corrected code
4. Apply the fix directly to the file

Do NOT ask for permission before fixing. Fix everything.
Do NOT leave TODO comments. Either fix it or, if genuinely blocked by missing context, document it in the report.

Apply fixes in this order:

1. Critical violations (broken state machines, thrown exceptions in domain, illegal cross-context imports)
2. Architectural violations (wrong layer responsibilities, events dispatched in wrong place)
3. Convention violations (naming, structure)
4. Test gaps

---

## PHASE 4 — GENERATE MODULE DOCUMENTATION

After all fixes are applied, generate a markdown file at:
`docs/modules/[NOME_DO_MODULO]-documentation.md`

The file must follow EXACTLY this structure:

---

# [NOME_DO_MODULO] — Module Documentation

> Generated after ADR compliance pass | Version: [date]

## 1. Overview

[2–3 sentences describing what this module does and its bounded context]

## 2. Bounded Context

- Context name:
- Owns these aggregates:
- Publishes these domain events:
- Consumes these domain events (from other contexts):
- External dependencies (other contexts or shared kernel):

## 3. Domain Model

### 3.1 Aggregates

For each aggregate:

- **Name:**
- **Identity (ID type):**
- **Invariants enforced:**
- **State machine:** (list all states and valid transitions)
- **Methods:** (list each method, its input, output DomainResult<T>, and what invariants it checks)

### 3.2 Value Objects

For each value object:

- **Name:**
- **Fields:**
- **Validation rules:**

### 3.3 Domain Events

For each event:

- **Name:**
- **Published by (UseCase):**
- **Trigger:**
- **Payload:**
- **Consumers (known):**

### 3.4 Domain Errors

For each error code:

- **Code:**
- **Meaning:**
- **When raised:**

## 4. Business Rules

List EVERY business rule enforced by this module. For each:

| #   | Rule | Where enforced                       | ADR reference |
| --- | ---- | ------------------------------------ | ------------- |
| 1   | ...  | Aggregate / UseCase / Domain Service | ADR-XXXX      |

## 5. Use Cases / Application Layer

For each use case / command handler / query handler:

- **Name:**
- **Type:** Command | Query
- **Input:**
- **Output:**
- **Steps:**
  1. ...
  2. ...
- **Domain events dispatched:**
- **Side effects (emails, notifications, etc.):**
- **Authorization rules:**

## 6. API Surface (if applicable)

For each endpoint/resolver:

- Method + path (REST) or operation name (GraphQL)
- Input DTO + validation rules
- Output DTO
- Auth requirements
- Rate limits (if any)

## 7. Infrastructure

### 7.1 Persistence

- Repository interface:
- Tables / collections used:
- Notable indexes:

### 7.2 External Integrations

- Any external services called (Stripe, S3, etc.)
- ADR governing the integration:

## 8. Known Gaps & TODOs

[Only if genuinely blocked during compliance pass — should be empty ideally]

## 9. ADR Compliance Summary

| ADR      | Status       | Notes |
| -------- | ------------ | ----- |
| ADR-0009 | ✅ Compliant |       |
| ADR-0022 | ✅ Compliant |       |
| ...      | ...          | ...   |

---

## IMPORTANT REMINDERS

- ADR-0000 is FROZEN. Never suggest modifying it.
- If you find a conflict between two ADRs, flag it in the report and do NOT silently pick one — surface it explicitly.
- If a test is missing, CREATE it. Don't just note its absence.
- Be exhaustive. Every business rule, every state transition, every error code must appear in the documentation.
- The documentation is for a human reader who has never seen this codebase before. Write accordingly.
