/**
 * Financial and operational risk classification for a professional (ADR-0022).
 *
 * RiskStatus is the canonical signal that downstream contexts (Billing,
 * Scheduling, Execution) consult when deciding whether a professional may
 * accept new sales, create bookings, or record executions.
 *
 * ## Transition rules (ADR-0022 §2)
 *
 * | From       | To         | Trigger                                    |
 * |------------|------------|--------------------------------------------|
 * | NORMAL     | WATCHLIST  | Risk threshold exceeded (e.g. >2% chargebacks) |
 * | NORMAL     | BANNED     | Confirmed violation, fraud, or abuse       |
 * | WATCHLIST  | NORMAL     | Risk resolved; manual review passed        |
 * | WATCHLIST  | BANNED     | Escalation from watchlist                  |
 * | BANNED     | —          | **Terminal — no transitions out**           |
 *
 * BANNED is permanent and irreversible by design.
 */
export enum RiskStatus {
  NORMAL = 'NORMAL',
  WATCHLIST = 'WATCHLIST',
  BANNED = 'BANNED',
}
