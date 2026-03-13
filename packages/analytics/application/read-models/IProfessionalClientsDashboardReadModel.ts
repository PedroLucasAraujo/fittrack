export interface ClientEngagementDTO {
  professionalProfileId: string;
  clientId: string;
  clientName: string;
  engagementScore: number;
  engagementLevel: string;
  trend: string;
  trendPercentage: number | null;
  isAtRisk: boolean;
  daysInactive: number | null;
  lastActivityDate: string | null;
  calculatedAt: string;
  updatedAt: string;
}

/**
 * Read model interface for professional clients engagement dashboard (CQRS read side).
 *
 * Queries the denormalized `professional_clients_dashboard` table.
 * Tenant-scoped: all queries include professionalProfileId (ADR-0025).
 */
export interface IProfessionalClientsDashboardReadModel {
  /** Returns all clients' engagement for a professional, ordered by score desc. */
  findByProfessional(professionalProfileId: string): Promise<ClientEngagementDTO[]>;

  /** Returns only at-risk clients for a professional. */
  findAtRiskByProfessional(professionalProfileId: string): Promise<ClientEngagementDTO[]>;
}
