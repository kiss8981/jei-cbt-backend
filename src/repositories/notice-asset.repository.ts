import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NoticeAssetStatus } from 'src/common/constants/notice-asset.enum';
import { NoticeAsset } from 'src/entities/notice-asset.entity';
import { In, IsNull, LessThan, Repository } from 'typeorm';

@Injectable()
export class NoticeAssetRepository {
  constructor(
    @InjectRepository(NoticeAsset)
    private readonly repository: Repository<NoticeAsset>,
  ) {}

  create(data: Partial<NoticeAsset>) {
    return this.repository.save(this.repository.create(data));
  }

  findByIds(ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.repository.find({ where: { id: In(ids) } });
  }

  findAttachedByNoticeId(noticeId: number) {
    return this.repository.find({
      where: { noticeId, status: NoticeAssetStatus.ATTACHED },
      order: { orderIndex: 'ASC' },
    });
  }

  async attach(ids: number[], noticeId: number) {
    for (let index = 0; index < ids.length; index += 1) {
      await this.repository.update(ids[index], {
        noticeId,
        orderIndex: index,
        status: NoticeAssetStatus.ATTACHED,
      });
    }
  }

  markPendingDelete(ids: number[]) {
    if (!ids.length) return Promise.resolve();
    return this.repository.update(
      { id: In(ids) },
      { status: NoticeAssetStatus.PENDING_DELETE },
    );
  }

  findCleanupCandidates(cutoff: Date) {
    return this.repository.find({
      where: [
        { status: NoticeAssetStatus.PENDING_DELETE },
        {
          status: NoticeAssetStatus.TEMP,
          noticeId: IsNull(),
          createdAt: LessThan(cutoff),
        },
      ],
    });
  }

  softDelete(id: number) {
    return this.repository.softDelete(id);
  }
}
