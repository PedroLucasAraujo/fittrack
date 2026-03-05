import { left, right, ValueObject } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidTemplateError } from '../errors/invalid-template-error.js';

export type ParameterType = 'number' | 'string' | 'boolean' | 'select';

export interface TemplateParameterProps {
  /** Unique name for this parameter, e.g. "weeks", "difficulty". */
  name: string;
  /** Data type of the parameter value. */
  type: ParameterType;
  /** Whether the parameter must be supplied on instantiation. */
  required: boolean;
  /** Default value used when not supplied. */
  defaultValue: string | number | boolean | null;
  /** Minimum value (applicable to "number" type). */
  min: number | null;
  /** Maximum value (applicable to "number" type). */
  max: number | null;
  /** Allowed values (applicable to "select" type). */
  options: string[] | null;
}

/**
 * Describes a configurable parameter of a DeliverableTemplate.
 *
 * Parameters allow professionals to customise the template at instantiation time
 * without modifying the template itself, preserving immutability of ACTIVE templates.
 *
 * ## Invariants
 *
 * - `name` must be non-empty.
 * - `type === 'select'` requires at least one option.
 * - `min` must be ≤ `max` when both are non-null.
 * - `required === true` requires a non-null `defaultValue`.
 *
 * Examples:
 *   { name: "weeks", type: "number", min: 4, max: 52, defaultValue: 12, required: false }
 *   { name: "goal", type: "select", options: ["strength", "endurance"], defaultValue: "strength" }
 */
export class TemplateParameter extends ValueObject<TemplateParameterProps> {
  private constructor(props: TemplateParameterProps) {
    super(props);
  }

  static create(props: TemplateParameterProps): DomainResult<TemplateParameter> {
    if (!props.name || props.name.trim() === '') {
      return left(new InvalidTemplateError('parameter name cannot be empty'));
    }

    if (props.type === 'select' && (!props.options || props.options.length === 0)) {
      return left(
        new InvalidTemplateError(`select parameter "${props.name}" must have at least one option`),
      );
    }

    if (props.min !== null && props.max !== null && props.min > props.max) {
      return left(
        new InvalidTemplateError(
          `parameter "${props.name}" min (${props.min}) cannot be greater than max (${props.max})`,
        ),
      );
    }

    if (props.required && props.defaultValue === null) {
      return left(
        new InvalidTemplateError(`required parameter "${props.name}" must have a defaultValue`),
      );
    }

    return right(
      new TemplateParameter({
        name: props.name,
        type: props.type,
        required: props.required,
        defaultValue: props.defaultValue,
        min: props.min ?? null,
        max: props.max ?? null,
        options: props.options ? [...props.options] : null,
      }),
    );
  }

  get name(): string {
    return this.props.name;
  }

  get type(): ParameterType {
    return this.props.type;
  }

  get required(): boolean {
    return this.props.required;
  }

  get defaultValue(): string | number | boolean | null {
    return this.props.defaultValue;
  }

  get min(): number | null {
    return this.props.min;
  }

  get max(): number | null {
    return this.props.max;
  }

  get options(): string[] | null {
    return this.props.options ? [...this.props.options] : null;
  }
}
