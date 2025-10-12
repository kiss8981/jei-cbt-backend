import { HttpException, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QuestionSessionSegment } from 'src/entities/question-session-segment.entity';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';

@Injectable()
export class AppQuestionSessionSegmentService {
  constructor(
    @InjectRepository(QuestionSessionSegment)
    private readonly sessionSegmentRepo: Repository<QuestionSessionSegment>,
    private readonly sessionRepository: QuestionSessionRepository,
  ) {}

  private async ensureOwner(userId: number, sessionId: number) {
    const session = await this.sessionRepository.findOneById(sessionId);

    if (!session || session.userId != userId)
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);

    return session;
  }

  async getDurationBySessionId(sessionId: number) {
    const [{ durationMs = 0 } = {} as any] =
      await this.sessionSegmentRepo.query(
        `
      SELECT
        COALESCE(SUM(TIMESTAMPDIFF(MICROSECOND, startedAt, COALESCE(endedAt, NOW(3))) DIV 1000), 0) AS durationMs
      FROM question_session_segment
      WHERE sessionId = ?
      `,
        [sessionId],
      );

    return Number(durationMs);
  }
}
