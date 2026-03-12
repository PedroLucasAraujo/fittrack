# ADR-0057: Session Feedback and Quality Assurance

**Status:** Accepted
**Date:** 2026-03-12
**Authors:** FitTrack Architecture Team
**Supersedes:** None
**Superseded by:** None

---

## Status

Accepted

---

## Context

FitTrack professionals deliver sessions to clients and receive public reputation scores via `ProfessionalReview` (ADR-0068). However, public reviews are submitted only after ≥5 completed sessions, leaving a long gap with no quality signal. Professionals with early-stage quality problems go undetected until clients accumulate enough sessions for a public review.

There is also no mechanism for internal quality assurance (QA) that is separate from the public reputation system. Platform operators need early warning signals to proactively intervene before client relationships deteriorate.

### Existing System

| System | Visibility | Trigger | Frequency |
|---|---|---|---|
| `ProfessionalReview` | Public | After ≥5 sessions | 1 per client-professional pair |

### Gap

- No per-session feedback signal
- No early warning system for quality problems
- No internal QA mechanism independent of public reputation

---

## Decision

We introduce a new bounded context, **SessionFeedback**, that captures private quality-assurance feedback after every completed session.

### D1: SessionFeedback is a Separate Bounded Context

`SessionFeedback` is **not** merged into `Reviews`. The two systems serve different purposes:

| Dimension | SessionFeedback | ProfessionalReview |
|---|---|---|
| Scope | Per-session | Aggregated (≥5 sessions) |
| Visibility | **Private** (prof + admin) | **Public** (marketplace) |
| Purpose | Internal QA / early warning | External reputation |
| Frequency | Many per client | 1 per client-professional pair |
| Risk Impact | WATCHLIST / FLAGGED | Marketplace ranking |

### D2: 1:1 Booking → Feedback Relationship

Each booking may have at most one feedback. This is enforced at the application layer via `ISessionFeedbackRepository.existsByBookingId()` before creating the aggregate.

### D3: 48-Hour Feedback Window

Clients have exactly 48 hours from `booking.completedAt` to submit feedback. After this window closes, `FeedbackWindowClosedError` is returned. The window is not extendable.

### D4: Rating Classification

| Rating | Classification | Risk Trigger |
|---|---|---|
| 1–2 | Negative | Yes — contributes to threshold |
| 3 | Neutral | No |
| 4–5 | Positive | No |

### D5: Automatic Risk Detection via Rolling Window

Risk is evaluated after every negative feedback submission:

```
SessionFeedbackSubmitted (isNegative=true)
  → OnSessionFeedbackSubmitted handler
  → DetectProfessionalRisk use case
  → Count visible negative feedbacks in last 30 days
  → If count ≥ 5: emit ProfessionalRiskDetectedEvent (WATCHLIST)
  → If count ≥ 10: emit ProfessionalRiskDetectedEvent (FLAGGED)
  → Risk module consumes event and updates RiskStatus
```

Hidden feedbacks are excluded from the count (see D7).

### D6: Feedback Immutability

Once submitted, feedback content (rating, comment) cannot be modified by the client. This follows ADR-0011 (snapshot immutability). Admins may hide (soft-delete) but not permanently delete.

### D7: Timestamp-Based State

Following ADR-0022, state is represented via timestamps rather than enums:

- `flaggedAtUtc: UTCDateTime | null` — null if not flagged
- `hiddenAtUtc: UTCDateTime | null` — null if visible

Query methods (`isFlagged()`, `isHidden()`, `isVisible()`) read these timestamps.

Hidden feedbacks do **not** count toward risk thresholds. When a negative feedback is hidden, risk detection is recalculated via `OnSessionFeedbackHidden` handler.

### D8: Private Visibility

Feedbacks are never surfaced publicly. Access rules:

- **Professional**: sees visible feedbacks directed at himself
- **Admin**: sees all feedbacks (may request `includeHidden=true`)
- **Client**: sees only feedbacks he submitted

`clientId` is omitted from professional-facing DTOs to protect client privacy.

### D9: Authorization for Flag and Hide

- `flag()`: professional (own feedback only) or admin
- `hide()`: admin only
- Client cannot flag or hide

---

## Invariants

1. **1:1 constraint**: Only one feedback per booking ID is permitted.
2. **Window constraint**: Feedback may only be submitted within 48 hours of `booking.completedAt`.
3. **Immutability**: Rating and comment are immutable after creation (ADR-0011).
4. **Hidden exclusion**: Hidden feedbacks never count toward risk thresholds.
5. **Risk thresholds**: ≥5 visible negatives/30d → WATCHLIST; ≥10 → FLAGGED.
6. **Double-flag prevention**: A feedback cannot be flagged twice.
7. **Double-hide prevention**: A feedback cannot be hidden twice.

---

## Constraints

- SessionFeedback must not import from Scheduling, Reviews, or Risk packages directly (ADR-0005).
- Cross-context communication occurs only via domain events.
- Risk detection is **best-effort**: failures in `DetectProfessionalRisk` must not surface to the client submitting feedback.
- No PII in event payloads or logs (ADR-0037).

---

## Consequences

### Positive

- Early warning system enables proactive intervention before public reputation suffers.
- Private feedback encourages honest client responses.
- Rolling window ensures fair treatment — professionals can recover from WATCHLIST automatically.
- Clean separation from public reviews avoids coupling concerns.

### Negative

- Additional storage for per-session feedback at scale (mitigated by indexed queries).
- Risk detection recalculation on hide adds complexity (mitigated by best-effort pattern).
- Professionals may flag all negative feedbacks to suppress signals (mitigated by `flagRate` monitoring in Post-MVP).

---

## Dependencies

| ADR | Relationship |
|---|---|
| ADR-0003 | One aggregate per transaction |
| ADR-0005 | Bounded context isolation |
| ADR-0009 | Events published post-commit |
| ADR-0011 | Snapshot immutability |
| ADR-0022 | Timestamp-based state (no terminal status enums) |
| ADR-0025 | Tenant isolation via professionalProfileId |
| ADR-0037 | No PII in logs/events |
| ADR-0047 | Cross-aggregate references by ID only |
| ADR-0051 | Either pattern for use case returns |
| ADR-0068 | ProfessionalReview (complementary, not superseded) |
