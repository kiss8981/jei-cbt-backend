import { Injectable } from '@nestjs/common';
import { RegisterUserAuthAppDto } from 'src/dtos/app/auth/register-user.auth.dto';
import { UserRepository } from 'src/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';
import { LoginUserAuthAppDto } from 'src/dtos/app/auth/login-user.auth.dto';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { plainToInstance } from 'class-transformer';
import { LoginUserResponseAuthAppDto } from 'src/dtos/app/auth/login-user-response.auth.dto';
import { RefreshTokenResponseAuthAppDto } from 'src/dtos/app/auth/refresh-token-response.auth.dto';
import { RegisterUserResponseAuthAppDto } from 'src/dtos/app/auth/register-user-response.auth.dto';
import { AdminUserRepository } from 'src/repositories/admin-user.repository';
import { LoginUserAuthAdminDto } from 'src/dtos/admin/auth/login-user.auth.dto';
import { LoginUserResponseAuthAdminDto } from 'src/dtos/admin/auth/login-user-response.auth.dto';
import { AdminUser } from 'src/entities/admin-user.entity';
import { RefreshTokenResponseAuthAdminDto } from 'src/dtos/admin/auth/refresh-token-response.auth.dto';
import { AdminUserPayload } from 'src/common/decorators/admin-user.decorator';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginUserAuthAdminDto) {
    const user = await this.adminUserRepository.findOneByLoginId(dto.id);

    if (!user) {
      throw new CustomHttpException(ErrorCodes.USER_PASSWORD_MISMATCH);
    }

    const isPasswordMatching = await bcrypt.compare(
      dto.password,
      user.password,
    );
    if (!isPasswordMatching) {
      throw new CustomHttpException(ErrorCodes.USER_PASSWORD_MISMATCH);
    }

    console.log(user);

    return plainToInstance(
      LoginUserResponseAuthAdminDto,
      {
        accessToken: await this.createToken(user, 'access'),
        refreshToken: await this.createToken(user, 'refresh'),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  async refreshToken(token: string) {
    const decodeUser = await this.decodeToken(token);

    if (!decodeUser || decodeUser.type !== 'refresh') {
      throw new CustomHttpException(ErrorCodes.USER_TOKEN_EXPIRED);
    }

    const user = await this.adminUserRepository.findById(decodeUser.sub);

    return plainToInstance(
      RefreshTokenResponseAuthAdminDto,
      {
        accessToken: await this.createToken(user, 'access'),
        refreshToken: await this.createToken(user, 'refresh'),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  async createToken(user: AdminUser, type: 'access' | 'refresh') {
    const payload = { sub: user.id, type, name: user.name, role: 'admin' };

    return this.jwtService.signAsync(payload, {
      expiresIn: type == 'access' ? '1h' : '7d',
      secret: process.env.JWT_SECRET,
    });
  }
  async decodeToken(token: string): Promise<AdminUserPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET,
    });
  }
}
