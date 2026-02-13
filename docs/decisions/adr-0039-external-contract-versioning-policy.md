# ADR-0039 — External Contract Versioning Policy

## Status

ACCEPTED

## Context

FitTrack's Public API (ADR-0029) and webhook payload schemas form external contracts with consumers. These contracts must evolve over time as features are added, corrected, or removed. Without a formal versioning strategy, breaking changes are deployed without consumer notice, API consumers break unexpectedly, and the platform loses trust as an integration target. This ADR governs how external contracts are versioned, how breaking changes are introduced, and how deprecated contracts are sunset.

## Decision

### 1. External Contract Types

The following artifacts are external contracts subject to this versioning policy:

| Contract Type | Examples | Governed By |
|--------------|---------|-------------|
| REST API endpoints | `GET /v1/service-plans`, `POST /v1/executions` | This ADR + ADR-0029 |
| Webhook payload schemas | `payment.confirmed`, `payment.chargeback` | This ADR + ADR-0038 |
| Data export schemas | LGPD portability JSON structure | This ADR + ADR-0037 |
| Module interface types (public TypeScript exports) | Types exported from public module index | ADR-0002 (internal only) |

Module interface types are internal contracts governed by ADR-0002 and are not subject to this ADR's external deprecation requirements.

### 2. Version Identifier Convention

| Contract Type | Version Format | Location |
|--------------|---------------|---------|
| REST API | Integer major version (`v1`, `v2`) | URL path prefix: `/v1/...` |
| Webhook schema | Integer major version (`v1`, `v2`) | `schema_version` field in payload |
| Data export schema | ISO date stamp (`2024-01-15`) | Export metadata header |

Minor (non-breaking) changes within a version do not require a new version identifier. Only breaking changes require version increment.

### 3. Breaking Change Classification

| Change | Classification | Versioning Required |
|--------|---------------|---------------------|
| Remove a field from response | **Breaking** | Yes |
| Remove an endpoint | **Breaking** | Yes |
| Rename a field | **Breaking** | Yes |
| Change a field's type | **Breaking** | Yes |
| Change HTTP method of an endpoint | **Breaking** | Yes |
| Remove a webhook event type | **Breaking** | Yes |
| Redefine the semantics of an existing field | **Breaking** | Yes |
| Add an optional field to request | Non-breaking | No |
| Add a field to response | Non-breaking | No |
| Add a new endpoint | Non-breaking | No |
| Add a new webhook event type | Non-breaking | No |
| Fix a bug that changes behavior from undocumented to documented | Judgment call | Document in changelog |

### 4. Version Lifecycle

| Phase | Description | Duration |
|-------|-------------|---------|
| **Active** | Current supported version. New features are added here. | Ongoing |
| **Deprecated** | Previous version. Still functional. Breaking change notice issued. | Minimum 6 months for external integrators; 30 days for first-party clients |
| **Sunset** | Version no longer functional. Returns HTTP 410 Gone. | Permanent |

A version transitions from Active to Deprecated only when a new Active version is released. A version transitions from Deprecated to Sunset only after the minimum deprecation period has elapsed and all known consumers have migrated or been notified.

### 5. Deprecation Notice Requirements

When a Public API version enters the Deprecated phase:
1. `Deprecation` response header must be added to all responses from deprecated endpoints: `Deprecation: true`.
2. `Sunset` response header must specify the sunset date: `Sunset: Sat, 01 Jan 2026 00:00:00 GMT`.
3. Deprecation must be communicated via:
   - Platform changelog.
   - Developer documentation.
   - Direct notification to known registered integrators (if applicable).
4. An ADR entry or changelog record must document the version transition.

### 6. Webhook Schema Versioning

Webhook payloads must include a `schema_version` field:

```json
{
  "event": "payment.confirmed",
  "schema_version": "v1",
  "occurred_at": "2025-01-15T10:00:00Z",
  "data": { ... }
}
```

When a breaking change is made to a webhook payload schema:
- A new `schema_version` value is assigned.
- Both the old and new versions are published simultaneously during the deprecation window.
- Consumers must migrate to the new schema version before the old version is sunset.

### 7. Changelog Requirements

Every external contract change (breaking or non-breaking) must be documented in the project changelog with:
- Date of the change.
- Contract type and version affected.
- Classification (breaking or non-breaking).
- Migration guidance for breaking changes.

## Invariants

1. Breaking changes to Public API endpoints require a new version identifier before the old version is deprecated.
2. Deprecated API versions remain functional for the minimum deprecation period.
3. `Deprecation` and `Sunset` response headers are required on all deprecated endpoint responses.
4. Webhook payloads include a `schema_version` field; breaking schema changes increment the version.
5. No Public API version is sunset before all known consumers have been notified.

## Constraints

- REST API versioning uses URL path prefixes only. Query parameter versioning (`?version=2`) is not used.
- Version numbering is integer major versions only. Semver (e.g., `v1.2.3`) is not used for REST API paths.
- The deprecation period minimum is 6 months for documented external integrators and 30 days for first-party clients.

## Consequences

**Positive:**
- External consumers can rely on explicit stability guarantees.
- Breaking changes are predictable and communicated in advance.
- API evolution does not break existing integrations without notice.

**Negative:**
- Maintaining multiple simultaneous API versions adds infrastructure and testing overhead.
- Deprecation period enforcement requires tracking of registered consumers.

## Dependencies

- ADR-0002: Modular Structure (module interface types governed by deployment, not this ADR)
- ADR-0029: Public vs Internal API Policy (classification of what is a public contract)
- ADR-0032: Deploy, Environments, and Configuration (breaking changes require deployment coordination)
- ADR-0037: Sensitive Data Handling (data export schema versioning)
- ADR-0038: Webhook and External Integration Policy (webhook payload schema as external contract)
