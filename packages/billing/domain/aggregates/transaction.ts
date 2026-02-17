import { AggregateRoot, UTCDateTime, Money, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TransactionStatus } from '../enums/transaction-status.js';
import { PlatformFee } from '../value-objects/platform-fee.js';
import { InvalidTransactionTransitionError } from '../errors/invalid-transaction-transition-error.js';

export interface TransactionProps {
  clientId: string;
  professionalProfileId: string;
  servicePlanId: string;
  amount: Money;
  platformFee: PlatformFee;
  status: TransactionStatus;
  gatewayTransactionId: string | null;
  createdAtUtc: UTCDateTime;
  confirmedAtUtc: UTCDateTime | null;
  failedAtUtc: UTCDateTime | null;
  chargebackAtUtc: UTCDateTime | null;
  refundedAtUtc: UTCDateTime | null;
}

/**
 * Transaction aggregate root — represents a financial operation between a
 * client and a professional through the platform (ADR-0019 §5).
 *
 * ## Key invariants
 *
 * - Created in PENDING status.
 * - Status transitions are one-directional; no reversal permitted (ADR-0019 §5).
 * - All financial amounts are integer cents (ADR-0004).
 * - Platform fee split is computed at creation (ADR-0019 §6).
 * - Domain events are dispatched by the Application layer (ADR-0009).
 * - A CONFIRMED Transaction that receives a chargeback transitions to
 *   CHARGEBACK but never deletes or modifies Execution records (ADR-0020).
 *
 * ## Cross-aggregate references
 *
 * `clientId`, `professionalProfileId`, `servicePlanId` are bare strings (UUIDv4)
 * referencing aggregates in Identity and Billing contexts (ADR-0047 §5).
 */
export class Transaction extends AggregateRoot<TransactionProps> {
  private constructor(id: string, props: TransactionProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    clientId: string;
    professionalProfileId: string;
    servicePlanId: string;
    amount: Money;
    platformFee: PlatformFee;
  }): DomainResult<Transaction> {
    const id = props.id ?? generateId();

    const transaction = new Transaction(id, {
      clientId: props.clientId,
      professionalProfileId: props.professionalProfileId,
      servicePlanId: props.servicePlanId,
      amount: props.amount,
      platformFee: props.platformFee,
      status: TransactionStatus.PENDING,
      gatewayTransactionId: null,
      createdAtUtc: UTCDateTime.now(),
      confirmedAtUtc: null,
      failedAtUtc: null,
      chargebackAtUtc: null,
      refundedAtUtc: null,
    });

    return right(transaction);
  }

  static reconstitute(id: string, props: TransactionProps, version: number): Transaction {
    return new Transaction(id, props, version);
  }

  // ── Status transitions (ADR-0019 §5) ────────────────────────────────────

  /** PENDING → CONFIRMED. Sets confirmedAtUtc. */
  confirm(gatewayTransactionId: string): DomainResult<void> {
    if (this.props.status !== TransactionStatus.PENDING) {
      return left(
        new InvalidTransactionTransitionError(this.props.status, TransactionStatus.CONFIRMED),
      );
    }

    this.props.status = TransactionStatus.CONFIRMED;
    this.props.gatewayTransactionId = gatewayTransactionId;
    this.props.confirmedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** PENDING → FAILED. Sets failedAtUtc. */
  fail(): DomainResult<void> {
    if (this.props.status !== TransactionStatus.PENDING) {
      return left(
        new InvalidTransactionTransitionError(this.props.status, TransactionStatus.FAILED),
      );
    }

    this.props.status = TransactionStatus.FAILED;
    this.props.failedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * CONFIRMED | REFUNDED → CHARGEBACK. Sets chargebackAtUtc.
   *
   * Per ADR-0020: chargeback never deletes or modifies any Execution record.
   */
  registerChargeback(): DomainResult<void> {
    const allowed = [TransactionStatus.CONFIRMED, TransactionStatus.REFUNDED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidTransactionTransitionError(this.props.status, TransactionStatus.CHARGEBACK),
      );
    }

    this.props.status = TransactionStatus.CHARGEBACK;
    this.props.chargebackAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** CONFIRMED → REFUNDED. Sets refundedAtUtc. */
  refund(): DomainResult<void> {
    if (this.props.status !== TransactionStatus.CONFIRMED) {
      return left(
        new InvalidTransactionTransitionError(this.props.status, TransactionStatus.REFUNDED),
      );
    }

    this.props.status = TransactionStatus.REFUNDED;
    this.props.refundedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get clientId(): string {
    return this.props.clientId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get servicePlanId(): string {
    return this.props.servicePlanId;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get platformFee(): PlatformFee {
    return this.props.platformFee;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get gatewayTransactionId(): string | null {
    return this.props.gatewayTransactionId;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get confirmedAtUtc(): UTCDateTime | null {
    return this.props.confirmedAtUtc;
  }

  get failedAtUtc(): UTCDateTime | null {
    return this.props.failedAtUtc;
  }

  get chargebackAtUtc(): UTCDateTime | null {
    return this.props.chargebackAtUtc;
  }

  get refundedAtUtc(): UTCDateTime | null {
    return this.props.refundedAtUtc;
  }
}
