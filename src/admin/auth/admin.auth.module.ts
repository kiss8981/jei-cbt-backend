import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin.auth.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserRepository } from 'src/repositories/admin-user.repository';
import { AdminUser } from 'src/entities/admin-user.entity';
import { AdminAuthController } from './admin.auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminUserRepository],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
