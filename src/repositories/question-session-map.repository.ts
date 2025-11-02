import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionSessionMap } from 'src/entities/question-session-map.entity';
import { EntityManager, In, Repository } from 'typeorm';

@Injectable()
export class QuestionSessionMapRepository {
  constructor(
    @InjectRepository(QuestionSessionMap)
    private readonly questionSessionMapRepository: Repository<QuestionSessionMap>,
  ) {}
  async create(
    sessionMap: Partial<QuestionSessionMap>,
    entityManager?: EntityManager,
  ) {
    const newSession = this.questionSessionMapRepository.create(sessionMap);
    return entityManager
      ? entityManager.save(newSession)
      : this.questionSessionMapRepository.save(newSession);
  }

  async createMany(
    sessionMaps: Partial<QuestionSessionMap>[],
    entityManager?: EntityManager,
  ) {
    const newSessions = this.questionSessionMapRepository.create(sessionMaps);
    return entityManager
      ? entityManager.save(newSessions)
      : this.questionSessionMapRepository.save(newSessions);
  }

  async countBySessionId(sessionId: number) {
    return this.questionSessionMapRepository.count({
      where: { questionSessionId: sessionId },
    });
  }

  async getNextQuestionBySessionId(
    sessionId: number,
    currentQuestionMapId?: number,
  ) {
    const baseQuery = this.questionSessionMapRepository
      .createQueryBuilder('qsm')
      .innerJoinAndSelect(
        'qsm.question',
        'question',
        'question.deletedAt IS NULL',
      )
      .where('qsm.questionSessionId = :sessionId', { sessionId });

    const totalQuestionCount = await baseQuery.getCount();

    if (currentQuestionMapId) {
      baseQuery.andWhere('qsm.id > :currentQuestionMapId', {
        currentQuestionMapId,
      });
    }

    const remainingCount = await baseQuery.getCount();

    const nextQuestion = await baseQuery
      .orderBy('qsm.id', 'ASC')
      .limit(1)
      .getOne();

    if (nextQuestion) {
      await this.questionSessionMapRepository.update(
        { id: nextQuestion.id },
        { isOpened: true },
      );
    }

    return {
      nextQuestion,
      hasMore: remainingCount > 1,
      nextQuestionCount: remainingCount - 1,
      totalQuestionCount,
    };
  }

  async getPreviousQuestionBySessionId(
    sessionId: number,
    currentQuestionMapId: number,
  ) {
    const baseQuery = this.questionSessionMapRepository
      .createQueryBuilder('qsm')
      .innerJoinAndSelect(
        'qsm.question',
        'question',
        'question.deletedAt IS NULL',
      )
      .where('qsm.questionSessionId = :sessionId', { sessionId });

    const totalQuestionCount = await baseQuery.getCount();

    if (currentQuestionMapId) {
      baseQuery.andWhere('qsm.id < :currentQuestionMapId', {
        currentQuestionMapId,
      });
    }

    const remainingCount = await baseQuery.getCount();
    const previousQuestion = await baseQuery
      .orderBy('qsm.id', 'DESC')
      .limit(1)
      .getOne();

    return {
      previousQuestion,
      hasMore: remainingCount > 1,
      previousQuestionCount: remainingCount - 1,
      totalQuestionCount,
    };
  }

  async getLastOpenedQuestionBySessionId(sessionId: number) {
    const lastOpenedQuestion = await this.questionSessionMapRepository
      .createQueryBuilder('qsm')
      .innerJoinAndSelect(
        'qsm.question',
        'question',
        'question.deletedAt IS NULL',
      )
      .where('qsm.questionSessionId = :sessionId', { sessionId })
      .andWhere('question.deletedAt IS NULL')
      .andWhere('qsm.isOpened = true')
      .orderBy('qsm.id', 'DESC')
      .limit(1)
      .getOne();

    return lastOpenedQuestion;
  }

  async getQuestionIdsBySessionId(sessionId: number) {
    const sessionMaps = await this.questionSessionMapRepository.find({
      where: { questionSessionId: sessionId },
      select: ['questionId'],
    });
    return sessionMaps.map((map) => map.questionId);
  }

  async findById(id: number) {
    return this.questionSessionMapRepository.findOne({ where: { id } });
  }

  async updateById(id: number, updateData: Partial<QuestionSessionMap>) {
    return this.questionSessionMapRepository.update({ id }, updateData);
  }
}
