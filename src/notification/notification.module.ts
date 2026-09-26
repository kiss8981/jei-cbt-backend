import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/entities/notification.entity';
import { SolapiModule } from 'src/external/solapi/solapi.module';
import { NotificationRepository } from 'src/repositories/notification.repository';
import { NotificationBatch } from './notification.batch';
import { NotificationService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), SolapiModule],
  providers: [NotificationRepository, NotificationService, NotificationBatch],
  exports: [NotificationService],
})
export class NotificationModule {}
