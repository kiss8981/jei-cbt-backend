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
  USER_NOT_REGISTERED: {
    code: 4005,
    message: '가입되지 않은 사용자입니다.',
  },
  QUESTION_NOT_FOUND: {
    code: 4100,
    message: '존재하지 않는 문제입니다.',
  },
  WRONG_QUESTION_NOT_FOUND: {
    code: 4101,
    message: '존재하지 않는 오답노트 문제입니다.',
  },
  UNIT_NOT_FOUND: {
    code: 4200,
    message: '존재하지 않는 능력 단위 입니다.',
  },
  UNIT_NAME_DUPLICATED: {
    code: 4201,
    message: '이미 존재하는 능력 단위명입니다.',
  },
  UNIT_HAS_QUESTIONS: {
    code: 4202,
    message: '문제가 등록된 능력 단위는 삭제할 수 없습니다.',
  },
  QUESTION_SESSION_NOT_FOUND: {
    code: 4300,
    message: '존재하지 않는 세션입니다.',
  },
  QUESTION_SESSION_SEGMENT_NOT_FOUND: {
    code: 4301,
    message: '존재하지 않는 세션 구간입니다.',
  },
  QUESTION_NEXT_NOT_FOUND: {
    code: 4302,
    message: '다음 문제가 존재하지 않습니다.',
  },
  NOTICE_NOT_FOUND: {
    code: 4400,
    message: '존재하지 않는 게시글입니다.',
  },

  S3_FILE_GET_ERROR: {
    code: 5100,
    message: '파일을 가져오는 데 실패했습니다.',
  },
  S3_FILE_COPY_ERROR: {
    code: 5101,
    message: '파일을 복사하는 데 실패했습니다.',
  },
  S3_FILE_DELETE_ERROR: {
    code: 5102,
    message: '파일을 삭제하는 데 실패했습니다.',
  },
  S3_PRESIGNED_URL_ERROR: {
    code: 5103,
    message: '파일 업로드 URL 생성에 실패했습니다.',
  },
  S3_UNSUPPORTED_FILE_TYPE: {
    code: 5104,
    message: '지원하지 않는 파일 형식입니다.',
  },
};

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
