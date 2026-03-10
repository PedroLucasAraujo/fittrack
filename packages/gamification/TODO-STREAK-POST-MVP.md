# Streak Tracking — Post-MVP Backlog

## Wave 1: Notifications + Analytics (High Value, Low Cost)

### Proactive Notifications
- [ ] Push notification at 20:00 user-local time: "Your streak is at risk — log an activity today!"
- [ ] Notification when freeze token is earned: "You earned a freeze token! 🎉"
- [ ] Notification when personal record is beaten (use StreakIncrementedEvent.longestStreak change)
- [ ] Milestone notifications: 7, 30, 100, 365 days

### Personal Analytics Dashboard
- [ ] Streak history chart (current and past streak runs)
- [ ] "Your weakest day" insight (day of week with most breaks)
- [ ] Average streak length per month
- [ ] Total active days in the past 90 days

## Wave 2: Leaderboards + Social (Engagement)

### Leaderboards
- [ ] Global current-streak leaderboard (paginated, opt-in)
- [ ] Longest-streak all-time leaderboard
- [ ] Friend group leaderboard (requires social graph)

### Social Features
- [ ] Share milestone to social media ("I hit 30 days on FitTrack!")
- [ ] Friend streaks visibility
- [ ] Kudos system for friends' milestones

## Wave 3: Multiple Streaks (Depth)

### Per-Activity-Type Streaks
- [ ] Separate workout streak (Execution only — already MVP)
- [ ] Nutrition streak (requires SelfLog events to count — MVP excluded by design)
- [ ] Assessment streak (optional, for assessment-heavy programs)
- [ ] User configures which types count toward their streak

### Per-Professional Streaks
- [ ] Client can have a streak scoped to one professional
- [ ] Professional dashboard shows client streaks (engagement indicator)

## Wave 4: Gamification Depth (Retention)

### Advanced Freeze Token Types
- [ ] 3-day freeze: earned at 30-day streak milestones
- [ ] 7-day vacation mode: user-triggered, max 2 per year, streak paused
- [ ] Premium users: increased freeze token cap (4 instead of 2)

### Streak-Linked Achievements (extend packages/achievements)
- [ ] "Week Warrior" — reach 7-day streak
- [ ] "Month Master" — reach 30-day streak
- [ ] "Century Club" — reach 100-day streak
- [ ] "Year Hero" — reach 365-day streak
- [ ] "First Freeze" — earn first freeze token
- [ ] "Resilient" — use a freeze token and maintain streak for 30 more days
- [ ] "Never Broke" — reach 30 days without ever having a streak reset

## Wave 5: Anti-Fraud Hardening (Trust)

### Integrity Improvements
- [ ] Rate-limit: max N streak increments per user per day (prevent event replay attacks)
- [ ] Admin UI for reviewing StreakIntegrityViolationEvent entries
- [ ] Auto-correction: if discrepancy detected 3× in a row, flag account for review
- [ ] Audit log: immutable history of every streak change (increment, break, freeze use)

### Apelação (Appeal) System
- [ ] User can open a ticket if streak was broken due to system bug
- [ ] Admin reviews execution logs and can restore streak with justification
- [ ] Correction history stored for compliance

## Wave 6: Entitlements + Rewards (Monetization)

### Streak-Linked Discounts (Billing Integration)
- [ ] 5% subscription discount for streaks ≥ 30 days
- [ ] 10% discount for streaks ≥ 100 days
- [ ] Integrate with packages/billing discount system

### Platform Entitlements
- [ ] Unlock 1-week free trial of premium feature at 50-day streak
- [ ] Early access to beta features for 100+ day users

## Wave 7: Compliance + LGPD

### Data Subject Rights
- [ ] Right to erasure: delete StreakTracker and all related events on LGPD request
- [ ] Data export: include streak history in user data export
- [ ] Anonymization: after account deletion, retain anonymized aggregate stats only

---

**Prioritization Note:**
Wave 1 → Wave 2 → Wave 4 → Wave 3 → Wave 5 → Wave 6 → Wave 7

Start with notifications (Wave 1) because they drive re-engagement with zero new domain
complexity. Achievements (Wave 4) come before multiple streaks (Wave 3) because they
extend the existing packages/achievements system without new aggregates.
