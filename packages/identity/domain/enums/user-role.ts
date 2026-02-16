/**
 * Platform-wide user role (ADR-0023 §4).
 *
 * One primary role per user, assigned at creation and **not dynamically
 * changeable**. The role is embedded in the JWT access token claims and
 * drives authorization policy evaluation (ADR-0024).
 */
export enum UserRole {
  CLIENT = 'CLIENT',
  PROFESSIONAL = 'PROFESSIONAL',
  ADMIN = 'ADMIN',
}
