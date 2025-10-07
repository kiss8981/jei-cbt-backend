import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';

@Injectable()
export class AnswerRepository {
  constructor(
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
  ) {}

  async create(answer: Partial<Answer>, entityManager?: EntityManager) {
    const newQuestion = this.answerRepository.create(answer);
    return entityManager
      ? entityManager.save(newQuestion)
      : this.answerRepository.save(newQuestion);
  }

  this() {
    return this.answerRepository;
  }
}
