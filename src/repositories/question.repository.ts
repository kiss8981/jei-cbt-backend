import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';

/**
 * QuestionRepository: 복잡한 Question 엔티티 구조를 처리하는 데이터 접근 계층
 */
@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async create(question: Partial<Question>, entityManager?: EntityManager) {
    const newQuestion = this.questionRepository.create(question);
    return entityManager
      ? entityManager.save(newQuestion)
      : this.questionRepository.save(newQuestion);
  }
}
