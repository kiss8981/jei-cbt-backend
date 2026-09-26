import { Module } from '@nestjs/common';
import { AppAuthService } from './app.auth.service';
import { AppAuthController } from './app.auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { PasswordResetChallenge } from 'src/entities/password-reset-challenge.entity';
import { PasswordResetChallengeRepository } from 'src/repositories/password-reset-challenge.repository';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetChallenge]),
    NotificationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppAuthController],
  providers: [
    AppAuthService,
    UserRepository,
    PasswordResetChallengeRepository,
  ],
  exports: [AppAuthService],
})
export class AppAuthModule {}
