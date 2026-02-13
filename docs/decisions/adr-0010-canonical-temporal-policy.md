# ADR-0010 — Canonical Temporal Policy (logicalDay and UTC)

## Status

ACCEPTED — CANONICAL

## Context

FitTrack operates globally with professionals and clients in different timezones. Service prescriptions, session bookings, and execution records are fundamentally organized by calendar day from the user's perspective, not by UTC timestamps. This creates an unavoidable tension between the technical requirement for UTC persistence and the business requirement for calendar-day correctness.

Without a formal temporal policy, the following failure modes occur:
- A professional prescribes a plan for March 14 (local time, UTC-3). The backend stores March 15 02:00 UTC. The client's history shows March 15 instead of March 14.
- A timezone change retroactively reorganizes historical execution records.
- Different parts of the system compute "today" differently for the same user.

This ADR supersedes the duplicate temporal policy content in former ADR-0015 and ADR-0016 (ADR-0015 is now SUPERSEDED; ADR-0016 is repurposed to Formal Eventual Consistency Policy).

All ADRs in this corpus that reference temporal logic or logicalDay must cite this ADR as the canonical authority. No other ADR may independently define logicalDay semantics.

## Decision

### 1. UTC Persistence Requirement

**All timestamps stored in the persistence layer are UTC.**

| Rule | Statement |
|------|-----------|
| Storage format | ISO 8601 UTC: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| Field name convention | All UTC timestamp fields end in `Utc` (e.g., `occurredAtUtc`, `createdAtUtc`) |
| Prohibited | No local timezone value is stored as a timestamp field |
| API output | Timestamps are returned as UTC strings; timezone conversion is a client-side responsibility |

### 2. logicalDay Definition

**logicalDay** is the calendar date (ISO date string `YYYY-MM-DD`) representing the day on which a time-based business event occurred from the perspective of the relevant user's local timezone, as known at the time of the event.

logicalDay is a business concept, not a derived value from the UTC timestamp.

**Computation rule:**
```
logicalDay = toLocalDate(occurredAtUtc, timezoneUsed)
```

Where:
- `occurredAtUtc` is the UTC instant of the event.
- `timezoneUsed` is the IANA timezone identifier of the relevant user at the moment the event is created.
- The conversion uses the IANA Time Zone Database (TZDB) for DST-aware computation.

**Example:**
```
occurredAtUtc  = 2024-03-15T02:30:00Z
timezoneUsed   = America/Sao_Paulo (UTC-3)
logicalDay     = 2024-03-14   (March 14, not March 15)
```

### 3. Entities Required to Store logicalDay

The following entity types must store `logicalDay` alongside `occurredAtUtc`:

| Entity | logicalDay Reference |
|--------|---------------------|
| Execution | Day of service delivery from client's perspective |
| Deliverable | Scheduled day of prescription from client's perspective |
| Booking | Day of scheduled session from client's perspective |
| RecurringSchedule | Day-of-week and date patterns from professional's perspective |

Additional entities may store `logicalDay` where calendar-day semantics are operationally relevant.

### 4. Required Temporal Fields

Every time-based domain entity must carry:

| Field | Type | Description |
|-------|------|-------------|
| `occurredAtUtc` | ISO 8601 UTC string | The precise UTC instant of the event |
| `logicalDay` | ISO date string (`YYYY-MM-DD`) | Calendar day in user's local timezone |
| `timezoneUsed` | IANA timezone string | The user's timezone at event creation time |

All three fields are set at entity creation time and are never subsequently modified.

### 5. logicalDay Immutability Rule

**logicalDay is set once at entity creation time and is never recomputed or modified thereafter.**

The following events do not alter `logicalDay` on any historical record:
- User changes their configured timezone.
- IANA timezone database updates DST rules for a past date.
- The professional moves to a different timezone region.
- System migration or data backfill operations.

This ensures that all historical records reflect the day as experienced by the user at the time the event occurred, and that historical reports remain stable.

### 6. Timezone Authority

- The **client's timezone** is authoritative for Execution and Deliverable `logicalDay`.
- The **professional's timezone** is authoritative for scheduling and availability configuration.
- The timezone value used must be the user's configured IANA timezone at the moment of entity creation, not a derived or assumed value.
- If the user has no configured timezone, the system defaults to `UTC` and records `timezoneUsed = 'UTC'`. This is the only case where UTC logicalDay equals the UTC date.

### 7. Temporal Policy for Scheduling

- Recurring schedules and availability windows are defined in the professional's configured timezone.
- When booking a session, the `logicalDay` of the Booking is computed in the client's timezone.
- The UTC representation of the booking time is stored separately as `scheduledAtUtc`.
- Reports and dashboards present times converted to the requesting user's current configured timezone.

### 8. Reporting and Display

- The backend never performs timezone conversion for display purposes. All API responses return UTC timestamps and `logicalDay`.
- Clients (frontend) are responsible for converting UTC timestamps to display-appropriate local times.
- The `logicalDay` field is the authoritative "what day" reference for any calendar-based display.

### 9. Impact on Database Indexing

- Indexes on `logicalDay` are mandatory for Execution, Booking, and Deliverable tables (governed by ADR-0036).
- Queries filtering by date range must use `logicalDay` for calendar-day semantics, not computed expressions from UTC timestamps.

## Invariants

1. Every time-based domain entity stores `occurredAtUtc`, `logicalDay`, and `timezoneUsed` at creation time.
2. `logicalDay` is never recomputed retroactively under any circumstance.
3. `timezoneUsed` reflects the user's configured timezone at the precise moment of entity creation.
4. All UTC timestamps conform to ISO 8601 with explicit `Z` suffix.
5. No ADR in this corpus may independently define or redefine logicalDay semantics. This ADR is the sole authority.
6. logicalDay is a stored field, never a computed property derived at query time.

## Constraints

- ADR-0029 (logicalDay in ADR-0029) and ADR-0042 must reference this ADR for all logicalDay definitions. Neither ADR may redefine logicalDay independently.
- The IANA TZDB is the authoritative timezone database. Custom or non-IANA timezone identifiers are not permitted.
- Past-dated Executions created by a professional (retroactive recording) must use the `logicalDay` of the specified past date computed in the client's timezone at the time of recording.

## Consequences

**Positive:**
- Historical records are stable regardless of future timezone changes.
- Calendar-day queries are correct and performant.
- No ambiguity between "technical time" and "business day."

**Negative:**
- Three temporal fields per entity instead of one.
- Retroactive timezone policy changes have no effect on historical data (by design).

## Dependencies

- ADR-0000: Project Foundation (UTC backend principle, logicalDay mandatory principle)
- ADR-0005: Execution Core Invariant Policy (logicalDay immutability on Execution)
- ADR-0036: Indexing and Modeling (logicalDay index requirement)
- ADR-0042: Internationalization and Extended Timezone (references this ADR for global expansion)
