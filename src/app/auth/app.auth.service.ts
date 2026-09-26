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
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PasswordResetChallengeRepository } from 'src/repositories/password-reset-challenge.repository';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import {
  CompletePasswordResetAuthAppDto,
  RequestPasswordResetAuthAppDto,
  VerifyPasswordResetAuthAppDto,
} from 'src/dtos/app/auth/password-reset.auth.dto';
import { createHash, randomBytes, randomInt } from 'crypto';
import { Cron } from '@nestjs/schedule';
import { PHONE_VERIFICATION_CODE_VARIABLE } from 'src/notification/message.constants';

@Injectable()
export class AppAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly passwordResetChallengeRepository: PasswordResetChallengeRepository,
    private readonly notificationService: NotificationService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
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

  async requestPasswordReset(dto: RequestPasswordResetAuthAppDto) {
    const user = await this.userRepository.findOneByPhone(dto.phone.trim());
    if (!user) return true;

    const now = Date.now();
    const latest = await this.passwordResetChallengeRepository.findLatest(
      user.id,
    );
    if (latest && latest.createdAt.getTime() > now - 60_000) {
      throw new CustomHttpException(
        ErrorCodes.PASSWORD_RESET_TOO_MANY_REQUESTS,
      );
    }
    const hourlyCount =
      await this.passwordResetChallengeRepository.countCreatedSince(
        user.id,
        new Date(now - 60 * 60 * 1000),
      );
    if (hourlyCount >= 5) {
      throw new CustomHttpException(
        ErrorCodes.PASSWORD_RESET_TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.entityManager.transaction(async (manager) => {
      await this.passwordResetChallengeRepository.revokeActive(
        user.id,
        manager,
      );
      await this.passwordResetChallengeRepository.createChallenge(
        {
          userId: user.id,
          code,
          codeExpiresAt: new Date(now + 5 * 60 * 1000),
        },
        manager,
      );
      await this.notificationService.enqueue(
        {
          phone: user.phone,
          type: NotificationType.PHONE_VERIFICATION,
          payload: { [PHONE_VERIFICATION_CODE_VARIABLE]: code },
        },
        manager,
      );
    });

    return true;
  }

  async verifyPasswordReset(dto: VerifyPasswordResetAuthAppDto) {
    const user = await this.userRepository.findOneByPhone(dto.phone.trim());
    if (!user) {
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_CODE_INVALID);
    }
    const challenge =
      await this.passwordResetChallengeRepository.findLatestActiveWithCode(
        user.id,
      );
    if (!challenge) {
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_CODE_INVALID);
    }
    if (challenge.codeExpiresAt.getTime() <= Date.now()) {
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_CODE_EXPIRED);
    }
    if (challenge.attemptCount >= 5) {
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_CODE_INVALID);
    }
    if (challenge.code !== dto.code) {
      await this.passwordResetChallengeRepository.incrementAttempt(
        challenge.id,
      );
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_CODE_INVALID);
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.passwordResetChallengeRepository.markVerified(
      challenge.id,
      this.hashResetToken(resetToken),
      new Date(Date.now() + 30 * 60 * 1000),
    );
    return { resetToken };
  }

  async completePasswordReset(dto: CompletePasswordResetAuthAppDto) {
    if (dto.password !== dto.passwordConfirmation || dto.password.length < 6) {
      throw new CustomHttpException(
        ErrorCodes.PASSWORD_RESET_PASSWORD_MISMATCH,
      );
    }
    const challenge =
      await this.passwordResetChallengeRepository.findByResetTokenHash(
        this.hashResetToken(dto.resetToken),
      );
    if (
      !challenge ||
      !challenge.resetTokenExpiresAt ||
      challenge.resetTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new CustomHttpException(ErrorCodes.PASSWORD_RESET_TOKEN_INVALID);
    }

    const hash = await bcrypt.hash(dto.password, 10);
    await this.entityManager.transaction(async (manager) => {
      await this.userRepository.updatePassword(challenge.userId, hash, manager);
      await this.passwordResetChallengeRepository.markConsumed(
        challenge.id,
        manager,
      );
    });
    return true;
  }

  @Cron('0 10 3 * * *', { waitForCompletion: true })
  cleanupOldPasswordResetChallenges() {
    return this.passwordResetChallengeRepository.deleteOld(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
