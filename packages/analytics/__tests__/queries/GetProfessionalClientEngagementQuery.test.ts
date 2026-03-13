import { describe, it, expect, vi } from 'vitest';
import { GetProfessionalClientEngagementQuery } from '../../application/queries/GetProfessionalClientEngagementQuery.js';
import type { IProfessionalClientsDashboardReadModel, ClientEngagementDTO } from '../../application/read-models/IProfessionalClientsDashboardReadModel.js';

function makeClient(isAtRisk = false): ClientEngagementDTO {
  return {
    professionalProfileId: '550e8400-e29b-41d4-a716-446655440010',
    clientId: '550e8400-e29b-41d4-a716-446655440001',
    clientName: 'Test Client',
    engagementScore: 65,
    engagementLevel: 'HIGH',
    trend: 'STABLE',
    trendPercentage: null,
    isAtRisk,
    daysInactive: null,
    lastActivityDate: '2026-03-12',
    calculatedAt: '2026-03-12T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  };
}

function makeReadModel(allClients: ClientEngagementDTO[], atRiskClients: ClientEngagementDTO[]): IProfessionalClientsDashboardReadModel {
  return {
    findByProfessional: vi.fn().mockResolvedValue(allClients),
    findAtRiskByProfessional: vi.fn().mockResolvedValue(atRiskClients),
  };
}

const profId = '550e8400-e29b-41d4-a716-446655440010';

describe('GetProfessionalClientEngagementQuery', () => {
  it('returns all clients when atRiskOnly is false', async () => {
    const c1 = makeClient(false);
    const c2 = makeClient(true);
    const rm = makeReadModel([c1, c2], [c2]);
    const query = new GetProfessionalClientEngagementQuery(rm);

    const result = await query.execute({ professionalProfileId: profId });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.clients).toHaveLength(2);
    expect(output.totalCount).toBe(2);
    expect(output.atRiskCount).toBe(1);
    expect(rm.findByProfessional).toHaveBeenCalledWith(profId);
    expect(rm.findAtRiskByProfessional).not.toHaveBeenCalled();
  });

  it('returns only at-risk clients when atRiskOnly is true', async () => {
    const c1 = makeClient(false);
    const c2 = makeClient(true);
    const rm = makeReadModel([c1, c2], [c2]);
    const query = new GetProfessionalClientEngagementQuery(rm);

    const result = await query.execute({ professionalProfileId: profId, atRiskOnly: true });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.clients).toHaveLength(1);
    expect(output.totalCount).toBe(1);
    expect(output.atRiskCount).toBe(1);
    expect(rm.findAtRiskByProfessional).toHaveBeenCalledWith(profId);
    expect(rm.findByProfessional).not.toHaveBeenCalled();
  });

  it('returns empty list when professional has no clients', async () => {
    const rm = makeReadModel([], []);
    const query = new GetProfessionalClientEngagementQuery(rm);

    const result = await query.execute({ professionalProfileId: profId });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.clients).toHaveLength(0);
    expect(output.totalCount).toBe(0);
    expect(output.atRiskCount).toBe(0);
  });
});
