// ── Application — Read Models ──────────────────────────────────────────────────
export type {
  UserEngagementDashboardDTO,
  UpsertUserEngagementDashboardInput,
  MarkAtRiskInput,
  IUserEngagementDashboardReadModel,
} from './application/read-models/IUserEngagementDashboardReadModel.js';
export type {
  ClientEngagementDTO,
  IProfessionalClientsDashboardReadModel,
} from './application/read-models/IProfessionalClientsDashboardReadModel.js';
export type {
  PlatformMetricsDTO,
  IncrementPlatformCountersInput,
  IPlatformMetricsReadModel,
} from './application/read-models/IPlatformMetricsReadModel.js';

// ── Application — Queries ──────────────────────────────────────────────────────
export { GetUserEngagementDashboardQuery } from './application/queries/GetUserEngagementDashboardQuery.js';
export type {
  GetUserEngagementDashboardInput,
} from './application/queries/GetUserEngagementDashboardQuery.js';
export { GetProfessionalClientEngagementQuery } from './application/queries/GetProfessionalClientEngagementQuery.js';
export type {
  GetProfessionalClientEngagementInput,
  GetProfessionalClientEngagementOutput,
} from './application/queries/GetProfessionalClientEngagementQuery.js';
export { GetPlatformMetricsQuery } from './application/queries/GetPlatformMetricsQuery.js';
export type {
  GetPlatformMetricsInput,
  GetPlatformMetricsOutput,
} from './application/queries/GetPlatformMetricsQuery.js';

// ── Application — Projections ──────────────────────────────────────────────────
export { UserEngagementProjection } from './application/projections/UserEngagementProjection.js';
export { PlatformMetricsProjection } from './application/projections/PlatformMetricsProjection.js';
