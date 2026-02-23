import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { IExecutionRepository } from '../../domain/repositories/execution-repository.js';
import type { ListExecutionsInputDTO } from '../dtos/list-executions-input-dto.js';
import type { ListExecutionsOutputDTO } from '../dtos/list-executions-output-dto.js';

/**
 * Returns a paginated list of Executions for the requesting tenant.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): all results scoped to `professionalProfileId`.
 *
 * Results are ordered by `occurredAtUtc` descending (most recent first).
 * Includes a `correctionCount` per item for summary display without loading
 * full correction histories.
 */
export class ListExecutions {
  constructor(private readonly executionRepository: IExecutionRepository) {}

  async execute(dto: ListExecutionsInputDTO): Promise<DomainResult<ListExecutionsOutputDTO>> {
    const result = await this.executionRepository.findManyByProfessionalProfileId(
      dto.professionalProfileId,
      { page: dto.page, limit: dto.limit },
    );

    return right({
      items: result.items.map((e) => ({
        executionId: e.id,
        clientId: e.clientId,
        deliverableId: e.deliverableId,
        occurredAtUtc: e.occurredAtUtc.toISO(),
        logicalDay: e.logicalDay.value,
        timezoneUsed: e.timezoneUsed,
        status: e.status,
        correctionCount: e.corrections.length,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage,
    });
  }
}
