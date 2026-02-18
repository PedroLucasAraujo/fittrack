import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { SessionTitle } from '../../domain/value-objects/session-title.js';
import { DurationMinutes } from '../../domain/value-objects/duration-minutes.js';
import { Session } from '../../domain/aggregates/session.js';
import { ProfessionalBannedError } from '../../domain/errors/professional-banned-error.js';
import type { ISessionRepository } from '../../domain/repositories/session-repository.js';
import type { CreateSessionInputDTO } from '../dtos/create-session-input-dto.js';
import type { CreateSessionOutputDTO } from '../dtos/create-session-output-dto.js';

/**
 * Creates a new Session (sellable time unit) for a professional.
 *
 * ## Enforced invariants
 *
 * 1. Banned state (ADR-0022 / ADR-0041 §2): BANNED blocks all new domain entities.
 * 2. Title validation.
 * 3. Duration validation.
 */
export class CreateSession {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(
    dto: CreateSessionInputDTO,
    isBanned: boolean,
  ): Promise<DomainResult<CreateSessionOutputDTO>> {
    // 1. Banned state enforcement (ADR-0022 / ADR-0041 §2)
    if (isBanned) {
      return left(new ProfessionalBannedError(dto.professionalProfileId));
    }

    const titleResult = SessionTitle.create(dto.title);
    if (titleResult.isLeft()) return left(titleResult.value);

    const durationResult = DurationMinutes.create(dto.durationMinutes);
    if (durationResult.isLeft()) return left(durationResult.value);

    const sessionResult = Session.create({
      professionalProfileId: dto.professionalProfileId,
      title: titleResult.value,
      durationMinutes: durationResult.value,
    });
    /* v8 ignore next */
    if (sessionResult.isLeft()) return left(sessionResult.value);

    const session = sessionResult.value;
    await this.sessionRepository.save(session);

    return right({
      sessionId: session.id,
      professionalProfileId: session.professionalProfileId,
      title: session.title.value,
      durationMinutes: session.durationMinutes.value,
      status: session.status,
      createdAtUtc: session.createdAtUtc.toISO(),
    });
  }
}
