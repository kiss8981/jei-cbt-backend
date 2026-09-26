import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import { NotificationStatus } from 'src/common/constants/notification-status.enum';

@Entity()
@Index('IDX_notification_pending', ['status', 'type', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'json' })
  payload: Record<string, string>;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'datetime', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
