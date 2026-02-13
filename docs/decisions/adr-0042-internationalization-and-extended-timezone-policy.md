# ADR-0042 — Internationalization and Extended Timezone Policy

## Status

ACCEPTED

## Context

The canonical temporal policy (ADR-0010) defines how UTC and logicalDay work for the current platform. FitTrack's expected expansion to multiple countries with different timezones, and the possibility that users may change their timezone, requires an explicit extension to the temporal policy that addresses multi-timezone scenarios, user-timezone changes, and UI representation without compromising temporal data integrity.

## Decision

### 1. Storage Requirements (Extension of ADR-0010)

All temporal entities with logicalDay must store three fields:

| Field | Type | Content |
|-------|------|---------|
| `executedAtUtc` | ISO 8601 UTC string | Exact moment of the event in UTC |
| `logicalDay` | ISO 8601 date string (`YYYY-MM-DD`) | Calendar date in the user's timezone at time of creation |
| `timezoneUsed` | IANA timezone identifier (e.g., `America/Sao_Paulo`) | The timezone active for the user at time of creation |

These three fields are stored together and are all immutable after creation. They collectively constitute the complete temporal record.

### 2. logicalDay Immutability on Timezone Change

When a user changes their configured timezone:
- Historical `logicalDay` values are **not reprocessed** or changed.
- All new events use the new timezone to compute `logicalDay`.
- Historical records retain the `timezoneUsed` value at the time they were created.
- The UI may display historical records with a timezone context indicator if necessary, but must not alter the stored `logicalDay`.

This preserves the principle that logicalDay represents the user's subjective calendar date at the time of the event, not a retroactively corrected date.

### 3. UI Representation Rules

| Scenario | Rule |
|----------|------|
| Display historical execution history | Use stored `logicalDay` (do not recompute from UTC) |
| Display current date to user | Compute from current UTC + user's active timezone |
| Group executions by day | Group by stored `logicalDay` field, not recomputed date |
| Display timestamps | Convert `executedAtUtc` to user's current timezone for display |

The stored `logicalDay` is the single source of truth for day-grouping operations. The UI does not recompute logicalDay from UTC.

### 4. Multi-Country / Multi-Timezone Support

When FitTrack expands to serve users in multiple countries:
- Each user record stores a `defaultTimezone` field (IANA identifier).
- `defaultTimezone` is used for `logicalDay` computation for all new events.
- Platform-level reporting (admin dashboards) uses UTC for all cross-timezone aggregations.
- Tenant-level reporting (professional's client history) uses client `logicalDay` values as stored.

### 5. Timezone Validity

- Only IANA timezone identifiers are accepted (e.g., `America/Sao_Paulo`, `Europe/Lisbon`).
- UTC offsets (e.g., `UTC-3`) are not stored as timezone identifiers; they are derived for display only.
- Daylight saving time transitions are handled by the IANA timezone database; the platform does not implement DST logic independently.
- Timezone validation occurs at the presentation layer. Invalid timezone identifiers return HTTP 422.

### 6. Cross-Timezone Professional-Client Relationships

A professional and client may be in different timezones:
- The `logicalDay` on an Execution record uses the **client's** timezone at time of execution.
- The `logicalDay` on a Booking record uses the **client's** timezone at booking time.
- The professional's timezone is used only for scheduling display in the professional's view.

## Invariants

1. Historical `logicalDay` values are never reprocessed when a user changes timezone.
2. The `timezoneUsed` field is stored with every temporal record and is immutable after creation.
3. All temporal aggregations (day-grouping, history view) use the stored `logicalDay`, not a recomputed value.
4. Only IANA timezone identifiers are stored; UTC offsets are never stored as timezone identifiers.
5. logicalDay computation always uses the client's timezone, not the professional's.

## Constraints

- Timezone conversion logic must use an IANA-aware library (e.g., `date-fns-tz`, Luxon). Custom timezone offset arithmetic is not permitted.
- UTC offsets derived from IANA identifiers may differ on different dates due to DST. The `timezoneUsed` field preserves the context needed to determine the offset at the time of the event.
- Post-MVP analytics features that aggregate across timezones must document their timezone normalization strategy.

## Consequences

**Positive:**
- Temporal data integrity is preserved through timezone changes.
- Global expansion does not require data migration or reprocessing.
- UI remains consistent with the user's subjective calendar experience.

**Negative:**
- Historical records with `timezoneUsed` from an old timezone may appear to be "on a different day" than the user's current timezone would compute.
- Cross-timezone analytics require explicit timezone normalization.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (logicalDay is part of Execution's immutable record)
- ADR-0010: Canonical Temporal Policy (this ADR extends the temporal policy for multi-timezone scenarios)
- ADR-0014: Projections, Derived Metrics, and Read Models (metric aggregation uses logicalDay)
- ADR-0036: Indexing and Modeling for Growth (logicalDay indexed for query performance)
