import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import {
  QuestionType,
  userAnswerKeyMapping,
} from 'src/common/constants/question-type.enum';
import { SessionType } from 'src/common/constants/session-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import {
  GetCompletionQuestionAppDto,
  GetInterviewQuestionAppDto,
  GetMatchingQuestionAppDto,
  GetMultipleChoiceQuestionAppDto,
  GetShortAnswerQuestionAppDto,
  GetTrueFalseQuestionAppDto,
} from 'src/dtos/app/question/get-question.app.dto';
import {
  GetAllQuestionSessionAppDto,
  GetMockQuestionSessionAppDto,
  GetUnitQuestionSessionAppDto,
} from 'src/dtos/app/question/get-question-session.app.dto';
import { QuestionSession } from 'src/entities/question-session.entity';
import { Question } from 'src/entities/question.entity';
import { Unit } from 'src/entities/unit.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionSessionMapRepository } from 'src/repositories/question-session-map.repository';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';
import { EntityManager } from 'typeorm';
import { GetQuestionWithStepAppDto } from 'src/dtos/app/question/get-question-with-step.app.dto';
import { QuestionSessionSegmentRepository } from 'src/repositories/question-session-segment.repository';
import { CreateQuestionSessionByMockAppDto } from 'src/dtos/app/question/create-question-session-by-mock.app.dto';
import { QuestionSessionMap } from 'src/entities/question-session-map.entity';

