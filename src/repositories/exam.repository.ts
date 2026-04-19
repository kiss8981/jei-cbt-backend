import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from 'src/entities/exam.entity';
import { ExamType } from 'src/common/constants/exam-type.enum';
import { Repository } from 'typeorm';

@Injectable()
export class ExamRepository {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  async findOneById(id: number) {
    return this.examRepository.findOne({
      where: { id },
    });
  }

  async findAndCount(
    page: number,
    limit: number,
    filters: {
      keyword?: string;
      type?: ExamType;
      isDisplayed?: boolean;
    },
  ) {
    const query = this.examRepository.createQueryBuilder('exam');

    if (filters.keyword) {
      query.andWhere('exam.title LIKE :keyword', {
        keyword: `%${filters.keyword}%`,
      });
    }

    if (filters.type) {
      query.andWhere('exam.type = :type', {
        type: filters.type,
      });
    }

    if (typeof filters.isDisplayed === 'boolean') {
      query.andWhere('exam.isDisplayed = :isDisplayed', {
        isDisplayed: filters.isDisplayed,
      });
    }

    query.orderBy('exam.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }

  async findAllByType(type?: ExamType, isDisplayed?: boolean) {
    const query = this.examRepository.createQueryBuilder('exam');

    if (type) {
      query.andWhere('exam.type = :type', { type });
    }

    if (typeof isDisplayed === 'boolean') {
      query.andWhere('exam.isDisplayed = :isDisplayed', { isDisplayed });
    }

    query.orderBy('exam.createdAt', 'DESC');
    return query.getMany();
  }

  async create(exam: Partial<Exam>) {
    const newExam = this.examRepository.create(exam);
    return this.examRepository.save(newExam);
  }

  async update(id: number, updateData: Partial<Exam>) {
    await this.examRepository.update({ id }, updateData);
    return this.findOneById(id);
  }
}
