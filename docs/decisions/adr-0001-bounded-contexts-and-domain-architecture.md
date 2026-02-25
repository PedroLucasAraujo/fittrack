# ADR-0001 — Bounded Contexts and Domain Architecture

## Status

ACCEPTED

## Context

FitTrack operates across multiple domains with distinct responsibilities and independently evolving rules. Without explicit bounded context boundaries, cross-domain coupling produces circular dependencies, financial rule leakage into execution logic, and multi-tenancy fragility.

## Decision

### 1. Official Bounded Contexts

The following bounded contexts are formally recognized. Each context owns its aggregates, application layer, and persistence boundaries.

| Context | Primary Responsibility |
|---------|----------------------|
| Identity | User authentication credentials, token issuance, session management |
| UserProfile | Demographic and personal data of platform users |
| ProfessionalProfile | Professional identity, credentials, working availability, RiskStatus |
| ServicePlan | Service plan definition, pricing, session configuration, plan lifecycle |
| Scheduling | Booking management, recurring schedules, session slot availability |
| Execution | Service delivery records, Execution creation, Deliverable consumption |
| Metrics | Derived metrics computed from Execution records |
| Billing | Purchase transactions, AccessGrant lifecycle, credits, grace periods, payment confirmation |
| Catalog | Reusable exercise templates, food items (post-MVP), evaluation templates |
| PersonalMode | Self-directed client tracking without professional assignment |
| Risk | Professional risk assessment, RiskStatus governance, operational limit enforcement |
| Audit | Immutable audit event log, traceability records |
| Deliverables | Prescriptions and content delivered to the client. Aggregate roots: Deliverable. Responsible for the Deliverable lifecycle (DRAFT → ACTIVE → ARCHIVED) and immutable snapshots. Independent from Execution — Executions reference DeliverableSnapshots by ID. |
| Products | One-time purchasable products. Aggregate roots: Product, ProductPurchase. Responsible for versioned product catalog, one-time purchases, and AccessGrant issuance with source=PRODUCT_PURCHASE. Independent from Billing — reacts to TransactionConfirmed(type=ONE_TIME) events to create ProductPurchase and grant access. See ADR-0050. |

### 2. Aggregate Root Assignment

Each aggregate root belongs to exactly one bounded context. Complete listing governed by ADR-0047.

| Aggregate Root | Owning Context |
|---------------|---------------|
| User | Identity / UserProfile |
| ProfessionalProfile | ProfessionalProfile |
| ServicePlan | ServicePlan |
| Booking | Scheduling |
| RecurringSchedule | Scheduling |
| Execution | Execution |
| Deliverable | Deliverables |
| Transaction | Billing |
| AccessGrant | Billing |
| PlatformEntitlement | Billing |
| CatalogItem | Catalog |
| PersonalModeProfile | PersonalMode |
| SelfLog | PersonalMode |
| AuditLog | Audit |
| Product | Products |
| ProductPurchase | Products |

### 3. Inter-Context Communication Rules

- No aggregate root in one bounded context holds a direct object reference to an aggregate root in another bounded context.
- Cross-context references use identifiers (IDs) only, not object references.
- Cross-context operations are coordinated via domain events consumed by application-layer handlers.
- No bounded context may call another context's repository directly.

### 4. Key Dependency Constraints

| Rule | Statement |
|------|-----------|
| Execution ↛ Billing | Execution context does not depend on Billing internals. AccessGrant validity is checked via application-layer policy before Execution creation. |
| Billing ↛ Execution | Billing context does not depend on Execution internals. Financial operations are governed by Transaction and AccessGrant state, not Execution content. |
| Scheduling ↛ ServicePlan | Scheduling context does not directly mutate ServicePlan. Booking uses ServicePlan identifiers and session counts only. |
| Metrics ↛ Execution | Metrics context reads Execution records but never modifies them. Derivation is one-directional. |
| Risk ↛ History | Risk context never modifies historical records in any other context. Risk changes only affect future action permissions. |

### 5. Event-Driven Coordination

The canonical catalog of domain events is maintained in ADR-0009 §7. This section references ADR-0009 as the single source of truth for event definitions. ADR-0001 does not maintain a separate event list to avoid drift.

## Invariants

1. No bounded context may directly access the persistence layer of another bounded context.
2. Cross-context references are by ID only. No object graph traversal crosses bounded context boundaries.
3. Domain events are the exclusive mechanism for cross-context state propagation.
4. The Execution context is never directly modified by Billing, Risk, or Scheduling contexts.

## Constraints

- Bounded context boundaries must be enforced at the module import level (no cross-module domain imports in MVP).
- Future service extraction must not require changes to inter-context event contracts.

## Consequences

**Positive:**
- Independent evolution of each bounded context without cascade refactoring.
- Clear ownership of domain rules eliminates ambiguity.
- Financial rules cannot leak into execution logic.

**Negative:**
- Higher coordination overhead for operations spanning multiple contexts.
- Event-driven eventual consistency requires explicit handling.

## Dependencies

- ADR-0000: Project Foundation (foundational principles)
- ADR-0002: Modular Structure (physical module boundaries)
- ADR-0003: Transaction Boundaries (cross-aggregate consistency)
- ADR-0009: Domain Event Contract (inter-context event structure)
- ADR-0047: Canonical Aggregate Root Definition (complete aggregate inventory)
