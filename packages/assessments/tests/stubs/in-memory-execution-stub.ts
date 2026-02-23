import type { IExecutionPort, ExecutionView } from '../../application/ports/execution-port.js';

/**
 * In-memory stub for IExecutionPort — used in application-layer unit tests.
 *
 * Tests add `ExecutionView` records to `items` to control what the use case
 * sees. The `findById` method enforces tenant isolation by filtering on
 * `professionalProfileId`, matching the contract from ADR-0025.
 */
export class InMemoryExecutionStub implements IExecutionPort {
  public items: ExecutionView[] = [];

  async findById(
    executionId: string,
    professionalProfileId: string,
  ): Promise<ExecutionView | null> {
    return (
      this.items.find(
        (e) => e.id === executionId && e.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }
}
