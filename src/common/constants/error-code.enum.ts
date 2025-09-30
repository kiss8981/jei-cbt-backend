export const ErrorCodes = {
  VALIDATION_FAILED: {
    code: 4000,
    message: '필수 입력값이 올바르지 않습니다.',
  },
  AUTH_NOT_FOUND: {
    code: 4001,
    message: '로그인이 필요합니다.',
  },
};

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
