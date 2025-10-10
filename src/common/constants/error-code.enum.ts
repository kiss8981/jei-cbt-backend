export const ErrorCodes = {
  VALIDATION_FAILED: {
    code: 4000,
    message: '필수 입력값이 올바르지 않습니다.',
  },
  AUTH_NOT_FOUND: {
    code: 4001,
    message: '로그인이 필요합니다.',
  },
  USER_PASSWORD_MISMATCH: {
    code: 4002,
    message: '비밀번호 또는 전화번호가 올바르지 않습니다.',
  },
  USER_TOKEN_EXPIRED: {
    code: 4003,
    message: '토큰이 만료되었습니다.',
  },
  USER_PHONE_DUPLICATE: {
    code: 4004,
    message: '이미 가입된 전화번호입니다.',
  },
  QUESTION_NOT_FOUND: {
    code: 4100,
    message: '존재하지 않는 문제입니다.',
  },
  UNIT_NOT_FOUND: {
    code: 4200,
    message: '존재하지 않는 능력 단위 입니다.',
  },
  QUESTION_SESSION_NOT_FOUND: {
    code: 4300,
    message: '존재하지 않는 세션입니다.',
  },
};

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
