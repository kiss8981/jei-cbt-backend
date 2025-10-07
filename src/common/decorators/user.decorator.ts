import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MeUserAuthAppDto } from 'src/dtos/app/auth/me.auth.dto';

export interface UserPayload {
  sub: number;
  type: 'access';
  name: string;
  phone: string;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return plainToInstance(MeUserAuthAppDto, request.user, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    }) as UserPayload;
  },
);
