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

  async findByQuestionId(questionId: number, manager?: EntityManager) {
    return (
      manager ? manager.getRepository(Answer) : this.answerRepository
    ).find({
      where: { questionId },
      order: { id: 'ASC' },
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  async deleteByQuestionId(questionId: number, entityManager?: EntityManager) {
    if (entityManager) {
      return entityManager.delete(Answer, { questionId });
    } else {
      return this.answerRepository.delete({ questionId });
    }
  }

  async deleteByIds(answerIds: number[], manager?: EntityManager) {
    return (
      manager ? manager.getRepository(Answer) : this.answerRepository
    ).softDelete(answerIds);
  }

  async updateById(
    answerId: number,
    updateData: Partial<Answer>,
    manager?: EntityManager,
  ) {
    return (
      manager ? manager.getRepository(Answer) : this.answerRepository
    ).update({ id: answerId }, updateData);
  }

  async createMany(answers: Partial<Answer>[], manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Answer)
      : this.answerRepository;
    const newAnswers = repository.create(answers);
    return repository.save(newAnswers);
  }
}
