import { Module } from '@nestjs/common';
import { AdminQuestionService } from './admin.question.service';
import { AdminQuestionController } from './admin.question.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { QuestionRepository } from 'src/repositories/question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([Question, Answer])],
  controllers: [AdminQuestionController],
  providers: [AdminQuestionService, QuestionRepository, AnswerRepository],
})
export class AdminQuestionModule {}
