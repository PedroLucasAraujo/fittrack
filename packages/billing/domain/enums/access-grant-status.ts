/**
 * AccessGrant lifecycle states (ADR-0046 §2).
 *
 * | Status    | Execution Permitted | Terminal |
 * |-----------|--------------------|---------:|
 * | ACTIVE    | Yes                |       No |
 * | SUSPENDED | No                 |       No |
 * | EXPIRED   | No                 |      Yes |
 * | REVOKED   | No                 |      Yes |
 */
export enum AccessGrantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}
