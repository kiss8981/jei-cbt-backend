import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { AdminUser } from './admin-user.entity';
import { NoticeAsset } from './notice-asset.entity';

@Entity()
export class Notice extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'longtext' })
  contentHtml: string;

  @Column({ default: true })
  isPublished: boolean;

  @Column()
  adminUserId: number;

  @ManyToOne(() => AdminUser, { nullable: false })
  @JoinColumn({ name: 'adminUserId' })
  adminUser: AdminUser;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NoticeAsset, (asset) => asset.notice)
  assets: NoticeAsset[];
}
