import { DomainResult, Money, left, right } from '@fittrack/core';
import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { RefundRecordedEvent } from '../../domain/events/refund-recorded-event.js';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ILedgerEventPublisher } from '../ports/i-ledger-event-publisher.js';
import { ProcessChargebackInputDTO } from '../dtos/process-chargeback-input-dto.js';
import { ProcessChargebackOutputDTO } from '../dtos/process-chargeback-output-dto.js';

/**
 * Records REFUND entries for both the REVENUE and PLATFORM_FEE components of a chargeback.
 *
 * Financial consistency mandate (ADR-0009 §1.5): both refund entries must be recorded
 * atomically in a single UseCase transaction. Triggered by ChargebackRegistered event.
 *
 * The REVENUE reversal decreases the professional's balance.
 * The PLATFORM_FEE reversal increases the professional's balance (platform returns the fee).
 * Net effect = −(professionalAmountCents). ADR-0021 §7.
 */
export class ProcessChargeback {
  constructor(
    private readonly ledgerRepository: IFinancialLedgerRepository,
    private readonly eventPublisher: ILedgerEventPublisher,
  ) {}

  async execute(dto: ProcessChargebackInputDTO): Promise<DomainResult<ProcessChargebackOutputDTO>> {
    // 1. Load ledger (must exist)
    const ledger = await this.ledgerRepository.findByProfessionalProfileId(
      dto.professionalProfileId,
    );
    if (!ledger) {
      return left(new LedgerNotFoundError(dto.professionalProfileId));
    }

    const previousBalanceCents = ledger.currentBalanceCents;

    // 2. Validate amounts
    const revMoneyResult = Money.create(dto.professionalAmountCents, dto.currency);
    if (revMoneyResult.isLeft()) return left(revMoneyResult.value);

    const feeMoneyResult = Money.create(dto.platformFeeAmountCents, dto.currency);
    /* v8 ignore next -- same currency already validated above; branch unreachable via normal input */
    if (feeMoneyResult.isLeft()) return left(feeMoneyResult.value);

    // 3. Record REVENUE reversal (debit: decreases professional's balance)
    const revenueRefundResult = ledger.recordRefund({
      transactionId: dto.transactionId,
      amount: revMoneyResult.value,
      referenceEntryId: dto.revenueEntryId,
      isRevenueReversal: true,
      idempotencyKey: `refund:${dto.chargebackId}:${dto.revenueEntryId}`,
      description: `Revenue reversal for chargeback ${dto.chargebackId}. Reason: ${dto.reason}`,
    });
    /* v8 ignore next -- recordRefund never returns Left with valid Money and non-duplicate key */
    if (revenueRefundResult.isLeft()) return left(revenueRefundResult.value);
    const revenueRefundEntry = revenueRefundResult.value;

    // 4. Record PLATFORM_FEE reversal (credit: platform returns fee to professional's balance)
    const feeRefundResult = ledger.recordRefund({
      transactionId: dto.transactionId,
      amount: feeMoneyResult.value,
      referenceEntryId: dto.platformFeeEntryId,
      isRevenueReversal: false,
      idempotencyKey: `refund:${dto.chargebackId}:${dto.platformFeeEntryId}`,
      description: `Platform fee reversal for chargeback ${dto.chargebackId}. Reason: ${dto.reason}`,
    });
    /* v8 ignore next -- recordRefund never returns Left with valid Money and non-duplicate key */
    if (feeRefundResult.isLeft()) return left(feeRefundResult.value);
    const feeRefundEntry = feeRefundResult.value;

    // 5. Persist
    await this.ledgerRepository.save(ledger);

    // 6. Publish events (post-commit)
    await this.eventPublisher.publishRefundRecorded(
      new RefundRecordedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        entryId: revenueRefundEntry.id,
        referenceEntryId: dto.revenueEntryId,
        amountCents: revenueRefundEntry.amount.amount,
        currency: revenueRefundEntry.amount.currency,
        balanceAfterCents: revenueRefundEntry.balanceAfterCents,
        reason: dto.reason,
      }),
    );

    await this.eventPublisher.publishRefundRecorded(
      new RefundRecordedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        entryId: feeRefundEntry.id,
        referenceEntryId: dto.platformFeeEntryId,
        amountCents: feeRefundEntry.amount.amount,
        currency: feeRefundEntry.amount.currency,
        balanceAfterCents: feeRefundEntry.balanceAfterCents,
        reason: dto.reason,
      }),
    );

    await this.eventPublisher.publishLedgerBalanceChanged(
      new LedgerBalanceChangedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        previousBalanceCents,
        newBalanceCents: ledger.currentBalanceCents,
        currency: ledger.currency,
        entryType: LedgerEntryType.REFUND,
        isInDebt: ledger.isInDebt,
      }),
    );

    return right({
      ledgerId: ledger.id,
      revenueRefundEntryId: revenueRefundEntry.id,
      feeRefundEntryId: feeRefundEntry.id,
      currentBalanceCents: ledger.currentBalanceCents,
      currency: ledger.currency,
      isInDebt: ledger.isInDebt,
    });
  }
}
