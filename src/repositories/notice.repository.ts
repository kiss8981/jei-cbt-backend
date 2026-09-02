import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notice } from 'src/entities/notice.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NoticeRepository {
  constructor(
    @InjectRepository(Notice)
    private readonly repository: Repository<Notice>,
  ) {}

  findAndCount(
    page: number,
    limit: number,
    filters: { keyword?: string; isPublished?: boolean },
  ) {
    const query = this.repository
      .createQueryBuilder('notice')
      .leftJoinAndSelect(
        'notice.assets',
        'asset',
        'asset.status = :attachedStatus AND asset.deletedAt IS NULL',
        { attachedStatus: 'ATTACHED' },
      )
      .leftJoinAndSelect('notice.adminUser', 'adminUser');

    if (filters.keyword) {
      query.andWhere('notice.title LIKE :keyword', {
        keyword: `%${filters.keyword}%`,
      });
    }
    if (typeof filters.isPublished === 'boolean') {
      query.andWhere('notice.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    return query
      .orderBy('notice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findOneById(id: number, publishedOnly = false) {
    const query = this.repository
      .createQueryBuilder('notice')
      .leftJoinAndSelect(
        'notice.assets',
        'asset',
        'asset.status = :attachedStatus AND asset.deletedAt IS NULL',
        { attachedStatus: 'ATTACHED' },
      )
      .leftJoinAndSelect('notice.adminUser', 'adminUser')
      .where('notice.id = :id', { id });
    if (publishedOnly) query.andWhere('notice.isPublished = true');
    return query.getOne();
  }

  create(data: Partial<Notice>) {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: number, data: Partial<Notice>) {
    await this.repository.update({ id }, data);
    return this.findOneById(id);
  }

  softDelete(id: number) {
    return this.repository.softDelete(id);
  }
}
