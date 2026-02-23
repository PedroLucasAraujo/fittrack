import type {
  IDeliverablePort,
  DeliverableView,
} from '../../application/ports/deliverable-port.js';

/**
 * In-memory stub for IDeliverablePort — used in application-layer unit tests.
 *
 * Tests add `DeliverableView` records to `items` to control what the use case
 * sees. The `findById` method enforces tenant isolation by filtering on
 * `professionalProfileId`, matching the contract from ADR-0025.
 */
export class InMemoryDeliverableStub implements IDeliverablePort {
  public items: DeliverableView[] = [];

  async findById(
    deliverableId: string,
    professionalProfileId: string,
  ): Promise<DeliverableView | null> {
    return (
      this.items.find(
        (d) => d.id === deliverableId && d.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }
}
