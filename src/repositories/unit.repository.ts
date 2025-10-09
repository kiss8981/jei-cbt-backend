import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUser } from 'src/entities/admin-user.entity';
import { Unit } from 'src/entities/unit.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class UnitRepository {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async findByIds(ids: number[]) {
    return this.unitRepository.find({
      where: { id: In(ids) },
    });
  }

  async findAndCount(
    page: number,
    limit: number,
    {
      keyword,
    }: {
      keyword?: string;
    },
  ) {
    const query = this.unitRepository.createQueryBuilder('unit');

    if (keyword) {
      query.andWhere('unit.name LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    query.orderBy('unit.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }

  async create(unit: Partial<Unit>) {
    const newUnit = this.unitRepository.create(unit);
    return this.unitRepository.save(newUnit);
  }

  async softDelete(id: number) {
    return this.unitRepository.softDelete({ id });
  }
}
