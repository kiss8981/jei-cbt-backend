import { Module } from '@nestjs/common';
import { AppQuestionSessionController } from './app.question-session.controller';
import { AppQuestionSessionService } from './app.question-session.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSession } from 'src/entities/question-session.entity';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { QuestionSessionMapRepository } from 'src/repositories/question-session-map.repository';
import { QuestionSessionMap } from 'src/entities/question-session-map.entity';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { Unit } from 'src/entities/unit.entity';
import { UnitRepository } from 'src/repositories/unit.repository';
import { AppAuthModule } from 'src/app/auth/app.auth.module';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { Answer } from 'src/entities/answer.entity';
import { AppQuestionSessionSubmissionService } from './app.question-session-submission.service';
import { AppQuestionSessionSegmentService } from './app.question-session-segmnet.service';
import { QuestionSessionSegment } from 'src/entities/question-session-segment.entity';
import { QuestionSessionSegmentRepository } from 'src/repositories/question-session-segment.repository';
import { AppQuestionModule } from '../app.question.module';
import { AppQuestionWrongModule } from '../wrong/app.question-wrong.module';

@Module({
  imports: [
    AppAuthModule,
    AppQuestionModule,
    AppQuestionWrongModule,
    TypeOrmModule.forFeature([
      QuestionSession,
      QuestionSessionMap,
      Question,
      Unit,
      Answer,
      QuestionSessionSegment,
    ]),
  ],
  controllers: [AppQuestionSessionController],
  providers: [
    AppQuestionSessionService,
    AppQuestionSessionSubmissionService,
    AppQuestionSessionSegmentService,
    QuestionSessionRepository,
    QuestionSessionMapRepository,
    QuestionRepository,
    UnitRepository,
    AnswerRepository,
    QuestionSessionSegmentRepository,
  ],
})
export class AppQuestionSessionModule {}
