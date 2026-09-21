import { Module } from '@nestjs/common';
import { AdminUnitService } from './admin.unit.service';
import { AdminUnitController } from './admin.unit.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from 'src/entities/exam.entity';
import { Question } from 'src/entities/question.entity';
import { Unit } from 'src/entities/unit.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { UnitRepository } from 'src/repositories/unit.repository';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([Unit, Exam, Question])],
  controllers: [AdminUnitController],
  providers: [AdminUnitService, UnitRepository, QuestionRepository],
})
export class AdminUnitModule {}
