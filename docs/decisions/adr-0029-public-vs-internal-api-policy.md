# ADR-0029 — Public vs Internal API Policy

## Status

ACCEPTED

## Context

FitTrack exposes two distinct API surfaces: a public-facing API consumed by first-party clients (web, mobile) and potentially third-party integrators, and an internal API used exclusively for intra-module and intra-service communication. Without a formal boundary between these surfaces, backward compatibility obligations become unclear, internal contracts are inadvertently exposed, and breaking changes cause uncoordinated failures.

## Decision

### 1. API Surface Classification

All API endpoints must be classified as one of:

| Classification | Definition | Backward Compatibility Obligation |
|---------------|------------|----------------------------------|
| **Public API** | Consumed by first-party frontend clients, documented external integrators, or third-party partners | Strict: breaking changes require versioning and deprecation period |
| **Internal API** | Used exclusively for intra-module communication within the monolith, or between internal services | None: may change freely with coordinated deployment |
| **Admin API** | Accessed only by platform operators and internal tooling | Moderate: breaking changes require deployment coordination; no external deprecation obligation |

### 2. Public API Definition

A Public API endpoint is any endpoint that:
- Is consumed by the first-party web or mobile application.
- Is documented in the external developer portal.
- Has been contractually exposed to a third-party integrator.
- Appears in a webhook payload schema delivered to external systems.

A Public API endpoint is **not** classified as internal merely because it is behind authentication.

### 3. Public API Backward Compatibility Obligations

| Change Type | Classification | Required Action |
|-------------|---------------|-----------------|
| Adding optional request field | Non-breaking | May be deployed without versioning |
| Adding response field | Non-breaking | May be deployed without versioning |
| Removing required request field | Breaking | Requires new API version; old version maintained for deprecation period |
| Removing response field | Breaking | Requires new API version |
| Changing field type or semantics | Breaking | Requires new API version |
| Changing HTTP status code semantics | Breaking | Requires new API version |
| Renaming endpoint path | Breaking | Old path must redirect or remain functional during deprecation period |
| Adding a new required request field | Breaking | Requires new API version |

Breaking changes to Public APIs require:
1. A new versioned path (e.g., `/v2/...`) or version header.
2. Maintenance of the previous version for the deprecation period.
3. Deprecation notice communicated to consumers via documented channels.
4. An ADR or changelog entry documenting the change.

Deprecation period minimum: **6 months** for documented external integrators; **30 days** for first-party frontend applications.

### 4. Internal API Contract Rules

Internal API endpoints:
- Are not documented in external-facing documentation.
- May change without a deprecation period, provided all consumers are updated atomically in the same deployment.
- Must not be invoked from outside the monolith boundary without explicit reclassification to Public or Admin.

Within the modular monolith, inter-module calls are direct TypeScript interface calls governed by ADR-0002. "Internal API" in the context of the monolith refers to module-exported interfaces, not HTTP endpoints.

### 5. API Versioning Strategy

| Strategy | Application |
|----------|-------------|
| URL path versioning (`/v1/`, `/v2/`) | Default strategy for Public REST API |
| API version header (`API-Version: 2`) | Optional complement; not a substitute for path versioning |
| No versioning in module interfaces | Internal TypeScript interfaces versioned via deployment |

### 6. Webhook Payload Schema as Public API

Webhook payloads delivered to external systems are Public API contracts subject to the same backward compatibility obligations as REST endpoints:
- Fields added to webhook payloads are non-breaking.
- Fields removed from webhook payloads are breaking changes requiring a deprecation period.
- The webhook event type (`event`) field is immutable once published.

## Invariants

1. Every HTTP endpoint has an explicit Public, Internal, or Admin classification.
2. Breaking changes to Public API endpoints require a new versioned path before deprecation of the old version.
3. Internal API endpoints are never accessed from outside the deployment boundary without reclassification.
4. Webhook payload schemas are Public API contracts subject to backward compatibility obligations.
5. Deprecation of a Public API endpoint requires a minimum notice period before removal.

## Constraints

- URL path versioning (`/v1/`) is the canonical versioning strategy. Version headers are supplementary only.
- The modular monolith's inter-module communication is TypeScript interface calls, not HTTP. HTTP-level API policy does not govern intra-module contracts.
- Admin API breaking changes require deployment coordination but do not require external deprecation notices.

## Consequences

**Positive:**
- Clear compatibility obligations for all API surfaces.
- External integrators and frontend clients have explicit stability guarantees.
- Internal contracts can evolve freely without coordination overhead.

**Negative:**
- Maintaining deprecated Public API versions has an operational cost.
- Classification discipline must be maintained per endpoint.

## Dependencies

- ADR-0002: Modular Structure (inter-module calls are TypeScript interfaces, not HTTP)
- ADR-0019: Payment Provider Integration (webhook payload schema as Public API)
- ADR-0032: Deploy, Environments, and Configuration (deployment coordination for breaking changes)
- ADR-0039: External Contract Versioning Policy (API versioning implementation detail)
