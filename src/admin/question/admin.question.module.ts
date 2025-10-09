import { Module } from '@nestjs/common';
import { AdminQuestionService } from './admin.question.service';
import { AdminQuestionController } from './admin.question.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { QuestionRepository } from 'src/repositories/question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([Question, Answer, Unit]),
  ],
  controllers: [AdminQuestionController],
  providers: [
    AdminQuestionService,
    QuestionRepository,
    AnswerRepository,
    UnitRepository,
  ],
})
export class AdminQuestionModule {}
