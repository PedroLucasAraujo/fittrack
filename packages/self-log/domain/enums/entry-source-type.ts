/**
 * Discriminates how a SelfLogEntry was created (ADR-0014 §3).
 *
 * - SELF: User manually logged an activity without a professional prescription.
 *   These entries are personal tracking data and are never used in domain rule
 *   evaluation (AccessGrant validation, metric derivation, etc.).
 *
 * - EXECUTION: Entry was projected from a confirmed Execution record.
 *   Created by the SelfLog projection handler in response to ExecutionRecorded
 *   (ADR-0016 §3 eventual consistency model). Reflects Execution data but does
 *   not supersede it — Execution remains the authoritative source (ADR-0005,
 *   ADR-0014 §1).
 */
export const EntrySourceType = {
  SELF: 'SELF',
  EXECUTION: 'EXECUTION',
} as const;

export type EntrySourceType = (typeof EntrySourceType)[keyof typeof EntrySourceType];
