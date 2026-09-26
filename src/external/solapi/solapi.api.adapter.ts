import { Injectable, Logger } from '@nestjs/common';
import { SolapiMessageService } from 'solapi';

@Injectable()
export class SolapiApiAdapter {
  private readonly logger = new Logger(SolapiApiAdapter.name);
  private readonly messageService: SolapiMessageService;

  constructor() {
    this.messageService = new SolapiMessageService(
      process.env.SOLAPI_API_KEY ?? '',
      process.env.SOLAPI_API_SECRET ?? '',
    );
  }

  async sendOne(input: {
    phone: string;
    templateId: string;
    payload: Record<string, string>;
  }) {
    const from = process.env.SOLAPI_SENDER_NUMBER;
    const pfId = process.env.SOLAPI_KAKAO_PF_ID;
    if (
      !process.env.SOLAPI_API_KEY ||
      !process.env.SOLAPI_API_SECRET ||
      !from ||
      !pfId
    ) {
      throw new Error('Solapi 설정이 없습니다.');
    }

    try {
      await this.messageService.sendOne({
        to: input.phone,
        from,
        type: 'ATA',
        kakaoOptions: {
          pfId,
          templateId: input.templateId,
          variables: input.payload,
          disableSms: false,
        },
      });
    } catch (error) {
      this.logger.error(
        `Solapi 발송 실패: ${input.phone}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
