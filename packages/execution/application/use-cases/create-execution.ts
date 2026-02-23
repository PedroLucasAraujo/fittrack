import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Execution } from '../../domain/aggregates/execution.js';
import { ExecutionRecordedEvent } from '../../domain/events/execution-recorded-event.js';
import { InvalidExecutionError } from '../../domain/errors/invalid-execution-error.js';
import { DeliverableInactiveError } from '../../domain/errors/deliverable-inactive-error.js';
import type { ICreateExecutionUnitOfWork } from '../ports/create-execution-unit-of-work-port.js';
import type { IAccessGrantPort } from '../ports/access-grant-port.js';
import type { IDeliverableVerificationPort } from '../ports/deliverable-port.js';
import type { IExecutionEventPublisher } from '../ports/execution-event-publisher-port.js';
import type { CreateExecutionInputDTO } from '../dtos/create-execution-input-dto.js';
import type { CreateExecutionOutputDTO } from '../dtos/create-execution-output-dto.js';

/**
 * Records a new Execution — an immutable historical fact of professional
 * service delivery (ADR-0005 — CANONICAL).
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): `professionalProfileId` from JWT, validated as UUID.
 * 2. Input UUIDs: `clientId`, `accessGrantId`, `deliverableId` validated as UUIDv4.
 * 3. Temporal (ADR-0010): `occurredAtUtc` parsed as UTC; `logicalDay` derived from
 *    `occurredAtUtc` + `timezoneUsed` (client's IANA timezone); stored immutably.
 * 4. Deliverable active (ADR-0044 §2): verified via `IDeliverableVerificationPort`
 *    (cross-context check via public API — ADR-0029, ADR-0001 §3).
 * 5. AccessGrant validity (ADR-0046 §3): all 5 checks via `IAccessGrantPort.validate()`.
 * 6. Status lifecycle (ADR-0005 §9): Execution is created PENDING and immediately
 *    confirmed to CONFIRMED before persistence.
 * 7. Session consumption atomicity (ADR-0046 §4): Execution INSERT and
 *    `sessionsConsumed` increment execute within the same DB transaction via
 *    `ICreateExecutionUnitOfWork` — documented exception to ADR-0003 §1.
 * 8. Event publication (ADR-0009 §4, §7): `ExecutionRecorded` is dispatched
 *    post-commit to trigger downstream metric derivation (ADR-0043, ADR-0014).
 *
 * ## Immutability (ADR-0005)
 *
 * Once persisted, the Execution record is never updated or deleted. Corrections
 * are handled by `RecordExecutionCorrection`.
 */
export class CreateExecution {
  constructor(
    private readonly unitOfWork: ICreateExecutionUnitOfWork,
    private readonly accessGrantPort: IAccessGrantPort,
    private readonly deliverablePort: IDeliverableVerificationPort,
    private readonly eventPublisher: IExecutionEventPublisher,
  ) {}

  async execute(dto: CreateExecutionInputDTO): Promise<DomainResult<CreateExecutionOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) {
      return left(new InvalidExecutionError('invalid professionalProfileId'));
    }

    // 2. Validate cross-aggregate reference IDs (ADR-0047)
    const clientIdResult = UniqueEntityId.create(dto.clientId);
    if (clientIdResult.isLeft()) {
      return left(new InvalidExecutionError('invalid clientId'));
    }

    const accessGrantIdResult = UniqueEntityId.create(dto.accessGrantId);
    if (accessGrantIdResult.isLeft()) {
      return left(new InvalidExecutionError('invalid accessGrantId'));
    }

    const deliverableIdResult = UniqueEntityId.create(dto.deliverableId);
    if (deliverableIdResult.isLeft()) {
      return left(new InvalidExecutionError('invalid deliverableId'));
    }

    // 3. Parse and validate temporal fields (ADR-0010)
    const occurredAtUtcResult = UTCDateTime.fromISO(dto.occurredAtUtc);
    if (occurredAtUtcResult.isLeft()) {
      return left(
        new InvalidExecutionError(
          'invalid occurredAtUtc: must be ISO 8601 UTC string ending with Z',
        ),
      );
    }

    const logicalDayResult = LogicalDay.fromDate(occurredAtUtcResult.value.value, dto.timezoneUsed);
    if (logicalDayResult.isLeft()) {
      return left(
        new InvalidExecutionError('invalid timezoneUsed: must be a valid IANA timezone identifier'),
      );
    }

    // 4. Verify Deliverable is ACTIVE (cross-context, ADR-0029, ADR-0001 §3)
    const isDeliverableActive = await this.deliverablePort.isActive(
      dto.deliverableId,
      dto.professionalProfileId,
    );
    if (!isDeliverableActive) {
      return left(new DeliverableInactiveError(dto.deliverableId));
    }

    // 5. Validate AccessGrant — all 5 ADR-0046 §3 checks
    const accessGrantResult = await this.accessGrantPort.validate({
      accessGrantId: dto.accessGrantId,
      clientId: dto.clientId,
      professionalProfileId: dto.professionalProfileId,
      currentUtc: UTCDateTime.now().toISO(),
    });
    if (accessGrantResult.isLeft()) {
      return left(accessGrantResult.value);
    }

    // 6. Create Execution in PENDING status (ADR-0005 §8-9)
    const executionResult = Execution.create({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      accessGrantId: dto.accessGrantId,
      deliverableId: dto.deliverableId,
      occurredAtUtc: occurredAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
      createdAtUtc: UTCDateTime.now(),
    });

    /* v8 ignore next */
    if (executionResult.isLeft()) return left(executionResult.value);

    const execution = executionResult.value;

    // 7. Confirm: PENDING → CONFIRMED (ADR-0005 §9)
    //    Always succeeds on a freshly created PENDING execution.
    const confirmResult = execution.confirm();

    /* v8 ignore next */
    if (confirmResult.isLeft()) return left(confirmResult.value);

    // 8. Atomically INSERT Execution and increment sessionsConsumed (ADR-0046 §4).
    //    ICreateExecutionUnitOfWork wraps both in a single DB transaction —
    //    documented exception to ADR-0003 §1.
    await this.unitOfWork.commitExecution(execution, dto.accessGrantId);

    // 9. Publish ExecutionRecorded event post-commit (ADR-0009 §4, §7).
    await this.eventPublisher.publishExecutionRecorded(
      new ExecutionRecordedEvent(execution.id, execution.professionalProfileId, {
        executionId: execution.id,
        clientId: execution.clientId,
        professionalProfileId: execution.professionalProfileId,
        deliverableId: execution.deliverableId,
        logicalDay: execution.logicalDay.value,
        status: execution.status,
      }),
    );

    return right({
      executionId: execution.id,
      professionalProfileId: execution.professionalProfileId,
      clientId: execution.clientId,
      accessGrantId: execution.accessGrantId,
      deliverableId: execution.deliverableId,
      occurredAtUtc: execution.occurredAtUtc.toISO(),
      logicalDay: execution.logicalDay.value,
      timezoneUsed: execution.timezoneUsed,
      createdAtUtc: execution.createdAtUtc.toISO(),
      status: execution.status,
    });
  }
}
