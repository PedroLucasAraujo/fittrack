import { DomainInvariantError } from '../errors/domain-invariant-error';
import { ErrorCodes } from '../errors/error-codes';

/**
 * UUIDv4 regex: 8-4-4-4-12 hex groups with version=4 and variant bits 8/9/a/b.
 * Used to enforce ADR-0047 §6: "All aggregate roots use UUIDv4 as their
 * primary identifier. IDs are assigned at creation and are immutable."
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Base class for all domain entities.
 *
 * Entities are identified by their `id` (UUIDv4). Two entity instances with
 * the same `id` represent the same entity regardless of their current props
 * values (ADR-0047 §4).
 *
 * **Aggregate roots must extend `AggregateRoot`, not `BaseEntity` directly.**
 * `BaseEntity` is the correct base for subordinate entities (entities that
 * live inside an aggregate boundary and are never accessed directly by ID from
 * outside). See ADR-0047 §4.
 */
export abstract class BaseEntity<Props> {
  protected readonly _id: string;
  protected props: Props;

  protected constructor(id: string, props: Props) {
    if (!UUID_V4_REGEX.test(id)) {
      throw new DomainInvariantError(
        `Entity id must be a valid UUIDv4. Received: "${id}".`,
        ErrorCodes.INVALID_UUID,
        { id },
      );
    }
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  /**
   * Entity equality is determined by identity (ADR-0047 §4).
   * Two entity instances are equal if and only if they share the same `id`.
   */
  equals(other: BaseEntity<Props>): boolean {
    return this._id === other._id;
  }
}
