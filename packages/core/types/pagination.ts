/**
 * Input parameters for a paginated repository or read-model query.
 *
 * `page` is 1-indexed (page 1 = first page).
 * `limit` is the maximum number of items to return per page.
 */
export interface PageRequest {
  /** 1-indexed page number. Must be ≥ 1. */
  page: number;
  /** Maximum number of items per page. Must be ≥ 1. */
  limit: number;
}

/**
 * Paginated result returned by repository or read-model queries.
 *
 * `total` is the count of all matching items across all pages (not just the
 * current page). Use `total` and `limit` to compute the total page count.
 *
 * `hasNextPage` is a convenience flag; it is equivalent to
 * `page * limit < total`.
 */
export interface PaginatedResult<T> {
  /** Items on the current page. Length ≤ `limit`. */
  items: T[];
  /** Total number of matching items across all pages. */
  total: number;
  /** The current page number (1-indexed). */
  page: number;
  /** The page size requested. */
  limit: number;
  /** `true` when there are more items beyond the current page. */
  hasNextPage: boolean;
}
