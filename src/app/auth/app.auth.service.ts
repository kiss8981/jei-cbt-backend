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

@Injectable()
export class AppAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginUserAuthAppDto) {
    const user = await this.userRepository.findOneByPhone(dto.phone);

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

    return plainToInstance(
      LoginUserResponseAuthAppDto,
      {
        accessToken: await this.createToken(user, 'access'),
        refreshToken: await this.createToken(user, 'refresh'),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  async register(dto: RegisterUserAuthAppDto) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(dto.password, saltOrRounds);

    const user = await this.userRepository
      .create({
        name: dto.name,
        phone: dto.phone,
        password: hash,
      })
      .catch((e) => {
        if (e.code === 'ER_DUP_ENTRY') {
          throw new CustomHttpException(ErrorCodes.USER_PHONE_DUPLICATE);
        }
        throw e;
      });

    return plainToInstance(
      RegisterUserResponseAuthAppDto,
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

    const user = await this.userRepository.findById(decodeUser.sub);

    return plainToInstance(
      RefreshTokenResponseAuthAppDto,
      {
        accessToken: await this.createToken(user, 'access'),
        refreshToken: await this.createToken(user, 'refresh'),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }

  async createToken(user: User, type: 'access' | 'refresh') {
    const payload = { sub: user.id, type, name: user.name, phone: user.phone };

    return this.jwtService.signAsync(payload, {
      expiresIn: type == 'access' ? '1h' : '7d',
      secret: process.env.JWT_SECRET,
    });
  }
  async decodeToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET,
    });
  }

  async signOut(userId: number) {
    const user = await this.userRepository.findById(userId);

    await this.userRepository.deleteById(user.id);

    return true;
  }
}
