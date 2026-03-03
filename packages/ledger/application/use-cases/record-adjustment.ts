import { DomainResult, Money, left, right } from '@fittrack/core';
import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ILedgerEventPublisher } from '../ports/i-ledger-event-publisher.js';
import { RecordAdjustmentInputDTO } from '../dtos/record-adjustment-input-dto.js';
import { RecordAdjustmentOutputDTO } from '../dtos/record-adjustment-output-dto.js';

/**
 * Records an ADJUSTMENT LedgerEntry — an administrative credit or debit.
 * Idempotent: duplicate adjustmentId returns the existing entry.
 * Caller is responsible for verifying administrative authorization before invoking.
 * Publishes LedgerBalanceChanged (ADR-0009 §4).
 */
export class RecordAdjustment {
  constructor(
    private readonly ledgerRepository: IFinancialLedgerRepository,
    private readonly eventPublisher: ILedgerEventPublisher,
  ) {}

  async execute(dto: RecordAdjustmentInputDTO): Promise<DomainResult<RecordAdjustmentOutputDTO>> {
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

    // 3. Record adjustment entry
    const adjustmentResult = ledger.recordAdjustment({
      amount: moneyResult.value,
      isCredit: dto.isCredit,
      idempotencyKey: `adj:${dto.adjustmentId}`,
      description: dto.description,
    });
    /* v8 ignore next -- recordAdjustment never returns Left with valid Money */
    if (adjustmentResult.isLeft()) return left(adjustmentResult.value);
    const adjustmentEntry = adjustmentResult.value;

    // 4. Persist
    await this.ledgerRepository.save(ledger);

    // 5. Publish LedgerBalanceChanged (post-commit)
    await this.eventPublisher.publishLedgerBalanceChanged(
      new LedgerBalanceChangedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        previousBalanceCents,
        newBalanceCents: ledger.currentBalanceCents,
        currency: ledger.currency,
        entryType: LedgerEntryType.ADJUSTMENT,
        isInDebt: ledger.isInDebt,
      }),
    );

    return right({
      ledgerId: ledger.id,
      entryId: adjustmentEntry.id,
      amountCents: adjustmentEntry.amount.amount,
      currentBalanceCents: ledger.currentBalanceCents,
      currency: ledger.currency,
      isInDebt: ledger.isInDebt,
    });
  }
}
