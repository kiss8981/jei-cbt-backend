import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { WrongQuestionSortType } from 'src/dtos/app/question/get-wrong-question-list-query.app.dto';
import { GetWrongQuestionListAppDto } from 'src/dtos/app/question/get-wrong-question-list.app.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { QuestionWrongRepository } from 'src/repositories/question-wrong.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';
import { AppQuestionService } from '../app.question.service';
import { GetWrongQuestionAppDto } from 'src/dtos/app/question/get-wrong-question.app.dto';
import { WrongAnswerRequestAppDto } from 'src/dtos/app/question/wrong-answer-request.app.dto';
import { AppQuestionSessionSubmissionService } from '../session/app.question-session-submission.service';
import { validate } from 'class-validator';
import { collectMessages } from 'src/utils/validation';
import { WrongAnswerResponseAppDto } from 'src/dtos/app/question/wrong-answer-response.app.dto';
import { AppQuestionSharedService } from '../app.question-shared.service';

@Injectable()
export class AppQuestionWrongService {
  constructor(
    private readonly questionWrongRepository: QuestionWrongRepository,

    private readonly questionRepository: QuestionRepository,
    private readonly unitRepository: UnitRepository,
    private readonly appQuestionService: AppQuestionService,
    private readonly appQuestionSharedService: AppQuestionSharedService,
  ) {}

  async getWrongQuestionDetail(userId: number, wrongId: number) {
    const wrongQuestion =
      await this.questionWrongRepository.findByUserIdAndWrongId(
        userId,
        wrongId,
      );

    if (!wrongQuestion) {
      throw new CustomHttpException(ErrorCodes.WRONG_QUESTION_NOT_FOUND);
    }

    const question = await this.appQuestionService.getQuestionById(
      wrongQuestion.questionId,
    );

    return plainToInstance(GetWrongQuestionAppDto, {
      id: wrongQuestion.id,
      questionId: wrongQuestion.questionId,
      wrongCount: wrongQuestion.wrongCount,
      lastWrongAt: wrongQuestion.lastWrongAt,
      isReviewed: wrongQuestion.isReviewed,
      title: question.title,
      question: question,
    });
  }

  async wrongQuestionAnswer(
    userId: number,
    wrongId: number,
    body: WrongAnswerRequestAppDto,
  ) {
    const wrongQuestion =
      await this.questionWrongRepository.findByUserIdAndWrongId(
        userId,
        wrongId,
      );

    if (!wrongQuestion) {
      throw new CustomHttpException(ErrorCodes.WRONG_QUESTION_NOT_FOUND);
    }

    const question = await this.questionRepository.findById(
      wrongQuestion.questionId,
    );

    if (!question || wrongQuestion.userId != userId) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const submissionDto = plainToInstance(WrongAnswerRequestAppDto, {
      ...body,
      type: question.type,
    });

    const errors = await validate(submissionDto);

    if (errors.length > 0) {
      const messages = collectMessages(errors);
      const reason = messages.join(', ');

      throw new CustomHttpException({
        ...ErrorCodes.VALIDATION_FAILED,
        message: reason || 'Validation failed',
      });
    }

    const { isCorrect, explanation, answer } =
      await this.appQuestionSharedService.isAnswerCorrect(
        question,
        submissionDto,
      );

    if (isCorrect) {
      await this.questionWrongRepository.updateById(wrongId, {
        isReviewed: true,
      });
    }

    return plainToInstance(WrongAnswerResponseAppDto, {
      wrongId: wrongId,
      isCorrect,
      explanation,
      answer,
    });
  }

  async getWrongQuestions(
    userId: number,
    page: number,
    pageSize: number,
    {
      sortType,
    }: {
      sortType?: WrongQuestionSortType;
    },
  ) {
    const [items, total] =
      await this.questionWrongRepository.findAndCountNotReviewByUserId(
        userId,
        page,
        pageSize,
        { sortType },
      );

    const questions = await this.questionRepository.findByIds(
      Array.from(new Set(items.map((item) => item.questionId))),
    );
    const units = await this.unitRepository.findByIds(
      Array.from(new Set(questions.map((q) => q.unitId))),
    );

    return plainToInstance(createPaginationDto(GetWrongQuestionListAppDto), {
      items: plainToInstance(
        GetWrongQuestionListAppDto,
        items.map((item) => {
          const question = questions.find((q) => q.id == item.questionId);
          const unit = units.find((u) => u.id == question.unitId);
          return {
            id: item.id,
            questionId: item.questionId,
            wrongCount: item.wrongCount,
            lastWrongAt: item.lastWrongAt,
            isReviewed: item.isReviewed,
            title: question.title,
            unitId: unit.id,
            unitName: unit.name,
          };
        }),
        {
          excludeExtraneousValues: true,
        },
      ),
      totalCount: total,
      page,
      pageSize,
    });
  }

  async addWrongQuestion(userId: number, questionId: number) {
    const existing =
      await this.questionWrongRepository.findByUserIdAndQuestionId(
        userId,
        questionId,
      );

    if (existing) {
      return this.questionWrongRepository.updateById(existing.id, {
        wrongCount: existing.wrongCount + 1,
        lastWrongAt: new Date(),
        isReviewed: false,
      });
    }

    return this.questionWrongRepository.create({
      userId,
      questionId,
      wrongCount: 1,
      lastWrongAt: new Date(),
      isReviewed: false,
    });
  }
}
