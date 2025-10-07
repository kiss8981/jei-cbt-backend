import { Module } from '@nestjs/common';
import { AdminUnitService } from './admin.unit.service';
import { AdminUnitController } from './admin.unit.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([Unit])],
  controllers: [AdminUnitController],
  providers: [AdminUnitService, UnitRepository],
})
export class AdminUnitModule {}
