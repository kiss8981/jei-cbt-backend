import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { Exam } from 'src/entities/exam.entity';
import { Unit } from 'src/entities/unit.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class UnitRepository {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  async findByIds(ids: number[]) {
    return this.unitRepository.find({
      where: { id: In(ids) },
    });
  }

  async updateUnitExamRelation(unitId: number, examIds: number[]) {
    return this.unitRepository
      .createQueryBuilder()
      .relation(Unit, 'exams')
      .of(unitId)
      .addAndRemove(examIds, examIds);
  }

  async findOneById(id: number) {
    return this.unitRepository.findOne({
      where: { id },
      relations: ['exams'],
    });
  }

  async findAndCount(
    page: number,
    limit: number,
    {
      keyword,
      examId,
    }: {
      keyword?: string;
      examId?: number;
    },
  ) {
    const query = this.unitRepository.createQueryBuilder('unit');
    query.leftJoinAndSelect('unit.exams', 'exam');
    query.distinct(true);

    if (keyword) {
      query.andWhere('unit.name LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    if (examId) {
      query.innerJoin(
        'unit.exams',
        'filteredExam',
        'filteredExam.id = :examId',
        {
          examId,
        },
      );
    }

    query.orderBy('unit.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }

  async create(unit: Partial<Unit>, examIds: number[] = []) {
    const exams = await this.findExamsOrFail(examIds);
    const normalizedExamIds = this.normalizeIds(examIds);

    const newUnit = this.unitRepository.create({
      ...unit,
      examId: normalizedExamIds[0] ?? null,
      exams,
    });
    const createdUnit = await this.unitRepository.save(newUnit);

    return this.findOneById(createdUnit.id);
  }

  async softDelete(id: number) {
    return this.unitRepository.softDelete({ id });
  }

  async update(id: number, updateData: Partial<Unit>, examIds: number[] = []) {
    const unit = await this.findOneById(id);
    if (!unit) return null;

    const exams = await this.findExamsOrFail(examIds);
    const normalizedExamIds = this.normalizeIds(examIds);

    const updatedUnit = this.unitRepository.merge(unit, {
      ...updateData,
      examId: normalizedExamIds[0] ?? null,
      exams,
    });

    await this.unitRepository.save(updatedUnit);
    return this.findOneById(id);
  }

  private normalizeIds(ids: number[]) {
    return Array.from(new Set(ids));
  }

  private async findExamsOrFail(examIds: number[]) {
    const normalizedExamIds = this.normalizeIds(examIds);

    if (normalizedExamIds.length === 0) {
      return [];
    }

    const exams = await this.examRepository.find({
      where: { id: In(normalizedExamIds) },
    });

    if (exams.length !== normalizedExamIds.length) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }

    return exams;
  }
}