@Injectable()
export class AppQuestionSessionService {
  constructor(
    private readonly questionSessionRepository: QuestionSessionRepository,
    private readonly questionSessionMapRepository: QuestionSessionMapRepository,
    private readonly questionSessionSegmentRepository: QuestionSessionSegmentRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly unitRepository: UnitRepository,
    private readonly answerRepository: AnswerRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getNextQuestion(
    userId: number,
    sessionId: number,
    currentQuestionMapId?: number,
  ) {
    const session = await this.questionSessionRepository.findOneById(sessionId);

    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    if (session.type === SessionType.UNIT) {
      const { nextQuestion, hasMore, nextQuestionCount, totalQuestionCount } =
        await this.questionSessionMapRepository.getNextQuestionBySessionId(
          session.id,
          currentQuestionMapId,
        );

      if (!nextQuestion) {
        throw new CustomHttpException(ErrorCodes.QUESTION_NEXT_NOT_FOUND);
      }

      const question = await this.questionRepository.findById(
        nextQuestion.questionId,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: !hasMore,
        previousQuestionCount: totalQuestionCount - nextQuestionCount - 1,
        nextQuestionCount: hasMore ? nextQuestionCount : 0,
        questionMapId: nextQuestion.id,
        question: questionResponse,
      });
    } else if (session.type === SessionType.ALL) {
      const excludeQuestionIds =
        await this.questionSessionMapRepository.getQuestionIdsBySessionId(
          session.id,
        );
      const choiceQuestion =
        await this.questionRepository.findRandomByUnitIdsAndExcludeQuestionIds(
          session.referenceIds,
          excludeQuestionIds,
        );

      const mapId = await this.questionSessionMapRepository.create({
        questionSessionId: session.id,
        questionId: choiceQuestion.id,
        userId,
      });

      const question = await this.questionRepository.findById(
        choiceQuestion.id,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: false,
        questionMapId: mapId.id,
        question: questionResponse,
        previousQuestionCount: null,
        nextQuestionCount: null,
      });
    } else if (session.type === SessionType.MOCK) {
      const { nextQuestion, hasMore, nextQuestionCount, totalQuestionCount } =
        await this.questionSessionMapRepository.getNextQuestionBySessionId(
          session.id,
          currentQuestionMapId,
        );

      if (!nextQuestion) {
        throw new CustomHttpException(ErrorCodes.QUESTION_NEXT_NOT_FOUND);
      }

      const question = await this.questionRepository.findById(
        nextQuestion.questionId,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: !hasMore,
        previousQuestionCount: totalQuestionCount - nextQuestionCount - 1,
        nextQuestionCount: hasMore ? nextQuestionCount : 0,
        questionMapId: nextQuestion.id,
        question: questionResponse,
        userAnswer:
          nextQuestion?.userAnswer?.[userAnswerKeyMapping[question.type]] ||
          null,
      });
    }
  }

  async getPreviousQuestion(
    userId: number,
    sessionId: number,
    currentQuestionMapId: number,
  ) {
    const session = await this.questionSessionRepository.findOneById(sessionId);

    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    if (session.type == SessionType.UNIT) {
      const { previousQuestion, previousQuestionCount, totalQuestionCount } =
        await this.questionSessionMapRepository.getPreviousQuestionBySessionId(
          session.id,
          currentQuestionMapId,
        );
      if (!previousQuestion) {
        throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
      }
      const question = await this.questionRepository.findById(
        previousQuestion.questionId,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: false,
        questionMapId: previousQuestion.id,
        question: questionResponse,
        previousQuestionCount: previousQuestionCount,
        nextQuestionCount: totalQuestionCount - previousQuestionCount - 1,
      });
    } else if (session.type == SessionType.ALL) {
      const { previousQuestion, previousQuestionCount, totalQuestionCount } =
        await this.questionSessionMapRepository.getPreviousQuestionBySessionId(
          session.id,
          currentQuestionMapId,
        );

      if (!previousQuestion) {
        throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
      }

      const question = await this.questionRepository.findById(
        previousQuestion.questionId,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: false,
        questionMapId: previousQuestion.id,
        question: questionResponse,
        previousQuestionCount: previousQuestionCount,
        nextQuestionCount: totalQuestionCount - previousQuestionCount - 1,
      });
    } else if (session.type == SessionType.MOCK) {
      const { previousQuestion, previousQuestionCount, totalQuestionCount } =
        await this.questionSessionMapRepository.getPreviousQuestionBySessionId(
          session.id,
          currentQuestionMapId,
        );
      if (!previousQuestion) {
        throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
      }
      const question = await this.questionRepository.findById(
        previousQuestion.questionId,
      );

      const questionResponse = await this.questionResponseMapper(question);

      return plainToInstance(GetQuestionWithStepAppDto, {
        isLastQuestion: false,
        questionMapId: previousQuestion.id,
        question: questionResponse,
        previousQuestionCount: previousQuestionCount,
        nextQuestionCount: totalQuestionCount - previousQuestionCount - 1,
        userAnswer:
          previousQuestion?.userAnswer?.[userAnswerKeyMapping[question.type]],
      });
    }
  }

  async getCurrentQuestion(userId: number, sessionId: number) {
    const session = await this.questionSessionRepository.findOneById(sessionId);

    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    switch (session.type) {
      case SessionType.UNIT:
        const currentQuestionMap =
          await this.questionSessionMapRepository.getLastOpenedQuestionBySessionId(
            session.id,
          );
        if (!currentQuestionMap) {
          throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
        }
        const question = await this.questionRepository.findById(
          currentQuestionMap.questionId,
        );

        const questionResponse = await this.questionResponseMapper(question);

        return plainToInstance(GetQuestionWithStepAppDto, {
          isLastQuestion: false,
          questionMapId: currentQuestionMap.id,
          question: questionResponse,
          previousQuestionCount: null,
          nextQuestionCount: null,
        });
      default:
        throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }
  }

  async getLatestSession(userId: number) {
    const session =
      await this.questionSessionRepository.findLatestSessionByUserId(userId);

    if (!session) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    return this.getSessionById(userId, session.id);
  }

  async getSessionById(userId: number, sessionId: number) {
    const session = await this.questionSessionRepository.findOneById(sessionId);

    if (!session || session.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    switch (session.type) {
      case SessionType.UNIT:
        const unit = await this.unitRepository.findOneById(session.referenceId);
        if (!unit) {
          throw new CustomHttpException(ErrorCodes.UNIT_NOT_FOUND);
        }

        return this.unitSessionResponseMapper(session, unit);
      case SessionType.ALL:
        return this.allQuestionSessionResponseMapper(session);
      case SessionType.MOCK:
        return this.mockQuestionSessionResponseMapper(session);
      default:
        throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }
  }

  async createSessionByUnitId(userId: number, unitId: number) {
    const unit = await this.unitRepository.findOneById(unitId);
    if (!unit) throw new CustomHttpException(ErrorCodes.UNIT_NOT_FOUND);

    const questions = await this.questionRepository.findByUnitId(unitId);

    const session = await this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const session = await this.questionSessionRepository.create(
          {
            type: SessionType.UNIT,
            referenceId: unitId,
            userId,
          },
          transactionalEntityManager,
        );

        await this.questionSessionMapRepository.createMany(
          questions.map((question) => ({
            questionSessionId: session.id,
            questionId: question.id,
            userId,
          })),
          transactionalEntityManager,
        );

        return session;
      },
    );

    return plainToInstance(
      GetUnitQuestionSessionAppDto,
      {
        id: session.id,
        unitId: unit.id,
        unitName: unit.name,
        type: session.type,
        totalQuestions: questions.length,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createSessionByAll(userId: number, unitIds: number[]) {
    const session = await this.questionSessionRepository.create({
      type: SessionType.ALL,
      referenceIds: unitIds,
      userId,
    });

    return plainToInstance(
      GetUnitQuestionSessionAppDto,
      {
        id: session.id,
        type: session.type,
        totalQuestions: -1,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createSessionByMock(
    userId: number,
    createQuestionSessionByMockDto: CreateQuestionSessionByMockAppDto,
  ) {
    const questions = await this.questionRepository.findByUnitIds(
      createQuestionSessionByMockDto.unitIds,
    );

    const session = await this.entityManager.transaction(
      async (transactionalEntityManager) => {
        const session = await this.questionSessionRepository.create(
          {
            type: SessionType.MOCK,
            referenceIds: createQuestionSessionByMockDto.unitIds,
            userId,
          },
          transactionalEntityManager,
        );

        await this.questionSessionMapRepository.createMany(
          questions
            .sort(() => Math.random() - 0.5)
            .slice(0, createQuestionSessionByMockDto.count)
            .map((question) => ({
              questionSessionId: session.id,
              questionId: question.id,
              userId,
            })),
          transactionalEntityManager,
        );

        return session;
      },
    );

    return plainToInstance(
      GetUnitQuestionSessionAppDto,
      {
        id: session.id,
        type: session.type,
        totalQuestions: questions.length,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async mockQuestionSessionResponseMapper(session: QuestionSession) {
    const lastQuestionMap =
      await this.questionSessionMapRepository.getLastOpenedQuestionBySessionId(
        session.id,
      );

    const totalQuestions =
      await this.questionSessionMapRepository.countBySessionId(session.id);

    const durationMs = await this.questionSessionSegmentRepository.getElapsedMs(
      session.id,
    );

    return plainToInstance(
      GetMockQuestionSessionAppDto,
      {
        id: session.id,
        type: session.type,
        lastQuestionMapId: lastQuestionMap?.id || null,
        durationMs,
        totalQuestions,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async allQuestionSessionResponseMapper(session: QuestionSession) {
    const lastQuestionMap =
      await this.questionSessionMapRepository.getLastOpenedQuestionBySessionId(
        session.id,
      );

    const durationMs = await this.questionSessionSegmentRepository.getElapsedMs(
      session.id,
    );

    return plainToInstance(
      GetAllQuestionSessionAppDto,
      {
        id: session.id,
        type: session.type,
        lastQuestionMapId: lastQuestionMap?.id || null,
        durationMs,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async unitSessionResponseMapper(
    session: QuestionSession,
    unit: Unit,
  ) {
    const lastQuestionMap =
      await this.questionSessionMapRepository.getLastOpenedQuestionBySessionId(
        session.id,
      );
    const totalQuestions =
      await this.questionSessionMapRepository.countBySessionId(session.id);

    const durationMs = await this.questionSessionSegmentRepository.getElapsedMs(
      session.id,
    );

    return plainToInstance(
      GetUnitQuestionSessionAppDto,
      {
        id: session.id,
        unitId: unit.id,
        unitName: unit.name,
        type: session.type,
        totalQuestions,
        lastQuestionMapId: lastQuestionMap?.id || null,
        durationMs,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async questionResponseMapper(question: Question) {
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    const answers = await this.answerRepository.findByQuestionId(question.id);

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return plainToInstance(
          GetTrueFalseQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_CHOICE:
        return plainToInstance(
          GetMultipleChoiceQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            isMultipleAnswer: answers.filter((a) => a.isCorrect).length > 1,
            type: question.type,
            question: question.title,
            choices: answers.map((answer) => ({
              id: answer.id,
              option: answer.content,
            })),
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MATCHING:
        return plainToInstance(
          GetMatchingQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            leftItems: answers
              .filter((answer) => !answer.pairingAnswerId)
              .sort(() => Math.random() - 0.5)
              .map((answer) => ({
                id: answer.id,
                option: answer.content,
              })),
            rightItems: answers
              .filter((answer) => answer.pairingAnswerId)
              .sort(() => Math.random() - 0.5)
              .map((answer) => ({
                id: answer.id,
                option: answer.content,
              })),
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.SHORT_ANSWER:
        return plainToInstance(
          GetShortAnswerQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.COMPLETION:
        return plainToInstance(
          GetCompletionQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return plainToInstance(
          GetMultipleChoiceQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );

      case QuestionType.INTERVIEW:
        return plainToInstance(
          GetInterviewQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      default:
        break;
    }
  }
}
