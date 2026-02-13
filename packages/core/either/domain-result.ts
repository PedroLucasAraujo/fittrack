import { Either } from "./either";
import { DomainError } from "../errors/domain-error";

/**
 * Standard return type for domain operations that can fail.
 *
 * `Left<DomainError>` carries the typed error; `Right<T>` carries the
 * success payload. All value-object factories and domain methods that
 * validate input must return `DomainResult<T>` instead of throwing.
 *
 * @see {@link Either} for the underlying discriminated union.
 */
export type DomainResult<T> = Either<DomainError, T>;
