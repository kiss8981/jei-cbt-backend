import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async findById(id: number) {
    return this.questionRepository.findOne({
      where: { id },
      relations: ['unit'],
    });
  }

  async findRandomByUnitIdsAndExcludeQuestionIds(
    unitIds: number[],
    excludeQuestionIds: number[],
  ) {
    const queryBuilder = this.questionRepository.createQueryBuilder('question');

    queryBuilder.where('question.unitId IN (:...unitIds)', { unitIds });

    if (excludeQuestionIds && excludeQuestionIds.length > 0) {
      queryBuilder.andWhere('question.id NOT IN (:...excludeQuestionIds)', {
        excludeQuestionIds,
      });
    }

    queryBuilder.orderBy('RAND()').limit(1);

    return queryBuilder.getOne();
  }

  async findByUnitId(unitId: number) {
    return this.questionRepository.find({
      where: { unit: { id: unitId } },
    });
  }

  async create(question: Partial<Question>, entityManager?: EntityManager) {
    const newQuestion = this.questionRepository.create(question);
    return entityManager
      ? entityManager.save(newQuestion)
      : this.questionRepository.save(newQuestion);
  }

  async update(
    id: number,
    question: Partial<Question>,
    entityManager?: EntityManager,
  ) {
    if (entityManager) {
      await entityManager.update(Question, { id }, question);
      return entityManager.findOne(Question, { where: { id } });
    } else {
      await this.questionRepository.update({ id }, question);
      return this.questionRepository.findOne({ where: { id } });
    }
  }

  async findAndCount(
    page: number,
    limit: number,
    filters: { keyword?: string; unitIds?: number[] },
  ): Promise<[Question[], number]> {
    const queryBuilder = this.questionRepository.createQueryBuilder('question');

    if (filters.keyword) {
      queryBuilder.andWhere('question.title LIKE :keyword', {
        keyword: `%${filters.keyword}%`,
      });
    }

    if (filters.unitIds && filters.unitIds.length > 0) {
      queryBuilder.andWhere('question.unitId IN (:...unitIds)', {
        unitIds: filters.unitIds,
      });
    }

    queryBuilder
      .orderBy('question.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [questions, total] = await queryBuilder.getManyAndCount();
    return [questions, total];
  }
}
