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
    const query = this.questionSessionMapRepository
      .createQueryBuilder('qsm')
      .where('qsm.questionSessionId = :sessionId', { sessionId });

    if (currentQuestionMapId) {
      query.andWhere('qsm.id > :currentQuestionMapId', {
        currentQuestionMapId,
      });
    }

    query.orderBy('qsm.id', 'ASC').limit(2);

    const questions = await query.getMany();

    await this.questionSessionMapRepository.update(
      { id: questions[0].id },
      { isOpened: true },
    );

    return {
      nextQuestion: questions[0],
      hasMore: questions.length > 1,
    };
  }

  async getPreviousQuestionBySessionId(
    sessionId: number,
    currentQuestionMapId: number,
  ) {
    const query = this.questionSessionMapRepository
      .createQueryBuilder('qsm')
      .where('qsm.questionSessionId = :sessionId', { sessionId });

    if (currentQuestionMapId) {
      query.andWhere('qsm.id < :currentQuestionMapId', {
        currentQuestionMapId,
      });
    }

    query.orderBy('qsm.id', 'DESC').limit(2);
    const questions = await query.getMany();

    return {
      previousQuestion: questions[0],
      hasMore: questions.length > 1,
    };
  }

  async getLastOpenedQuestionBySessionId(sessionId: number) {
    return this.questionSessionMapRepository.findOne({
      where: { questionSessionId: sessionId, isOpened: true },
      order: { id: 'DESC' },
    });
  }

  async findById(id: number) {
    return this.questionSessionMapRepository.findOne({ where: { id } });
  }
}
