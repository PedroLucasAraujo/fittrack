import type { ICreateExecutionUnitOfWork } from '../../application/ports/create-execution-unit-of-work-port.js';
import type { Execution } from '../../domain/aggregates/execution.js';

/**
 * In-memory stub for ICreateExecutionUnitOfWork.
 *
 * Simulates atomic persistence of Execution + sessionsConsumed increment
 * without a real database transaction.
 *
 * Inspect `items` to assert persistence and `incrementedFor` to assert
 * that session consumption was triggered for the correct AccessGrant.
 */
export class InMemoryCreateExecutionUnitOfWork implements ICreateExecutionUnitOfWork {
  /** Executions committed via this unit of work. */
  public items: Execution[] = [];

  /** Ordered list of accessGrantIds for which sessionsConsumed was incremented. */
  public incrementedFor: string[] = [];

  async commitExecution(execution: Execution, accessGrantId: string): Promise<void> {
    this.items.push(execution);
    this.incrementedFor.push(accessGrantId);
  }
}
