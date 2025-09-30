import { HttpException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.enum';

export class CustomHttpException extends HttpException {
  constructor(error: ErrorCode);
  constructor(error: { code: number; message: string }, status: number);

  constructor(
    error: ErrorCode | { code: number; message: string },
    status: number = 200,
  ) {
    super({ code: error.code, message: error.message }, status);
  }
}
