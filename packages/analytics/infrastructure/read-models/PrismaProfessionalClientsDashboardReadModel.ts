import type {
  IProfessionalClientsDashboardReadModel,
  ClientEngagementDTO,
} from '../../application/read-models/IProfessionalClientsDashboardReadModel.js';

/**
 * Prisma implementation of the professional clients engagement dashboard read model.
 *
 * TODO: Inject PrismaClient and implement queries against professional_clients_dashboard table.
 */
export class PrismaProfessionalClientsDashboardReadModel
  implements IProfessionalClientsDashboardReadModel
{
  findByProfessional(_professionalProfileId: string): Promise<ClientEngagementDTO[]> {
    throw new Error(
      'PrismaProfessionalClientsDashboardReadModel.findByProfessional not implemented',
    );
  }

  findAtRiskByProfessional(_professionalProfileId: string): Promise<ClientEngagementDTO[]> {
    throw new Error(
      'PrismaProfessionalClientsDashboardReadModel.findAtRiskByProfessional not implemented',
    );
  }
}
