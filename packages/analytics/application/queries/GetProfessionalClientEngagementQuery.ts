import type { DomainResult } from '@fittrack/core';
import { right } from '@fittrack/core';
import type {
  IProfessionalClientsDashboardReadModel,
  ClientEngagementDTO,
} from '../read-models/IProfessionalClientsDashboardReadModel.js';

export interface GetProfessionalClientEngagementInput {
  professionalProfileId: string;
  /** If true, returns only at-risk clients. Defaults to false. */
  atRiskOnly?: boolean;
}

export interface GetProfessionalClientEngagementOutput {
  clients: ClientEngagementDTO[];
  totalCount: number;
  atRiskCount: number;
}

/**
 * Query handler for the professional clients engagement dashboard.
 *
 * Returns all client engagement summaries for a professional.
 * Tenant-scoped by professionalProfileId (ADR-0025).
 */
export class GetProfessionalClientEngagementQuery {
  constructor(
    private readonly readModel: IProfessionalClientsDashboardReadModel,
  ) {}

  async execute(
    input: GetProfessionalClientEngagementInput,
  ): Promise<DomainResult<GetProfessionalClientEngagementOutput>> {
    const clients = input.atRiskOnly
      ? await this.readModel.findAtRiskByProfessional(input.professionalProfileId)
      : await this.readModel.findByProfessional(input.professionalProfileId);

    const atRiskCount = clients.filter((c) => c.isAtRisk).length;

    return right({
      clients,
      totalCount: clients.length,
      atRiskCount,
    });
  }
}
