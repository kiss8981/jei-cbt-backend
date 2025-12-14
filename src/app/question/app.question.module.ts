import { Module } from '@nestjs/common';
import { AppQuestionController } from './app.question.controller';
import { AppQuestionService } from './app.question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { Answer } from 'src/entities/answer.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { AppQuestionSharedService } from './app.question-shared.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer])],
  controllers: [AppQuestionController],
  providers: [
    AppQuestionService,
    QuestionRepository,
    AnswerRepository,
    AppQuestionSharedService,
  ],
  exports: [AppQuestionService, AppQuestionSharedService],
})
export class AppQuestionModule {}
