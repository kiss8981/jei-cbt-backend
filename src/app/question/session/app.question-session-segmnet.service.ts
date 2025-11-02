import { HttpException, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QuestionSessionSegment } from 'src/entities/question-session-segment.entity';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { QuestionSessionSegmentRepository } from 'src/repositories/question-session-segment.repository';
import { plainToInstance } from 'class-transformer';
import { GetQuestionSessionElapsedMsAppDto } from 'src/dtos/app/question/get-question-session-elapsed-ms.app.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppQuestionSessionSegmentService {
  constructor(
    private readonly sessionRepository: QuestionSessionRepository,
    private readonly sessionSegmentRepository: QuestionSessionSegmentRepository,
  ) {}

  async start(
    userId: number,
    sessionId: number,
  ): Promise<QuestionSessionSegment> {
    const session = await this.sessionRepository.findOneById(sessionId);
    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const openSegment =
      await this.sessionSegmentRepository.findOpenSegmentBySessionId(sessionId);

    if (openSegment) {
      await this.sessionSegmentRepository.stop(sessionId);
    }

    return this.sessionSegmentRepository.start(sessionId);
  }

  async stop(
    userId: number,
    sessionId: number,
  ): Promise<QuestionSessionSegment> {
    const session = await this.sessionRepository.findOneById(sessionId);
    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const stoppedSegment = await this.sessionSegmentRepository.stop(sessionId);

    if (!stoppedSegment) {
      throw new CustomHttpException(
        ErrorCodes.QUESTION_SESSION_SEGMENT_NOT_FOUND,
      );
    }

    return stoppedSegment;
  }

  async getElapsedMs(userId: number, sessionId: number) {
    const session = await this.sessionRepository.findOneById(sessionId);
    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const elapsedMs =
      await this.sessionSegmentRepository.getElapsedMs(sessionId);

    return plainToInstance(
      GetQuestionSessionElapsedMsAppDto,
      {
        elapsedMs,
        sessionId: Number(sessionId),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async pollSession(userId: number, sessionId: number) {
    const session = await this.sessionRepository.findOneById(sessionId);
    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    let openSegment =
      await this.sessionSegmentRepository.findOpenSegmentBySessionId(sessionId);

    if (!openSegment) {
      openSegment = await this.sessionSegmentRepository.start(sessionId);
    }

    await this.sessionSegmentRepository.updateLastPingAt(
      openSegment.id,
      new Date(),
    );

    return true;
  }

  @Cron('*/5 * * * * *')
  async closeStaleSessions() {
    const staleSegments =
      await this.sessionSegmentRepository.getStoppedPingSegments();

    for (const segment of staleSegments) {
      await this.sessionSegmentRepository.stop(segment.sessionId);
    }
  }
}
