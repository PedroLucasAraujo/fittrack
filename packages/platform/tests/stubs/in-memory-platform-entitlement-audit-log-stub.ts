import type {
  IPlatformEntitlementAuditLog,
  PlatformEntitlementChangedAuditData,
} from '../../application/ports/platform-entitlement-audit-log-port.js';

export class InMemoryPlatformEntitlementAuditLogStub implements IPlatformEntitlementAuditLog {
  public written: PlatformEntitlementChangedAuditData[] = [];

  async writePlatformEntitlementChanged(data: PlatformEntitlementChangedAuditData): Promise<void> {
    this.written.push(data);
  }
}
