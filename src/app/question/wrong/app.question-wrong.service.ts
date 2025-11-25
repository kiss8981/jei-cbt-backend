import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WrongQuestionSortType } from 'src/dtos/app/question/get-wrong-question-list-query.app.dto';
import { GetWrongQuestionListAppDto } from 'src/dtos/app/question/get-wrong-question-list.app.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { QuestionWrongRepository } from 'src/repositories/question-wrong.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class AppQuestionWrongService {
  constructor(
    private readonly questionWrongRepository: QuestionWrongRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly unitRepository: UnitRepository,
  ) {}

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
