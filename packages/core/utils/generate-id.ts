import { randomUUID } from 'node:crypto';

/**
 * Generates a cryptographically random UUIDv4.
 *
 * This is the canonical ID generation function for all aggregate roots and
 * entities in FitTrack (ADR-0047 §6). All new entity IDs must be generated
 * here — never via `Math.random()` or third-party UUID libraries.
 *
 * Uses the Node.js built-in `crypto.randomUUID()`, available since Node 14.17.
 * No external dependency required.
 */
export function generateId(): string {
  return randomUUID();
}
