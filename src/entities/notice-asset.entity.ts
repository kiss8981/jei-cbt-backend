import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AdminUser } from './admin-user.entity';
import { Notice } from './notice.entity';
import {
  NoticeAssetKind,
  NoticeAssetStatus,
} from 'src/common/constants/notice-asset.enum';

@Entity()
export class NoticeAsset extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 150 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'enum', enum: NoticeAssetKind })
  kind: NoticeAssetKind;

  @Column({
    type: 'enum',
    enum: NoticeAssetStatus,
    default: NoticeAssetStatus.TEMP,
  })
  status: NoticeAssetStatus;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'bigint', nullable: true })
  noticeId: number | null;

  @ManyToOne(() => Notice, (notice) => notice.assets, { nullable: true })
  @JoinColumn({ name: 'noticeId' })
  notice: Notice | null;

  @Column()
  adminUserId: number;

  @ManyToOne(() => AdminUser, { nullable: false })
  @JoinColumn({ name: 'adminUserId' })
  adminUser: AdminUser;
}
