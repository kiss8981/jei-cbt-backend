import { Module } from '@nestjs/common';
import { AppUnitController } from './app.unit.controller';
import { AppUnitService } from './app.unit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from 'src/entities/exam.entity';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Exam, Question])],
  controllers: [AppUnitController],
  providers: [AppUnitService, UnitRepository, QuestionRepository],
})
export class AppUnitModule {}
