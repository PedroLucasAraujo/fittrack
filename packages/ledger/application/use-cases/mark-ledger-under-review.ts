import { DomainResult, left, right } from '@fittrack/core';
import { LedgerStatusChangedEvent } from '../../domain/events/ledger-status-changed-event.js';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ILedgerEventPublisher } from '../ports/i-ledger-event-publisher.js';
import { LedgerStatusTransitionInputDTO } from '../dtos/ledger-status-transition-input-dto.js';
import { LedgerStatusTransitionOutputDTO } from '../dtos/ledger-status-transition-output-dto.js';

/**
 * Places a FinancialLedger under review, blocking payout operations.
 * Typically triggered by the Risk context when isInDebt=true (ADR-0021 §8, ADR-0022).
 * Returns Left(InvalidLedgerStatusTransitionError) if already UNDER_REVIEW.
 */
export class MarkLedgerUnderReview {
  constructor(
    private readonly ledgerRepository: IFinancialLedgerRepository,
    private readonly eventPublisher: ILedgerEventPublisher,
  ) {}

  async execute(
    dto: LedgerStatusTransitionInputDTO,
  ): Promise<DomainResult<LedgerStatusTransitionOutputDTO>> {
    const ledger = await this.ledgerRepository.findByProfessionalProfileId(
      dto.professionalProfileId,
    );
    if (!ledger) {
      return left(new LedgerNotFoundError(dto.professionalProfileId));
    }

    const previousStatus = ledger.status;

    const result = ledger.markUnderReview();
    if (result.isLeft()) return left(result.value);

    await this.ledgerRepository.save(ledger);

    await this.eventPublisher.publishLedgerStatusChanged(
      new LedgerStatusChangedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        previousStatus,
        newStatus: ledger.status,
        reason: dto.reason,
      }),
    );

    return right({ ledgerId: ledger.id, previousStatus, newStatus: ledger.status });
  }
}
