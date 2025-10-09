import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { EditQuestionAdminDto } from 'src/dtos/admin/question/edit-question.admin.dto';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { GetQuestionListAdminDto } from 'src/dtos/admin/question/get-question-list.admin.dto';
import {
  GetCompletionQuestionAdminDto,
  GetInterviewQuestionAdminDto,
  GetMatchingQuestionAdminDto,
  GetMultipleChoiceQuestionAdminDto,
  GetMultipleShortAnswerQuestionAdminDto,
  GetQuestionAdminDto,
  GetShortAnswerQuestionAdminDto,
  GetTrueFalseQuestionAdminDto,
} from 'src/dtos/admin/question/get-question.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { Answer } from 'src/entities/answer.entity';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class AdminQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly unitRepository: UnitRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getAll(
    page: number,
    limit: number,
    query: GetQuestionListQueryAdminDto,
  ) {
    const { keyword, unitIds } = query;

    const [questions, total] = await this.questionRepository.findAndCount(
      page,
      limit,
      {
        keyword,
        unitIds,
      },
    );

    if (questions.length === 0) {
      return plainToInstance(
        createPaginationDto(GetQuestionListAdminDto),
        {
          totalCount: 0,
          perPage: limit,
          pageNum: page,
          items: [],
        },
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );
    }

    const units = await this.unitRepository.findByIds(
      Array.from(new Set(questions.map((q) => q.unitId))),
    );

    return plainToInstance(
      createPaginationDto(GetQuestionListAdminDto),
      {
        items: questions.map((question) => {
          const unit = units.find((u) => u.id == question.unitId);
          return plainToInstance(
            GetQuestionListAdminDto,
            {
              id: question.id,
              title: question.title,
              type: question.type,
              explanation: question.explanation,
              additionalText: question.additionalText,
              unitId: question.unitId,
              unitName: unit.name,
              createdAt: question.createdAt,
            },
            { excludeExtraneousValues: true },
          );
        }),
        totalCount: Number(total),
        perPage: Number(limit),
        pageNum: Number(page),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async create(dto: CreateQuestionAdminDto) {
    await this.entityManager.transaction(async (manager) => {
      const question = await this.questionRepository.create(
        {
          title: dto.title,
          type: dto.type,
          explanation: dto.explanation,
          additionalText: dto.additionalText,
          unitId: dto.unitId,
        },
        manager,
      );

      switch (dto.type) {
        case QuestionType.TRUE_FALSE:
          const answer = await this.createTrueFalseQuestion(
            question,
            dto,
            manager,
          );
          question.answers = [answer];
          break;
        case QuestionType.MULTIPLE_CHOICE:
          const answers = await this.createMultipleChoiceQuestion(
            question,
            dto,
            manager,
          );
          question.answers = answers;
          break;
        case QuestionType.MATCHING:
          const matchingAnswers = await this.createMatchingQuestion(
            question,
            dto,
            manager,
          );
          question.answers = matchingAnswers;
          break;
        case QuestionType.SHORT_ANSWER:
          const shortAnswers = await this.createShortAnswerQuestion(
            question,
            dto,
            manager,
          );
          question.answers = shortAnswers;
          break;
        case QuestionType.COMPLETION:
          const completionAnswers = await this.createCompletionQuestion(
            question,
            dto,
            manager,
          );
          question.answers = completionAnswers;
          break;
        case QuestionType.MULTIPLE_SHORT_ANSWER:
          const multipleShortAnswers =
            await this.createMultipleShortAnswerQuestion(
              question,
              dto,
              manager,
            );
          question.answers = multipleShortAnswers;
          break;

        case QuestionType.INTERVIEW:
          const interviewAnswer = await this.createInterviewQuestion(
            question,
            dto,
            manager,
          );
          question.answers = [interviewAnswer];
          break;
        default:
          break;
      }
    });

    return { message: '문제가 성공적으로 생성되었습니다.' };
  }

  async getById(id: number) {
    const question = await this.questionRepository.findById(id);
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    const answers = await this.answerRepository.findByQuestionId(id);

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return plainToInstance(
          GetTrueFalseQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
            correctAnswer: answers[0].isCorrect,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_CHOICE:
        return plainToInstance(
          GetMultipleChoiceQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
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
          GetMatchingQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
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
          GetShortAnswerQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.COMPLETION:
        return plainToInstance(
          GetCompletionQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return plainToInstance(
          GetMultipleShortAnswerQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
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
          GetInterviewQuestionAdminDto,
          {
            id: question.id,
            title: question.title,
            explanation: question.explanation,
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

  private async createTrueFalseQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    return this.answerRepository.create(
      {
        isCorrect: dto.answersForCorrectAnswerForTrueFalse,
        questionId: question.id,
      },
      entityManager,
    );
  }

  private async createMultipleChoiceQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMultipleChoice) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: answerDto.isCorrect,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createMatchingQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMatching) {
      const leftItem = await this.answerRepository.create(
        {
          content: answerDto.leftItem,
          questionId: question.id,
        },
        entityManager,
      );
      const rightItem = await this.answerRepository.create(
        {
          content: answerDto.rightItem,
          questionId: question.id,
          pairingAnswerId: leftItem.id,
        },
        entityManager,
      );
      answers.push(leftItem, rightItem);
    }
    return answers;
  }

  private async createShortAnswerQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const shortAnswer of dto.answersForShortAnswer) {
      const answer = await this.answerRepository.create(
        {
          content: shortAnswer,
          isCorrect: true,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createCompletionQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForCompletion) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: answerDto.isCorrect,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createMultipleShortAnswerQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMultipleShortAnswer) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: true,
          orderIndex: answerDto.orderIndex,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createInterviewQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    return this.answerRepository.create(
      {
        content: dto.answersForInterview,
        isCorrect: true,
        questionId: question.id,
      },
      entityManager,
    );
  }
}
