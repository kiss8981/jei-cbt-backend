import { Module } from '@nestjs/common';
import { AppAuthService } from './app.auth.service';
import { AppAuthController } from './app.auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppAuthController],
  providers: [AppAuthService, UserRepository],
})
export class AppAuthModule {}
