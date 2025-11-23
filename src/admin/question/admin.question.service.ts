import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { plainToClass, plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import {
  CreateQuestionAdminDto,
  CreateQuestionMultipleChoiceAdminDto,
} from 'src/dtos/admin/question/create-question.admin.dto';
import { UpdateQuestionAdminDto } from 'src/dtos/admin/question/update-question.admin.dto';
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
import { GetPhotoMappingAdminDto } from 'src/dtos/admin/upload/get-photo-mapping.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { Answer } from 'src/entities/answer.entity';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';
import { EntityManager, Repository } from 'typeorm';
import { AdminUploadService } from '../upload/admin.upload.service';
import { PhotoMappingTypeEnum } from 'src/common/constants/photo-mapping-type.enum';
import * as xlsx from 'xlsx';
import { validate } from 'class-validator';
@Injectable()
export class AdminQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly unitRepository: UnitRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly photoMapRepository: PhotoMapRepository,
    private readonly adminUploadService: AdminUploadService,
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

  async update(id: number, dto: UpdateQuestionAdminDto) {
    const question = await this.questionRepository.findById(id);
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);

    await this.questionRepository.update(id, {
      title: dto.title,
      explanation: dto.explanation,
      additionalText: dto.additionalText,
    });

    return this.getById(id);
  }

  async getById(id: number) {
    const question = await this.questionRepository.findById(id);
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    const answers = await this.answerRepository.findByQuestionId(id);

    const photos = await this.photoMapRepository.findByQuestionId(id);
    const photoDto = photos.map((photo) =>
      plainToInstance(
        GetPhotoMappingAdminDto,
        {
          id: photo.id,
          key: photo.key,
          orderIndex: photo.orderIndex,
          originalFileName: photo.originalName,
        },
        { excludeExtraneousValues: true },
      ),
    );

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
            photos: photoDto,
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
            photos: photoDto,
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
            photos: photoDto,
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
            photos: photoDto,
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
            photos: photoDto,
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
            photos: photoDto,
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
            photos: photoDto,
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
  async createManyFromExcel(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames.filter(
      (name) => name !== workbook.SheetNames[0],
    );

    const transformedData: CreateQuestionAdminDto[] = [];

    for (const sheetName of sheets) {
      const sheet = workbook.Sheets[sheetName]; // 첫 번째 시트 가져오기
      const data = xlsx.utils.sheet_to_json(sheet, {
        defval: null,
        raw: false,
      });
      data.map((row: any) => {
        try {
          let base: CreateQuestionAdminDto = {
            unitId: row['unitId'] as number,
            type: row['type'].trim() as QuestionType,
            title: row['title'] as string,
            explanation: row['explanation'] as string,
            additionalText: row['additionalText'] as string,
          };

          switch (base.type) {
            case QuestionType.TRUE_FALSE:
              base.answersForCorrectAnswerForTrueFalse =
                row['answersForCorrectAnswerForTrueFalse']
                  .toString()
                  .toLowerCase() == 'true';
              break;
            case QuestionType.MULTIPLE_CHOICE:
              const choices: CreateQuestionMultipleChoiceAdminDto[] = [];
              const items = (row['answersForMultipleChoice'] as string)
                .replaceAll('\r', '')
                .split('\n')
                .filter((item) => item.trim() !== '');
              const corrects = (
                row['answersForMultipleChoiceIsCorrect'] as string
              )
                .replaceAll('\r', '')
                .split('\n')
                .filter((item) => item.trim() !== '')
                .map((item) => item.toLowerCase() == 'true');

              items.map((item, idx) => {
                choices.push({
                  content: item.trim(),
                  isCorrect: corrects[idx],
                });
              });
              base.answersForMultipleChoice = choices;
              break;
            case QuestionType.MATCHING:
              const matchings: any[] = [];
              const leftItems = (row['answersForMatchingLeftItem'] as string)
                .replaceAll('\r', '')
                .split('\n')
                .filter((item) => item.trim() !== '');
              const rightItems = (row['answersForMatchingRightItem'] as string)
                .replaceAll('\r', '')
                .split('\n')
                .filter((item) => item.trim() !== '');

              leftItems.map((leftItem, idx) => {
                matchings.push({
                  leftItem: leftItem.trim(),
                  rightItem: rightItems[idx].trim(),
                });
              });
              base.answersForMatching = matchings;
              break;
            case QuestionType.SHORT_ANSWER:
              const shortAnswers = (row['answersForShortAnswer'] as string)
                .replaceAll('\r', '')
                .split('\n')
                .filter((item) => item.trim() !== '');
              base.answersForShortAnswer = shortAnswers;
              break;
            case QuestionType.MULTIPLE_SHORT_ANSWER:
              const multipleShortAnswers: any[] = [];
              const orderIndexes = (
                row['answersForMultipleShortAnswerOrderIndex'] as string
              )
                .replaceAll('\r', '')
                .split('\n')
                .map(Number);

              const msaItems = (
                row['answersForMultipleShortAnswerContent'] as string
              )
                .replaceAll('\r', '')
                .split('\n');
              msaItems.map((item, idx) => {
                multipleShortAnswers.push({
                  content: item.trim(),
                  orderIndex: orderIndexes[idx],
                });
              });
              base.answersForMultipleShortAnswer = multipleShortAnswers;
              break;
            case QuestionType.INTERVIEW:
              base.answersForInterview = row['answersForInterview'] as string;
              break;
          }

          transformedData.push(base);
        } catch (error) {
          throw new Error(
            `Error processing row with title "${row['title']}": ${error.message}`,
          );
        }
      });
    }

    const plainDtos = plainToInstance(CreateQuestionAdminDto, transformedData);
    // QuestionType.MATCHING
    // QuestionType.MULTIPLE_SHORT_ANSWER
    // QuestionType.MULTIPLE_SHORT_ANSWER
    // QuestionType.MULTIPLE_CHOICE
    // QuestionType.TRUE_FALSE

    for await (const dto of plainDtos) {
      try {
        // console.log(`Creating question titled "${dto.type} - ${dto.title}"...`);
        await this.create(dto);
      } catch (error) {
        console.error(
          `Error creating question titled "${dto.type} - ${dto.title}": ${error.message}`,
        );
      }
    }
  }
}
