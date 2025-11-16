import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionWrong } from 'src/entities/question-wrong.entity';
import { WrongQuestionSortType } from 'src/dtos/app/question/get-wrong-question-list-query.app.dto';

@Injectable()
export class QuestionWrongRepository {
  constructor(
    @InjectRepository(QuestionWrong)
    private readonly questionWrongRepository: Repository<QuestionWrong>,
  ) {}

  async create(questionWrong: Partial<QuestionWrong>) {
    const newQuestionWrong = this.questionWrongRepository.create(questionWrong);
    return this.questionWrongRepository.save(newQuestionWrong);
  }

  async updateById(id: number, updateData: Partial<QuestionWrong>) {
    await this.questionWrongRepository.update(id, updateData);
    return this.questionWrongRepository.findOne({ where: { id } });
  }

  async findByUserIdAndQuestionId(userId: number, questionId: number) {
    return this.questionWrongRepository.findOne({
      where: { userId, questionId },
    });
  }

  async findAndCountNotReviewByUserId(
    userId: number,
    page: number,
    limit: number,
    {
      sortType,
    }: {
      sortType?: WrongQuestionSortType;
    },
  ) {
    const queryBuilder =
      this.questionWrongRepository.createQueryBuilder('questionWrong');
    queryBuilder.where('questionWrong.userId = :userId', { userId });
    queryBuilder.andWhere('questionWrong.isReviewed = :isReviewed', {
      isReviewed: false,
    });

    if (sortType === WrongQuestionSortType.MOST_WRONG) {
      queryBuilder.orderBy('questionWrong.wrongCount', 'DESC');
    } else if (sortType === WrongQuestionSortType.LEAST_RECENT) {
      queryBuilder.orderBy('questionWrong.lastWrongAt', 'ASC');
    } else {
      queryBuilder.orderBy('questionWrong.lastWrongAt', 'DESC');
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    return queryBuilder.getManyAndCount();
  }
}
