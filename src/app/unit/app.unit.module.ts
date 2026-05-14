import { Module } from '@nestjs/common';
import { AppUnitController } from './app.unit.controller';
import { AppUnitService } from './app.unit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from 'src/entities/exam.entity';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Exam])],
  controllers: [AppUnitController],
  providers: [AppUnitService, UnitRepository],
})
export class AppUnitModule {}
