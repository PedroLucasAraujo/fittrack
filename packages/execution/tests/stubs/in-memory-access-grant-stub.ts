import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrantInvalidError } from '../../domain/errors/access-grant-invalid-error.js';
import type { IAccessGrantPort } from '../../application/ports/access-grant-port.js';

/**
 * In-memory stub for IAccessGrantPort.
 *
 * Configure `shouldValidationSucceed` and `validationFailReason` before each test.
 * Tracks all `incrementSessionsConsumed` calls in `incrementedFor`.
 */
export class InMemoryAccessGrantStub implements IAccessGrantPort {
  shouldValidationSucceed = true;
  validationFailReason = 'access grant is not valid';

  /** Ordered list of accessGrantIds passed to `incrementSessionsConsumed`. */
  incrementedFor: string[] = [];

  async validate(params: {
    accessGrantId: string;
    clientId: string;
    professionalProfileId: string;
    currentUtc: string;
  }): Promise<DomainResult<void>> {
    void params;
    if (this.shouldValidationSucceed) {
      return right(undefined);
    }
    return left(new AccessGrantInvalidError(this.validationFailReason));
  }

  async incrementSessionsConsumed(accessGrantId: string): Promise<void> {
    this.incrementedFor.push(accessGrantId);
  }
}
