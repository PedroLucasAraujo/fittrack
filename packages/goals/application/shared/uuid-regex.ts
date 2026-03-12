/**
 * UUIDv4 regex shared across all use cases in the Goals bounded context.
 * Centralised to avoid duplication and ensure consistency (ADR-0047 §6).
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
