/**
 * Lifecycle status for CatalogItem (ADR-0011 §7).
 *
 * State machine:
 *
 * ```
 * ACTIVE ──────────────────► DEPRECATED ──► ARCHIVED
 *   │                                           ▲
 *   └───────────────────────────────────────────┘
 * ```
 *
 * | Status     | New prescriptions | Content mutation | Description                     |
 * |------------|-------------------|------------------|---------------------------------|
 * | ACTIVE     | Allowed           | Allowed          | In use and recommended          |
 * | DEPRECATED | Allowed           | Allowed          | Still usable; not recommended   |
 * | ARCHIVED   | Blocked           | Blocked          | Permanently retired; read-only  |
 *
 * Existing snapshots embedded in Deliverables are unaffected by any transition (ADR-0011 §3).
 */
export enum CatalogItemStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}
