import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntrySourceType } from '../enums/entry-source-type.js';
import type { EntrySourceType as EntrySourceTypeValue } from '../enums/entry-source-type.js';
import { InvalidSelfLogEntryError } from '../errors/invalid-self-log-entry-error.js';

/** UUIDv4 regex shared with BaseEntity (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface EntrySourceProps {
  readonly sourceType: EntrySourceTypeValue;
  /**
   * Cross-aggregate reference to the Execution that produced this entry.
   * Null when sourceType is SELF.
   * Non-null UUIDv4 when sourceType is EXECUTION (ADR-0047 — reference by ID only).
   */
  readonly sourceId: string | null;
}

/**
 * Discriminated value object that records how a SelfLogEntry was created.
 *
 * ## Invariants
 *
 * - `sourceType = EXECUTION` → `sourceId` must be a non-null, valid UUIDv4.
 * - `sourceType = SELF`      → `sourceId` must be null.
 *
 * Use the static factory helpers `EntrySource.self()` and
 * `EntrySource.execution(executionId)` instead of constructing directly.
 *
 * ## Cross-aggregate reference (ADR-0047)
 *
 * When sourceType is EXECUTION, `sourceId` stores the Execution's ID. No live
 * object reference is held — only the opaque string identifier.
 */
export class EntrySource extends ValueObject<EntrySourceProps> {
  private constructor(props: EntrySourceProps) {
    super(props);
  }

  /**
   * Creates an EntrySource for a manually logged entry (no professional prescription).
   * `sourceId` is always null for SELF entries.
   */
  static self(): EntrySource {
    return new EntrySource({ sourceType: EntrySourceType.SELF, sourceId: null });
  }

  /**
   * Creates an EntrySource for an entry projected from a confirmed Execution.
   *
   * @param executionId UUIDv4 of the source Execution (cross-aggregate ref, ADR-0047).
   * @returns Right<EntrySource> on success.
   * @returns Left<InvalidSelfLogEntryError> if executionId is not a valid UUIDv4.
   */
  static execution(executionId: string): DomainResult<EntrySource> {
    if (!UUID_V4_REGEX.test(executionId)) {
      return left(
        new InvalidSelfLogEntryError(
          `sourceId must be a valid UUIDv4 when sourceType is EXECUTION. Received: "${executionId}"`,
          { executionId },
        ),
      );
    }
    return right(new EntrySource({ sourceType: EntrySourceType.EXECUTION, sourceId: executionId }));
  }

  get sourceType(): EntrySourceTypeValue {
    return this.props.sourceType;
  }

  /** Execution ID when sourceType is EXECUTION; null when sourceType is SELF. */
  get sourceId(): string | null {
    return this.props.sourceId;
  }

  /** True when this entry was projected from a confirmed Execution record. */
  get isExecution(): boolean {
    return this.props.sourceType === EntrySourceType.EXECUTION;
  }

  /** True when this entry was manually logged by the user (Personal Mode). */
  get isSelf(): boolean {
    return this.props.sourceType === EntrySourceType.SELF;
  }
}
