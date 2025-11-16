import { Module } from '@nestjs/common';
import { AppQuestionController } from './app.question.controller';
import { AppQuestionService } from './app.question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { Answer } from 'src/entities/answer.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer])],
  controllers: [AppQuestionController],
  providers: [AppQuestionService, QuestionRepository, AnswerRepository],
  exports: [AppQuestionService],
})
export class AppQuestionModule {}
