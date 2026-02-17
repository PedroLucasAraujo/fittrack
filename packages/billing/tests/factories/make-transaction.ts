import { generateId, UTCDateTime, Money } from '@fittrack/core';
import { Transaction } from '../../domain/aggregates/transaction.js';
import { TransactionStatus } from '../../domain/enums/transaction-status.js';
import { PlatformFee } from '../../domain/value-objects/platform-fee.js';

type TransactionOverrides = Partial<{
  id: string;
  clientId: string;
  professionalProfileId: string;
  servicePlanId: string;
  amount: Money;
  platformFee: PlatformFee;
  status: TransactionStatus;
  gatewayTransactionId: string | null;
  version: number;
  confirmedAtUtc: UTCDateTime | null;
  failedAtUtc: UTCDateTime | null;
  chargebackAtUtc: UTCDateTime | null;
  refundedAtUtc: UTCDateTime | null;
}>;

function defaultPlatformFee(): PlatformFee {
  const moneyResult = Money.create(9990, 'BRL');
  const feeResult = PlatformFee.create(moneyResult.value as Money, 1000);
  return feeResult.value as PlatformFee;
}

/**
 * Test factory for creating valid Transaction aggregates.
 *
 * By default creates a PENDING transaction. Uses `reconstitute` to allow
 * setting arbitrary status.
 */
export function makeTransaction(overrides: TransactionOverrides = {}): Transaction {
  const amount = overrides.amount ?? (Money.create(9990, 'BRL').value as Money);

  return Transaction.reconstitute(
    overrides.id ?? generateId(),
    {
      clientId: overrides.clientId ?? generateId(),
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      servicePlanId: overrides.servicePlanId ?? generateId(),
      amount,
      platformFee: overrides.platformFee ?? defaultPlatformFee(),
      status: overrides.status ?? TransactionStatus.PENDING,
      gatewayTransactionId: overrides.gatewayTransactionId ?? null,
      createdAtUtc: UTCDateTime.now(),
      confirmedAtUtc: overrides.confirmedAtUtc ?? null,
      failedAtUtc: overrides.failedAtUtc ?? null,
      chargebackAtUtc: overrides.chargebackAtUtc ?? null,
      refundedAtUtc: overrides.refundedAtUtc ?? null,
    },
    overrides.version ?? 0,
  );
}

/**
 * Creates a newly-created Transaction (PENDING) via the domain factory.
 */
export function makeNewTransaction(
  overrides: Partial<{
    id: string;
    clientId: string;
    professionalProfileId: string;
    servicePlanId: string;
    amount: Money;
    platformFee: PlatformFee;
  }> = {},
): Transaction {
  const amount = overrides.amount ?? (Money.create(9990, 'BRL').value as Money);
  const platformFee = overrides.platformFee ?? defaultPlatformFee();

  const result = Transaction.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    clientId: overrides.clientId ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    servicePlanId: overrides.servicePlanId ?? generateId(),
    amount,
    platformFee,
  });

  if (result.isLeft()) {
    throw new Error(`makeNewTransaction failed: ${result.value.message}`);
  }

  return result.value;
}
