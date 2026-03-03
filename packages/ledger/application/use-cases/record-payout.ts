import { DomainResult, Money, left, right } from '@fittrack/core';
import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { PayoutCompletedEvent } from '../../domain/events/payout-completed-event.js';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ILedgerEventPublisher } from '../ports/i-ledger-event-publisher.js';
import { RecordPayoutInputDTO } from '../dtos/record-payout-input-dto.js';
import { RecordPayoutOutputDTO } from '../dtos/record-payout-output-dto.js';

/**
 * Records a PAYOUT entry — transfer of available balance to the professional's bank account.
 * Blocked when ledger is FROZEN or UNDER_REVIEW, or when balance is insufficient (ADR-0021 §9).
 * Idempotent: duplicate payoutRequestId returns the existing entry.
 */
export class RecordPayout {
  constructor(
    private readonly ledgerRepository: IFinancialLedgerRepository,
    private readonly eventPublisher: ILedgerEventPublisher,
  ) {}

  async execute(dto: RecordPayoutInputDTO): Promise<DomainResult<RecordPayoutOutputDTO>> {
    // 1. Validate amount
    const moneyResult = Money.create(dto.amountCents, dto.currency);
    if (moneyResult.isLeft()) return left(moneyResult.value);

    // 2. Load ledger (must exist)
    const ledger = await this.ledgerRepository.findByProfessionalProfileId(
      dto.professionalProfileId,
    );
    if (!ledger) {
      return left(new LedgerNotFoundError(dto.professionalProfileId));
    }

    const previousBalanceCents = ledger.currentBalanceCents;

    // 3. Record payout entry (validates status + balance invariants)
    const payoutResult = ledger.recordPayout({
      amount: moneyResult.value,
      idempotencyKey: `payout:${dto.payoutRequestId}`,
      description: dto.description,
    });
    if (payoutResult.isLeft()) return left(payoutResult.value);
    const payoutEntry = payoutResult.value;

    // 4. Persist
    await this.ledgerRepository.save(ledger);

    // 5. Publish events (post-commit)
    await this.eventPublisher.publishPayoutCompleted(
      new PayoutCompletedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        entryId: payoutEntry.id,
        amountCents: payoutEntry.amount.amount,
        currency: payoutEntry.amount.currency,
        balanceAfterCents: payoutEntry.balanceAfterCents,
      }),
    );

    await this.eventPublisher.publishLedgerBalanceChanged(
      new LedgerBalanceChangedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        previousBalanceCents,
        newBalanceCents: ledger.currentBalanceCents,
        currency: ledger.currency,
        entryType: LedgerEntryType.PAYOUT,
        isInDebt: ledger.isInDebt,
      }),
    );

    return right({
      ledgerId: ledger.id,
      entryId: payoutEntry.id,
      amountCents: payoutEntry.amount.amount,
      currentBalanceCents: ledger.currentBalanceCents,
      currency: ledger.currency,
    });
  }
}
