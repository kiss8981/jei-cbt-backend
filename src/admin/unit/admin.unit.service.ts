import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { EXAM_TYPE_LABELS } from 'src/common/constants/exam-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { CreateUnitAdminDto } from 'src/dtos/admin/unit/create-unit.admin.dto';
import { GetUnitListQueryAdminDto } from 'src/dtos/admin/unit/get-unit-list-query.admin.dto';
import { GetUnitListAdminDto } from 'src/dtos/admin/unit/get-unit-list.admin.dto';
import { GetUnitAdminDto } from 'src/dtos/admin/unit/get-unit.admin.dto';
import { UpdateUnitAdminDto } from 'src/dtos/admin/unit/update-unit.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class AdminUnitService {
  constructor(
    private readonly unitRepository: UnitRepository,
    private readonly questionRepository: QuestionRepository,
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

    const questionCounts = await this.questionRepository.countGroupedByUnitIds(
      units.map((unit) => unit.id),
    );

    return plainToInstance(
      createPaginationDto(GetUnitListAdminDto),
      {
        items: units.map((unit) => {
          return plainToInstance(
            GetUnitListAdminDto,
            this.toAdminUnitDto(unit, questionCounts.get(Number(unit.id)) ?? 0),
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
    const name = this.normalizeName(createUnitDto.name);
    await this.ensureNameNotDuplicated(name);

    const unit = await this.unitRepository.create(
      {
        name,
      },
      createUnitDto.examIds ?? [],
    );

    return plainToInstance(GetUnitAdminDto, this.toAdminUnitDto(unit, 0), {
      excludeExtraneousValues: true,
    });
  }

  async update(unitId: number, updateUnitDto: UpdateUnitAdminDto) {
    const name = this.normalizeName(updateUnitDto.name);
    await this.ensureNameNotDuplicated(name, unitId);

    const unit = await this.unitRepository.update(
      unitId,
      {
        name,
        isDisplayed: updateUnitDto.isDisplayed,
      },
      updateUnitDto.examIds ?? [],
    );

    if (!unit) {
      throw new CustomHttpException(ErrorCodes.UNIT_NOT_FOUND);
    }

    const questionCount = await this.questionRepository.countByUnitIds([
      unitId,
    ]);

    return plainToInstance(
      GetUnitAdminDto,
      this.toAdminUnitDto(unit, questionCount),
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async delete(id: number) {
    const unit = await this.unitRepository.findOneById(id);

    if (!unit) {
      throw new CustomHttpException(ErrorCodes.UNIT_NOT_FOUND);
    }

    const questionCount = await this.questionRepository.countByUnitIds([id]);

    if (questionCount > 0) {
      throw new CustomHttpException(ErrorCodes.UNIT_HAS_QUESTIONS);
    }

    await this.unitRepository.softDelete(id);

    return true;
  }

  private normalizeName(name: string) {
    const normalized = name?.trim() ?? '';

    if (normalized.length === 0) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }

    return normalized;
  }

  private async ensureNameNotDuplicated(name: string, excludeId?: number) {
    const duplicated = await this.unitRepository.findOneByName(name, excludeId);

    if (duplicated) {
      throw new CustomHttpException(ErrorCodes.UNIT_NAME_DUPLICATED);
    }
  }

  private toAdminUnitDto(unit: any, questionCount = 0) {
    return {
      id: unit.id,
      name: unit.name,
      isDisplayed: unit.isDisplayed,
      questionCount,
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
