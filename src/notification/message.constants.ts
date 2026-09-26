import { NotificationType } from 'src/common/constants/notification-type.enum';

export const PHONE_VERIFICATION_TEMPLATE_ID =
  'KA01TP221021092753648xBlGRV7QaON';
export const PHONE_VERIFICATION_CODE_VARIABLE = '#{인증번호}';

export const MESSAGE_TEMPLATES = {
  [NotificationType.PHONE_VERIFICATION]: {
    type: NotificationType.PHONE_VERIFICATION,
    templateId: PHONE_VERIFICATION_TEMPLATE_ID,
    payload: [PHONE_VERIFICATION_CODE_VARIABLE],
  },
} as const;
