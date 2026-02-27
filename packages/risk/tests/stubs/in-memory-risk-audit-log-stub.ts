import type {
  IRiskAuditLog,
  RiskStatusChangedAuditData,
} from '../../application/ports/risk-audit-log-port.js';

export class InMemoryRiskAuditLogStub implements IRiskAuditLog {
  public written: RiskStatusChangedAuditData[] = [];

  async writeRiskStatusChanged(data: RiskStatusChangedAuditData): Promise<void> {
    this.written.push(data);
  }
}
