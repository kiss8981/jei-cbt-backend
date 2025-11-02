import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUser } from 'src/entities/admin-user.entity';
import { QuestionSession } from 'src/entities/question-session.entity';
import { Unit } from 'src/entities/unit.entity';
import { EntityManager, In, Repository } from 'typeorm';

@Injectable()
export class QuestionSessionRepository {
  constructor(
    @InjectRepository(QuestionSession)
    private readonly questionSessionRepository: Repository<QuestionSession>,
  ) {}
  async create(
    session: Partial<QuestionSession>,
    entityManager?: EntityManager,
  ) {
    const newSession = this.questionSessionRepository.create(session);
    return entityManager
      ? entityManager.save(newSession)
      : this.questionSessionRepository.save(newSession);
  }

  async findOneById(id: number) {
    return this.questionSessionRepository.findOne({
      where: { id },
    });
  }

  async findLatestSessionByUserId(userId: number) {
    return this.questionSessionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
