import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AppAuthService } from 'src/app/auth/app.auth.service';
import { CustomHttpException } from '../filters/custom-http.exception';
import { ErrorCodes } from '../constants/error-code.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private appAuthService: AppAuthService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  async validateRequest(request: Request): Promise<boolean> {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new CustomHttpException(ErrorCodes.AUTH_NOT_FOUND);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new CustomHttpException(ErrorCodes.AUTH_NOT_FOUND);
    }

    try {
      const user = await this.appAuthService.decodeToken(token);
      if (!user || user.type !== 'access') {
        throw new CustomHttpException(ErrorCodes.AUTH_NOT_FOUND);
      }
      request['user'] = user;
      return true;
    } catch (e) {
      throw new CustomHttpException(ErrorCodes.AUTH_NOT_FOUND);
    }
  }
}
