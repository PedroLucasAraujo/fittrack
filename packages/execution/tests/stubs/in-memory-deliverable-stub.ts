import type { IDeliverableVerificationPort } from '../../application/ports/deliverable-port.js';

/**
 * In-memory stub for IDeliverableVerificationPort.
 *
 * Use `markActive(deliverableId)` to register a Deliverable as ACTIVE
 * before calling use cases that require an active Deliverable.
 */
export class InMemoryDeliverableStub implements IDeliverableVerificationPort {
  private readonly activeIds = new Set<string>();

  markActive(deliverableId: string): void {
    this.activeIds.add(deliverableId);
  }

  async isActive(deliverableId: string, professionalProfileId: string): Promise<boolean> {
    void professionalProfileId;
    return this.activeIds.has(deliverableId);
  }
}
