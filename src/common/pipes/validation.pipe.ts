import {
  Injectable,
  Logger,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ErrorCodes, ErrorCode } from '../constants/error-code.enum';
import 'reflect-metadata';
import { CustomHttpException } from '../filters/custom-http.exception';
import { ValidationError } from 'class-validator';

@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  private readonly logger = new Logger(CustomValidationPipe.name);
  constructor(options?: ValidationPipeOptions) {
    super({
      ...options,
      exceptionFactory: (errors: ValidationError[]) => {
        const validationErrors = errors.map((err) => {
          const deepestError = this.getDeepestError(err);
          const errorCodeObj = Reflect.getMetadata(
            'errorCode',
            deepestError.target || {},
            deepestError.property,
          ) as ErrorCode;
          this.logger.error(
            `Validation failed for ${deepestError.property}: ${deepestError.constraints ? Object.values(deepestError.constraints).join(', ') : 'No constraints defined'}`,
          );

          return {
            field: deepestError.property,
            message:
              errorCodeObj?.message ?? ErrorCodes.VALIDATION_FAILED.message,
            code: errorCodeObj?.code ?? ErrorCodes.VALIDATION_FAILED.code,
          };
        });

        return new CustomHttpException(
          {
            code:
              validationErrors?.[0]?.code || ErrorCodes.VALIDATION_FAILED.code,
            message:
              validationErrors?.[0]?.message ||
              ErrorCodes.VALIDATION_FAILED.message,
          },
          200,
        );
      },
    });
  }

  private getDeepestError(error: ValidationError): ValidationError {
    let currentError = error;
    while (currentError.children && currentError.children.length > 0) {
      currentError = currentError.children[0];
    }
    return currentError;
  }
}
