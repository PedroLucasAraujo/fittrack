// ── Domain — Errors ───────────────────────────────────────────────────────────
export { RiskErrorCodes } from './domain/errors/risk-error-codes.js';
export type { RiskErrorCode } from './domain/errors/risk-error-codes.js';
export { ProfessionalRiskNotFoundError } from './domain/errors/professional-risk-not-found-error.js';
export { InvalidRiskReasonError } from './domain/errors/invalid-risk-reason-error.js';
export { InvalidRiskIndicatorError } from './domain/errors/invalid-risk-indicator-error.js';

// ── Domain — Value Objects ────────────────────────────────────────────────────
export { RiskThreshold } from './domain/value-objects/risk-threshold.js';
export { RiskIndicators } from './domain/value-objects/risk-indicators.js';

// ── Application — Ports ───────────────────────────────────────────────────────
export type { IProfessionalRiskRepository } from './application/ports/professional-risk-repository-port.js';
export type { IRiskEventPublisher } from './application/ports/risk-event-publisher-port.js';
export type {
  IRiskAuditLog,
  RiskStatusChangedAuditData,
} from './application/ports/risk-audit-log-port.js';

// ── Application — DTOs ────────────────────────────────────────────────────────
export type { EscalateToWatchlistInputDTO } from './application/dtos/escalate-to-watchlist-input-dto.js';
export type { ResolveWatchlistInputDTO } from './application/dtos/resolve-watchlist-input-dto.js';
export type { BanProfessionalInputDTO } from './application/dtos/ban-professional-input-dto.js';
export type { HandlePaymentFailedRiskAssessmentInputDTO } from './application/dtos/handle-payment-failed-risk-assessment-input-dto.js';
export type { HandleHighCancellationRateAssessmentInputDTO } from './application/dtos/handle-high-cancellation-rate-assessment-input-dto.js';
export type { ProcessAdministrativeRiskReportInputDTO } from './application/dtos/process-administrative-risk-report-input-dto.js';

// ── Application — Use Cases ───────────────────────────────────────────────────
export { EscalateToWatchlist } from './application/use-cases/escalate-to-watchlist.js';
export { ResolveWatchlist } from './application/use-cases/resolve-watchlist.js';
export { BanProfessional } from './application/use-cases/ban-professional.js';
export { HandleChargebackRiskAssessment } from './application/use-cases/handle-chargeback-risk-assessment.js';
export { HandlePaymentFailedRiskAssessment } from './application/use-cases/handle-payment-failed-risk-assessment.js';
export { HandleHighCancellationRateAssessment } from './application/use-cases/handle-high-cancellation-rate-assessment.js';
export { ProcessAdministrativeRiskReport } from './application/use-cases/process-administrative-risk-report.js';
