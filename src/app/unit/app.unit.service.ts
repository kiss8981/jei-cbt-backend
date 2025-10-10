import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { GetUnitListQueryAppDto } from 'src/dtos/app/unit/get-unit-list-query.app.dto';
import { GetUnitListAppDto } from 'src/dtos/app/unit/get-unit-list.app.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class AppUnitService {
  constructor(private readonly unitRepository: UnitRepository) {}

  async getById(unitId: number) {
    const unit = await this.unitRepository.findOneById(unitId);
    if (!unit) {
      throw new CustomHttpException(ErrorCodes.UNIT_NOT_FOUND);
    }

    return plainToInstance(
      GetUnitListAppDto,
      {
        id: unit.id,
        name: unit.name,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getAll(page: number, limit: number, query: GetUnitListQueryAppDto) {
    const { keyword } = query;

    const [units, total] = await this.unitRepository.findAndCount(page, limit, {
      keyword,
    });

    if (units.length === 0) {
      return plainToInstance(
        createPaginationDto(GetUnitListAppDto),
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
      createPaginationDto(GetUnitListAppDto),
      {
        items: units.map((unit) => {
          return plainToInstance(
            GetUnitListAppDto,
            {
              id: unit.id,
              name: unit.name,
            },
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
}
