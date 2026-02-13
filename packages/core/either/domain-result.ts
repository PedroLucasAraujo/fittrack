import { Either } from "./either";
import { DomainError } from "../errors/domain-error";

export type DomainResult<T> = Either<DomainError, T>;
