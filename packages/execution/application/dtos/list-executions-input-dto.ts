/**
 * Input for the ListExecutions use case.
 *
 * `professionalProfileId` scopes the query to the requesting tenant (ADR-0025).
 * `page` and `limit` follow the `PageRequest` convention (1-indexed).
 */
export interface ListExecutionsInputDTO {
  /** UUID of the professional; sourced from JWT (ADR-0025). */
  professionalProfileId: string;

  /** 1-indexed page number. Must be ≥ 1. */
  page: number;

  /** Maximum number of items per page. Must be ≥ 1. */
  limit: number;
}
