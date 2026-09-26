import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { AdminUserController } from './admin.user.controller';
import { AdminUserService } from './admin.user.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([User])],
  controllers: [AdminUserController],
  providers: [AdminUserService, UserRepository],
})
export class AdminUserModule {}
