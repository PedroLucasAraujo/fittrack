/**
 * Error code registry for the Platform bounded context.
 *
 * Namespaced with `PLATFORM.` prefix to avoid collisions with codes from
 * other bounded contexts.
 */
export const PlatformErrorCodes = {
  ENTITLEMENT_NOT_FOUND: 'PLATFORM.ENTITLEMENT_NOT_FOUND',
  INVALID_TRANSITION: 'PLATFORM.INVALID_TRANSITION',
  INVALID_REASON: 'PLATFORM.INVALID_REASON',
} as const;

export type PlatformErrorCode = (typeof PlatformErrorCodes)[keyof typeof PlatformErrorCodes];
