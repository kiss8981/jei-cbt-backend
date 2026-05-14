import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { EXAM_TYPE_LABELS } from 'src/common/constants/exam-type.enum';
import { CreateUnitAdminDto } from 'src/dtos/admin/unit/create-unit.admin.dto';
import { GetUnitListQueryAdminDto } from 'src/dtos/admin/unit/get-unit-list-query.admin.dto';
import { GetUnitListAdminDto } from 'src/dtos/admin/unit/get-unit-list.admin.dto';
import { GetUnitAdminDto } from 'src/dtos/admin/unit/get-unit.admin.dto';
import { UpdateUnitAdminDto } from 'src/dtos/admin/unit/update-unit.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class AdminUnitService {
  constructor(
    private readonly unitRepository: UnitRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getAll(page: number, limit: number, query: GetUnitListQueryAdminDto) {
    const { keyword } = query;

    const [units, total] = await this.unitRepository.findAndCount(page, limit, {
      keyword,
    });

    if (units.length === 0) {
      return plainToInstance(
        createPaginationDto(GetUnitListAdminDto),
        {
          totalCount: 0,
          perPage: limit,
          pageNum: page,
          items: [],
        },
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );
    }

    return plainToInstance(
      createPaginationDto(GetUnitListAdminDto),
      {
        items: units.map((unit) => {
          return plainToInstance(
            GetUnitListAdminDto,
            this.toAdminUnitDto(unit),
            { excludeExtraneousValues: true },
          );
        }),
        totalCount: Number(total),
        perPage: Number(limit),
        pageNum: Number(page),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async create(createUnitDto: CreateUnitAdminDto) {
    const unit = await this.unitRepository.create(
      {
        name: createUnitDto.name,
      },
      createUnitDto.examIds ?? [],
    );

    return plainToInstance(GetUnitAdminDto, this.toAdminUnitDto(unit), {
      excludeExtraneousValues: true,
    });
  }

  async update(unitId: number, updateUnitDto: UpdateUnitAdminDto) {
    const unit = await this.unitRepository.update(unitId, {
      name: updateUnitDto.name,
      isDisplayed: updateUnitDto.isDisplayed,
    });

    // table // unit_exams
    await this.entityManager
      .query(`DELETE FROM unit_exams WHERE unitId = ?`, [unitId])
      .then(() => {
        if (updateUnitDto.examIds && updateUnitDto.examIds.length > 0) {
          const values = updateUnitDto.examIds
            .map((examId) => `(${unitId}, ${examId})`)
            .join(', ');

          return this.entityManager.query(
            `INSERT INTO unit_exams (unitId, examId) VALUES ${values}`,
          );
        }
      });

    return plainToInstance(GetUnitAdminDto, this.toAdminUnitDto(unit), {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: number) {
    await this.unitRepository.softDelete(id);

    return true;
  }

  private toAdminUnitDto(unit: any) {
    return {
      id: unit.id,
      name: unit.name,
      isDisplayed: unit.isDisplayed,
      examIds: unit.exams?.map((exam) => exam.id) ?? [],
      exams:
        unit.exams?.map((exam) => ({
          id: exam.id,
          title: exam.title,
          type: EXAM_TYPE_LABELS[exam.type],
        })) ?? [],
    };
  }
}
