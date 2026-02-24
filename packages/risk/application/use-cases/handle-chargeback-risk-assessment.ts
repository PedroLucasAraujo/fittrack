import { left, right, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { RiskStatus, RiskStatusChanged } from '@fittrack/identity';
import type { ChargebackRegistered } from '@fittrack/billing';
import { ProfessionalRiskNotFoundError } from '../../domain/errors/professional-risk-not-found-error.js';
import type { IProfessionalRiskRepository } from '../ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../ports/risk-audit-log-port.js';

/**
 * Automated risk escalation triggered by the `ChargebackRegistered` domain
 * event (ADR-0022 §3, ADR-0020).
 *
 * ## Escalation logic
 *
 * | Current RiskStatus | Outcome |
 * |--------------------|---------|
 * | NORMAL             | NORMAL → WATCHLIST (first chargeback signal) |
 * | WATCHLIST          | WATCHLIST → BANNED (repeated chargeback pattern) |
 * | BANNED             | No-op — idempotent return (terminal state) |
 *
 * ## Evidence reference
 * `evidenceRef` is set to `event.aggregateId` (the Transaction ID that
 * carried the chargeback). The `ChargebackRegistered` event does not include
 * a dedicated chargebackId in its current payload (billing package gap);
 * the transactionId is the best available reference.
 *
 * ## AuditLog actor (ADR-0027 §3)
 * Automated actions use `actorId = 'SYSTEM'` and `actorRole = 'SYSTEM'`
 * to distinguish from human-initiated actions in the audit trail.
 *
 * ## Idempotency (ADR-0007)
 * If the same `ChargebackRegistered` event is delivered twice:
 * - First delivery (NORMAL): NORMAL → WATCHLIST
 * - Second delivery (WATCHLIST): WATCHLIST → BANNED
 *
 * This is behaviorally correct — two distinct chargeback events should trigger
 * escalation. Full event-ID idempotency (ADR-0007 §6) is an infrastructure
 * concern at the event-bus adapter layer.
 *
 * ## One aggregate per transaction (ADR-0003)
 * Only `ProfessionalProfile` is modified. AccessGrant suspension is handled
 * by the Billing context reacting to `RiskStatusChanged(BANNED)`.
 */
export class HandleChargebackRiskAssessment {
  constructor(
    private readonly repo: IProfessionalRiskRepository,
    private readonly eventPublisher: IRiskEventPublisher,
    private readonly auditLog: IRiskAuditLog,
  ) {}

  async execute(event: ChargebackRegistered): Promise<DomainResult<void>> {
    // event.tenantId = professionalProfileId (ADR-0009 §2 tenantId convention)
    const professionalProfileId = event.tenantId;

    // 1. Load aggregate
    const profile = await this.repo.findById(professionalProfileId);
    if (profile === null) {
      return left(new ProfessionalRiskNotFoundError(professionalProfileId));
    }

    // 2. Idempotency guard — BANNED is terminal (ADR-0022 Invariant 1)
    if (profile.riskStatus === RiskStatus.BANNED) {
      return right(undefined);
    }

    // 3. Capture previous status for event payload
    const previousStatus = profile.riskStatus;
    // event.aggregateId = transactionId (best available evidence reference)
    const evidenceRef = event.aggregateId;

    // 4. Escalate based on current RiskStatus
    let transitionResult;
    if (profile.riskStatus === RiskStatus.NORMAL) {
      transitionResult = profile.escalateToWatchlist();
    } else {
      // WATCHLIST → BANNED on repeated chargeback pattern
      transitionResult = profile.escalateToBanned(
        `Repeated chargebacks: transactionId=${event.aggregateId}`,
      );
    }

    if (transitionResult.isLeft()) return left(transitionResult.value);

    // 5. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(profile);

    // 6. Write AuditLog entry post-commit, fire-and-forget (ADR-0027 §2, ADR-0027 §3)
    // Automated actions use actorId='SYSTEM', actorRole='SYSTEM' (ADR-0027 §3)
    await this.auditLog.writeRiskStatusChanged({
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      targetEntityId: profile.id,
      tenantId: profile.id,
      previousStatus,
      newStatus: profile.riskStatus,
      reason: `Chargeback registered: transactionId=${event.aggregateId}`,
      occurredAtUtc: UTCDateTime.now().value,
    });

    // 7. Publish RiskStatusChanged v2 post-commit (ADR-0009 §4)
    await this.eventPublisher.publishRiskStatusChanged(
      new RiskStatusChanged(profile.id, profile.id, {
        previousStatus,
        newStatus: profile.riskStatus,
        reason: `Chargeback registered: transactionId=${event.aggregateId}`,
        evidenceRef,
      }),
    );

    return right(undefined);
  }
}
