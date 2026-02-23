import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrantInvalidError } from '../../domain/errors/access-grant-invalid-error.js';
import type { IAccessGrantPort } from '../../application/ports/access-grant-port.js';

/**
 * In-memory stub for IAccessGrantPort.
 *
 * Configure `shouldValidationSucceed` and `validationFailReason` before each test.
 * Session consumption is handled by InMemoryCreateExecutionUnitOfWork.
 */
export class InMemoryAccessGrantStub implements IAccessGrantPort {
  shouldValidationSucceed = true;
  validationFailReason = 'access grant is not valid';

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
}
