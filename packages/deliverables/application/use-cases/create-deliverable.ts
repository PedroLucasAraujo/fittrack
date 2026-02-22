import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Deliverable } from '../../domain/aggregates/deliverable.js';
import { DeliverableTitle } from '../../domain/value-objects/deliverable-title.js';
import { ExerciseAssignment } from '../../domain/entities/exercise-assignment.js';
import { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { IDeliverableRepository } from '../../domain/repositories/deliverable-repository.js';
import type { CreateDeliverableInputDTO } from '../dtos/create-deliverable-input-dto.js';
import type { CreateDeliverableOutputDTO } from '../dtos/create-deliverable-output-dto.js';

/**
 * Creates a new Deliverable in DRAFT status.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): `professionalProfileId` from JWT, validated as UUID.
 * 2. Title validation: 1–120 chars (DeliverableTitle value object).
 * 3. Temporal (ADR-0010): `logicalDay` computed from `createdAtUtc` + `timezoneUsed`.
 * 4. Initial exercises (PROGRAM type): attached during creation if provided.
 *    Content is mutable until `ActivateDeliverable` is called.
 *
 * ## Snapshot semantics (ADR-0011)
 *
 * The Deliverable itself IS the snapshot. Content provided at creation time
 * (exercise name, sets, reps, etc.) is embedded directly. When the Catalog
 * bounded context is available, `catalogItemId` and `catalogVersion` enrich
 * traceability without changing the immutability model.
 *
 */
export class CreateDeliverable {
  constructor(private readonly deliverableRepository: IDeliverableRepository) {}

  async execute(dto: CreateDeliverableInputDTO): Promise<DomainResult<CreateDeliverableOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Validate title
    const titleResult = DeliverableTitle.create(dto.title);
    if (titleResult.isLeft()) return left(titleResult.value);

    // 3. Parse temporal fields (ADR-0010)
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    const logicalDayResult = LogicalDay.fromDate(createdAtUtcResult.value.value, dto.timezoneUsed);
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 4. Create Deliverable in DRAFT
    const deliverableResult = Deliverable.create({
      professionalProfileId: dto.professionalProfileId,
      title: titleResult.value,
      type: dto.type,
      description: dto.description ?? null,
      createdAtUtc: createdAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
    });

    /* v8 ignore next */
    if (deliverableResult.isLeft()) return left(deliverableResult.value);

    const deliverable = deliverableResult.value;

    // 5. Attach initial exercises (TRAINING_PRESCRIPTION type only)
    if (
      dto.type === DeliverableType.TRAINING_PRESCRIPTION &&
      dto.exercises &&
      dto.exercises.length > 0
    ) {
      for (const exerciseInput of dto.exercises) {
        const snapshotCreatedAtUtc =
          exerciseInput.catalogItemId != null ? createdAtUtcResult.value.toISO() : null;

        const exercise = ExerciseAssignment.create({
          catalogItemId: exerciseInput.catalogItemId ?? null,
          catalogVersion: exerciseInput.catalogVersion ?? null,
          snapshotCreatedAtUtc,
          name: exerciseInput.name,
          sets: exerciseInput.sets ?? null,
          reps: exerciseInput.reps ?? null,
          durationSeconds: exerciseInput.durationSeconds ?? null,
          restSeconds: exerciseInput.restSeconds ?? null,
          notes: exerciseInput.notes ?? null,
        });

        const addResult = deliverable.addExercise(exercise.props);
        /* v8 ignore next */
        if (addResult.isLeft()) return left(addResult.value);
      }
    }

    await this.deliverableRepository.save(deliverable);

    return right({
      deliverableId: deliverable.id,
      professionalProfileId: deliverable.professionalProfileId,
      title: deliverable.title.value,
      type: deliverable.type,
      status: deliverable.status,
      contentVersion: deliverable.contentVersion,
      description: deliverable.description,
      exerciseCount: deliverable.exercises.length,
      logicalDay: deliverable.logicalDay.value,
      timezoneUsed: deliverable.timezoneUsed,
      createdAtUtc: deliverable.createdAtUtc.toISO(),
    });
  }
}
