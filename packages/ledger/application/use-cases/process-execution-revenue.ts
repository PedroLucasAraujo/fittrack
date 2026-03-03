import { DomainResult, Money, left, right } from '@fittrack/core';
import { FinancialLedger } from '../../domain/aggregates/financial-ledger.js';
import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { PlatformFeeRecordedEvent } from '../../domain/events/platform-fee-recorded-event.js';
import { RevenueRecordedEvent } from '../../domain/events/revenue-recorded-event.js';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ILedgerEventPublisher } from '../ports/i-ledger-event-publisher.js';
import { ProcessExecutionRevenueInputDTO } from '../dtos/process-execution-revenue-input-dto.js';
import { ProcessExecutionRevenueOutputDTO } from '../dtos/process-execution-revenue-output-dto.js';

/**
 * Records both REVENUE and PLATFORM_FEE entries for one confirmed execution.
 *
 * Financial consistency mandate (ADR-0009 §1.5): both entries must be recorded
 * atomically in a single UseCase transaction. This use case is triggered by the
 * ExecutionRecorded domain event.
 *
 * Per-session amounts are pre-computed by the infrastructure event handler (ADR-0052 §3).
 * If a FinancialLedger does not yet exist for the professional, one is created (lazy init).
 */
export class ProcessExecutionRevenue {
  constructor(
    private readonly ledgerRepository: IFinancialLedgerRepository,
    private readonly eventPublisher: ILedgerEventPublisher,
  ) {}

  async execute(
    dto: ProcessExecutionRevenueInputDTO,
  ): Promise<DomainResult<ProcessExecutionRevenueOutputDTO>> {
    // 1. Validate amounts
    const revenueMoneyResult = Money.create(dto.professionalAmountCents, dto.currency);
    if (revenueMoneyResult.isLeft()) return left(revenueMoneyResult.value);
    const revenueMoney = revenueMoneyResult.value;

    const feeMoneyResult = Money.create(dto.platformFeeAmountCents, dto.currency);
    /* v8 ignore next -- same currency already validated; branch unreachable via normal input */
    if (feeMoneyResult.isLeft()) return left(feeMoneyResult.value);
    const feeMoney = feeMoneyResult.value;

    // 2. Find or create FinancialLedger (lazy init on first execution)
    let ledger = await this.ledgerRepository.findByProfessionalProfileId(dto.professionalProfileId);
    if (!ledger) {
      const createResult = FinancialLedger.create({
        professionalProfileId: dto.professionalProfileId,
        currency: dto.currency,
      });
      /* v8 ignore next -- currency already validated above; FinancialLedger.create won't fail */
      if (createResult.isLeft()) return left(createResult.value);
      ledger = createResult.value;
    }

    const previousBalanceCents = ledger.currentBalanceCents;

    // 3. Record REVENUE entry (increases balance)
    const revenueResult = ledger.recordRevenue({
      transactionId: dto.transactionId,
      amount: revenueMoney,
      idempotencyKey: `revenue:${dto.executionId}`,
      description: `Revenue for execution ${dto.executionId} (logicalDay: ${dto.logicalDay})`,
    });
    /* v8 ignore next -- recordRevenue never returns Left with valid Money */
    if (revenueResult.isLeft()) return left(revenueResult.value);
    const revenueEntry = revenueResult.value;

    // 4. Record PLATFORM_FEE entry (decreases balance)
    const feeResult = ledger.recordPlatformFee({
      transactionId: dto.transactionId,
      amount: feeMoney,
      idempotencyKey: `fee:${dto.executionId}`,
      description: `Platform fee for execution ${dto.executionId} (logicalDay: ${dto.logicalDay})`,
    });
    /* v8 ignore next -- recordPlatformFee never returns Left with valid Money */
    if (feeResult.isLeft()) return left(feeResult.value);
    const feeEntry = feeResult.value;

    // 5. Persist (upsert header + append new entries; optimistic locking on version)
    await this.ledgerRepository.save(ledger);

    // 6. Publish events (post-commit — ADR-0009 §4)
    await this.eventPublisher.publishRevenueRecorded(
      new RevenueRecordedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        entryId: revenueEntry.id,
        executionId: dto.executionId,
        amountCents: revenueEntry.amount.amount,
        currency: revenueEntry.amount.currency,
        logicalDay: dto.logicalDay,
        balanceAfterCents: revenueEntry.balanceAfterCents,
      }),
    );

    await this.eventPublisher.publishPlatformFeeRecorded(
      new PlatformFeeRecordedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        entryId: feeEntry.id,
        executionId: dto.executionId,
        amountCents: feeEntry.amount.amount,
        currency: feeEntry.amount.currency,
        logicalDay: dto.logicalDay,
        balanceAfterCents: feeEntry.balanceAfterCents,
      }),
    );

    await this.eventPublisher.publishLedgerBalanceChanged(
      new LedgerBalanceChangedEvent(ledger.id, ledger.professionalProfileId, {
        ledgerId: ledger.id,
        previousBalanceCents,
        newBalanceCents: ledger.currentBalanceCents,
        currency: ledger.currency,
        entryType: LedgerEntryType.REVENUE,
        isInDebt: ledger.isInDebt,
      }),
    );

    return right({
      ledgerId: ledger.id,
      revenueEntryId: revenueEntry.id,
      platformFeeEntryId: feeEntry.id,
      professionalAmountCents: revenueEntry.amount.amount,
      platformFeeAmountCents: feeEntry.amount.amount,
      currentBalanceCents: ledger.currentBalanceCents,
      currency: ledger.currency,
      isInDebt: ledger.isInDebt,
    });
  }
}
