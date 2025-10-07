import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MeUserAuthAdminDto } from 'src/dtos/admin/auth/me.auth.dto';

export interface AdminUserPayload {
  sub: number;
  type: 'access' | 'refresh';
  name: string;
  role: 'admin';
}

export const AdminUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return plainToInstance(MeUserAuthAdminDto, request.user, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    }) as AdminUserPayload;
  },
);
