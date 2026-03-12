# ADR-0068: Professional Reputation and Review System

**Status:** Accepted
**Date:** 2026-03-09
**Authors:** Engineering Team
**Supersedes:** None
**Superseded by:** None

---

## Context

FitTrack connects fitness clients with professionals. Trust between clients and professionals is
a critical platform asset. Clients need a reliable way to evaluate professionals before subscribing,
and professionals need a mechanism to demonstrate their quality of service.

A naive review system (simple average rating) is vulnerable to:
- **Score inflation:** A professional with 2 reviews both rating 5.0 would rank equally with
  one who has 200 reviews averaging 4.8 — which is misleading.
- **Review fraud:** Clients creating fake accounts to inflate or deflate scores.
- **Review spam:** Same client submitting reviews repeatedly.
- **Permanent bias:** A single early negative review dominating the score forever.

---

## Decision

### 1. Bounded Context

Reviews is a **separate bounded context** (`@fittrack/reviews`) that:
- Depends on Identity for `professionalProfileId` and `clientId` references (by ID only).
- Queries Scheduling/Execution via `ISessionHistoryQuery` (anti-corruption layer).
- Does NOT import from `@fittrack/scheduling` or `@fittrack/execution` directly.
- Emits events consumed by Notification and Analytics modules.

### 2. Aggregate: ProfessionalReview

`ProfessionalReview` is the aggregate root. It represents a single client evaluation.

**Constraints:**
- One review per client-professional pair (enforced at use case layer).
- Rating criteria: `professionalism`, `communication`, `technicalKnowledge`, `punctuality`,
  `results` — each an integer in [1, 5].
- `overallRating` is the arithmetic mean of the 5 criteria, rounded to 1 decimal.
- `wouldRecommend` is a boolean.
- `comment` is optional; if provided, must be 10–1000 characters.
- `professionalResponse` is optional; if provided, must be 10–500 characters.

### 3. Anti-Fraud Mechanisms

#### 3.1 Session Verification (ADR-0068 §3)
- A client must have **≥5 completed sessions** with the professional to submit a review.
- The `ISessionHistoryQuery` anti-corruption layer queries session count without coupling
  to the Scheduling or Execution contexts.
- `verifiedInteraction` (always `true`) is stored on the aggregate as an audit proof.
- `sessionCountAtReview` is a snapshot of the count at submission time (immutable audit record).

#### 3.2 One Review Per Pair
- A client may have only one active review per professional.
- A second review is permitted only after **≥20 additional sessions** since the previous review.
- When a new review replaces the old one, the old review is soft-hidden (`hiddenAtUtc` set).

### 4. Rating System: Bayesian Weighted Score

The public reputation score is **not** a simple average — it is a Bayesian-weighted score:

```
score = (v / (v + m)) * R + (m / (v + m)) * C

Where:
  v = totalReviews (visible reviews)
  m = minimumReviewsThreshold (20, controls convergence speed)
  R = averageRating (arithmetic mean of visible reviews)
  C = platformAverage (global platform mean, 4.2)
```

**Rationale:**
- A professional with 2 reviews averaging 5.0 should NOT rank higher than one with
  50 reviews averaging 4.8. Bayesian weighting prevents this.
- As `v` grows, the score converges to `R`. At low `v`, it is pulled toward `C` (the prior).

**Example:**
```
A: v=2,  R=5.0, C=4.2, m=20 → score = (2/22)*5.0 + (20/22)*4.2 ≈ 4.27
B: v=50, R=4.8, C=4.2, m=20 → score = (50/70)*4.8 + (20/70)*4.2 ≈ 4.63
```
Professional B has the higher, more reliable score.

### 5. Reputation as Read Model

`ProfessionalReputationScore` is a **read model** (projection), NOT an aggregate:
- Updated asynchronously via event handlers (`OnProfessionalReviewSubmitted`,
  `OnProfessionalReviewHidden`).
- Maintains incremental sums (`sumProfessionalism`, `sumCommunication`, etc.) for O(1)
  average recalculation without rescanning all reviews.
- Eventual consistency is acceptable (ADR-0016).

### 6. Immutability Policy

- **Client cannot edit or delete their review** — reviews are permanent historical evidence.
- **Admin can soft-hide** a review (`hiddenAtUtc` set) — never permanently delete.
- **Professional can respond** once (`respond()`) or update their response (`updateResponse()`).
- All state changes are timestamp-based (ADR-0022): `flaggedAtUtc`, `hiddenAtUtc`, `respondedAtUtc`.

### 7. Privacy (ADR-0037)

- Review listings show clients as "Verified Client" — the actual `clientId` is never exposed
  in public API responses.
- No PII in domain event payloads.

### 8. Authorization

| Action          | Who may perform              |
|-----------------|------------------------------|
| Submit review   | Client (verified, ≥5 sessions) |
| Respond         | Professional (own reviews only) |
| Update response | Professional (own reviews only) |
| Flag            | Reviewed professional or admin |
| Hide            | Admin only                   |
| View (public)   | Anyone                       |
| View (hidden)   | Admin only                   |

---

## Consequences

### Positive
- Bayesian scoring builds genuine trust — professionals earn high scores through volume
  and consistency, not a few lucky reviews.
- Anti-fraud mechanisms ensure reviews reflect real interactions.
- Read model separation enables fast reputation queries without touching review aggregates.
- Immutability provides a reliable audit trail.

### Negative / Trade-offs
- New professionals start with no score (score = 0), which may deter early clients.
  Mitigated by showing "no reviews yet" messaging.
- Bayesian score may feel unfair to new professionals with perfect early reviews.
  This is intentional — trust must be earned through volume.
- Eventual consistency between review submission and reputation score update
  creates a brief inconsistency window (accepted per ADR-0016).

---

## Dependencies

- ADR-0005: Bounded context isolation (ISessionHistoryQuery anti-corruption layer)
- ADR-0016: Eventual consistency policy (reputation read model)
- ADR-0022: Financial risk governance (timestamp-based state, not enums)
- ADR-0025: Tenant isolation (all queries include professionalProfileId)
- ADR-0037: No PII in logs/events
- ADR-0047: Aggregate root definition (cross-aggregate references by ID)
- ADR-0051: Either pattern for error handling
