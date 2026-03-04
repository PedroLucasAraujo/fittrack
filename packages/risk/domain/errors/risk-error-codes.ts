/**
 * Error code registry for the Risk bounded context.
 *
 * Namespaced with `RISK.` prefix to avoid collisions with codes from other
 * bounded contexts (ADR-0022).
 */
export const RiskErrorCodes = {
  PROFESSIONAL_NOT_FOUND: 'RISK.PROFESSIONAL_NOT_FOUND',
  REASON_INVALID: 'RISK.REASON_INVALID',
  RISK_INDICATOR_INVALID: 'RISK.RISK_INDICATOR_INVALID',
} as const;

export type RiskErrorCode = (typeof RiskErrorCodes)[keyof typeof RiskErrorCodes];
