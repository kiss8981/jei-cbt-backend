import { Module } from '@nestjs/common';
import { AppQuestionController } from './app.question.controller';
import { AppQuestionService } from './app.question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { Answer } from 'src/entities/answer.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { AppQuestionSharedService } from './app.question-shared.service';
import { PhotoMap } from 'src/entities/photo-map.entity';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer, PhotoMap])],
  controllers: [AppQuestionController],
  providers: [
    AppQuestionService,
    QuestionRepository,
    AnswerRepository,
    PhotoMapRepository,
    AppQuestionSharedService,
  ],
  exports: [AppQuestionService, AppQuestionSharedService],
})
export class AppQuestionModule {}
