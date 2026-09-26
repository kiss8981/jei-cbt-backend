import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationBatch {
  constructor(private readonly notificationService: NotificationService) {}

  @Cron('*/5 * * * * *', { waitForCompletion: true })
  sendPhoneVerification() {
    return this.notificationService.send({
      types: [NotificationType.PHONE_VERIFICATION],
    });
  }

  @Cron('0 0 3 * * *', { waitForCompletion: true })
  cleanupOldNotifications() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.notificationService.cleanupOld(cutoff);
  }
}
