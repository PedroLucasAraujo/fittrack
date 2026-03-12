# Session Feedback — Post-MVP Roadmap

## Wave 1: Analytics & Smart Notifications

### Professional Dashboard
- [ ] Trend chart: average rating over time (7d, 30d, 90d, all-time)
- [ ] Comparison with platform average
- [ ] Breakdown by session type (TRAINING vs ASSESSMENT)
- [ ] Unread feedback badge (count of feedbacks not yet `reviewedByProfessional`)

### Smart Notification Timing
- [ ] ML model to predict optimal time to send notification per client
- [ ] A/B test notification copy to maximize feedback submission rate
- [ ] Progressive reminders: immediate → +24h → +42h (6h before window closes)

### Pending Feedbacks View (Client)
- [ ] `GetClientPendingFeedbacksUseCase`: list of bookings awaiting feedback
- [ ] Sort by `windowExpiresAt ASC` (most urgent first)
- [ ] `hoursRemaining` field to show urgency

---

## Wave 2: Multi-Criteria Rating & NLP

### Expand Rating to Multiple Dimensions
- [ ] `qualityRating` (session quality)
- [ ] `punctualityRating` (professional arrived on time)
- [ ] `communicationRating` (clarity, active listening)
- [ ] `overallRating` = weighted average of 3 dimensions
- [ ] Aggregate `SessionRating` VO → `SessionRatings` composite VO

### NLP Comment Analysis
- [ ] Sentiment score on free-text comment (−1 to +1)
- [ ] Topic extraction: "atraso", "excelente", "despreparado", etc.
- [ ] Auto-flag keywords: "rude", "unsafe", "harassment"
- [ ] Word cloud per professional (admin dashboard)

---

## Wave 3: Professional Response & Advanced Moderation

### Professional Can Respond
- [ ] `ProfessionalFeedbackResponse` entity (subordinate to `SessionFeedback`)
- [ ] `RespondToSessionFeedbackUseCase`
- [ ] Response visible to professional and admin (not client — different from public review)

### AI-Assisted Moderation
- [ ] Auto-flag offensive language before save
- [ ] Detect suspicious patterns: same IP, rapid sequential submissions
- [ ] `flagRate` per professional: if >80% feedbacks flagged → admin alert
- [ ] Admin moderation dashboard with decision history

---

## Wave 4: Bidirectional Feedback

### Professional Evaluates Client
- [ ] `ProfessionalSessionFeedback` aggregate (separate from `SessionFeedback`)
- [ ] Behavioral flags: LATE, UNPREPARED, RUDE, CANCELLED_LAST_MINUTE
- [ ] `ClientBehaviorScore` VO (affects client visibility in marketplace)
- [ ] Client cannot see own behavioral flags (admin-only)

---

## Wave 5: Marketplace Integration & Gamification

### Feedback Affects Search Ranking
- [ ] `SessionFeedback` average contributes 30% to public score
- [ ] `ProfessionalReview` contributes 70% (existing system)
- [ ] Professionals with average ≥ 4.7 receive search boost

### Badges
- [ ] "Perfect Sessions": 10 consecutive 5-star feedbacks
- [ ] "Consistent Quality": rating ≥ 4.5 maintained for 6 months
- [ ] Client: "Feedback Contributor": submitted 50+ feedbacks

---

## Wave 6: Compliance & Privacy

### LGPD / GDPR
- [ ] Right to erasure: anonymize comment text after client account deletion
- [ ] Data export: include `SessionFeedback` in LGPD export package
- [ ] Auto-anonymize after 5 years of inactivity

### Audit Trail
- [ ] Immutable log of all `flag` and `hide` actions
- [ ] Monthly compliance report for admin (count flagged, hidden, risk events)

---

## Performance Optimizations (Any Wave)

- [ ] Cache `averageRating` in Redis (invalidate on new feedback or hide)
- [ ] Pre-compute risk count nightly (avoid on-demand DB aggregation)
- [ ] Partial indexes on Postgres for negative-only and hidden-only queries
- [ ] Read replica for analytics queries (separate from write path)

---

## Prioritization

| Wave | Value | Effort |
|---|---|---|
| Wave 1: Analytics + Notifications | High | Medium |
| Wave 2: NLP + Multi-criteria | High | High |
| Wave 3: Response + Moderation AI | Medium | High |
| Wave 4: Bidirectional | Medium | Medium |
| Wave 5: Marketplace + Gamification | Medium | Low |
| Wave 6: Compliance | Must-have | Low |
