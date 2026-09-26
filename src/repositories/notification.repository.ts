import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationStatus } from 'src/common/constants/notification-status.enum';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import { Notification } from 'src/entities/notification.entity';
import { EntityManager, In, LessThan, Repository } from 'typeorm';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  createPending(
    input: {
      phone: string;
      type: NotificationType;
      payload: Record<string, string>;
    },
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(Notification)
      : this.repository;
    return repository.save(
      repository.create({
        ...input,
        status: NotificationStatus.PENDING,
        sentAt: null,
        failedAt: null,
        reason: null,
      }),
    );
  }

  findPendingByTypes(types: NotificationType[], limit = 50) {
    if (!types.length) return Promise.resolve([]);
    return this.repository.find({
      where: { status: NotificationStatus.PENDING, type: In(types) },
      order: { createdAt: 'ASC', id: 'ASC' },
      take: limit,
    });
  }

  markSent(id: number, sentAt: Date) {
    return this.repository.update(id, {
      status: NotificationStatus.SEND,
      sentAt,
      failedAt: null,
      reason: null,
    });
  }

  markFailed(id: number, failedAt: Date, reason: string) {
    return this.repository.update(id, {
      status: NotificationStatus.FAILED,
      failedAt,
      reason,
    });
  }

  deleteOld(cutoff: Date) {
    return this.repository.softDelete({
      status: In([NotificationStatus.SEND, NotificationStatus.FAILED]),
      createdAt: LessThan(cutoff),
    });
  }
}
