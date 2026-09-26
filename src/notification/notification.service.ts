import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import { SolapiApiAdapter } from 'src/external/solapi/solapi.api.adapter';
import { NotificationRepository } from 'src/repositories/notification.repository';
import { EntityManager } from 'typeorm';
import { MESSAGE_TEMPLATES } from './message.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly solapiApiAdapter: SolapiApiAdapter,
  ) {}

  enqueue(
    input: {
      phone: string;
      type: NotificationType;
      payload: Record<string, string>;
    },
    manager?: EntityManager,
  ) {
    return this.notificationRepository.createPending(input, manager);
  }

  async send(input: { types: NotificationType[] }) {
    const notifications = await this.notificationRepository.findPendingByTypes(
      input.types,
      50,
    );

    for (const notification of notifications) {
      try {
        const template = MESSAGE_TEMPLATES[notification.type];
        if (!template?.templateId) {
          throw new Error(`메시지 템플릿 ID가 없습니다: ${notification.type}`);
        }
        const missingKey = template.payload.find(
          (key) => !notification.payload?.[key],
        );
        if (missingKey) {
          throw new Error(`메시지 payload가 없습니다: ${missingKey}`);
        }

        await this.solapiApiAdapter.sendOne({
          phone: notification.phone,
          templateId: template.templateId,
          payload: notification.payload,
        });
        await this.notificationRepository.markSent(notification.id, new Date());
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : '알 수 없는 발송 오류';
        try {
          await this.notificationRepository.markFailed(
            notification.id,
            new Date(),
            reason.slice(0, 2000),
          );
        } catch (updateError) {
          this.logger.error(
            `알림 실패 상태 저장 실패: ${notification.id}`,
            updateError instanceof Error ? updateError.stack : undefined,
          );
        }
      }
    }
  }

  cleanupOld(cutoff: Date) {
    return this.notificationRepository.deleteOld(cutoff);
  }
}
