import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
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
import { GetUnitQuestionSessionAppDto } from 'src/dtos/app/question/get-question-session.app.dto';
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

@Injectable()
export class AppQuestionSessionService {
  constructor(
    private readonly questionSessionRepository: QuestionSessionRepository,
    private readonly questionSessionMapRepository: QuestionSessionMapRepository,
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

    switch (session.type) {
      case SessionType.UNIT:
        const { nextQuestion, hasMore, nextQuestionCount, totalQuestionCount } =
          await this.questionSessionMapRepository.getNextQuestionBySessionId(
            session.id,
            currentQuestionMapId,
          );
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
      default:
        throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
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

    switch (session.type) {
      case SessionType.UNIT:
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
      default:
        throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
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

  private async unitSessionResponseMapper(
    session: QuestionSession,
    unit: Unit,
  ) {
    const lastQuestionMapId =
      await this.questionSessionMapRepository.getLastOpenedQuestionBySessionId(
        session.id,
      );
    const totalQuestions =
      await this.questionSessionMapRepository.countBySessionId(session.id);

    return plainToInstance(
      GetUnitQuestionSessionAppDto,
      {
        id: session.id,
        unitId: unit.id,
        unitName: unit.name,
        type: session.type,
        totalQuestions,
        lastQuestionMapId: lastQuestionMapId,
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
