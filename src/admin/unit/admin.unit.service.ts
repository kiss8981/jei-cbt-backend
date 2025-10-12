import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateUnitAdminDto } from 'src/dtos/admin/unit/create-unit.admin.dto';
import { GetUnitListQueryAdminDto } from 'src/dtos/admin/unit/get-unit-list-query.admin.dto';
import { GetUnitListAdminDto } from 'src/dtos/admin/unit/get-unit-list.admin.dto';
import { GetUnitAdminDto } from 'src/dtos/admin/unit/get-unit.admin.dto';
import { UpdateUnitAdminDto } from 'src/dtos/admin/unit/update-unit.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class AdminUnitService {
  constructor(private readonly unitRepository: UnitRepository) {}

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
            {
              id: unit.id,
              name: unit.name,
              isDisplayed: unit.isDisplayed,
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

  async create(createUnitDto: CreateUnitAdminDto) {
    const unit = await this.unitRepository.create({
      name: createUnitDto.name,
    });

    return plainToInstance(
      GetUnitAdminDto,
      {
        id: unit.id,
        name: unit.name,
        isDisplayed: unit.isDisplayed,
      },
      { excludeExtraneousValues: true },
    );
  }

  async update(unitId: number, updateUnitDto: UpdateUnitAdminDto) {
    const unit = await this.unitRepository.update(unitId, {
      name: updateUnitDto.name,
    });

    return plainToInstance(
      GetUnitAdminDto,
      {
        id: unit.id,
        name: unit.name,
        isDisplayed: unit.isDisplayed,
      },
      { excludeExtraneousValues: true },
    );
  }

  async delete(id: number) {
    await this.unitRepository.softDelete(id);

    return true;
  }
}
