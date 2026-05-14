import { Module } from '@nestjs/common';
import { AppAuthModule } from 'src/app/auth/app.auth.module';
import { AppQuestionWrongController } from './app.question-wrong.controller';
import { AppQuestionWrongService } from './app.question-wrong.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionWrong } from 'src/entities/question-wrong.entity';
import { QuestionWrongRepository } from 'src/repositories/question-wrong.repository';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';
import { AppQuestionModule } from '../app.question.module';
import { Exam } from 'src/entities/exam.entity';
import { ExamRepository } from 'src/repositories/exam.repository';

@Module({
  imports: [
    AppAuthModule,
    AppQuestionModule,
    TypeOrmModule.forFeature([QuestionWrong, Question, Unit, Exam]),
  ],
  controllers: [AppQuestionWrongController],
  providers: [
    AppQuestionWrongService,
    QuestionWrongRepository,
    QuestionRepository,
    UnitRepository,
    ExamRepository,
  ],
  exports: [AppQuestionWrongService],
})
export class AppQuestionWrongModule {}
