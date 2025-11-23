import { Module } from '@nestjs/common';
import { AdminQuestionSessionController } from './admin.question-session.controller';
import { AdminQuestionSessionService } from './admin.question-session.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSession } from 'src/entities/question-session.entity';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { QuestionSessionSegmentRepository } from 'src/repositories/question-session-segment.repository';
import { QuestionSessionSegment } from 'src/entities/question-session-segment.entity';
import { User } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { AdminAuthModule } from 'src/admin/auth/admin.auth.module';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([QuestionSession, QuestionSessionSegment, User]),
  ],
  controllers: [AdminQuestionSessionController],
  providers: [
    AdminQuestionSessionService,
    QuestionSessionRepository,
    QuestionSessionSegmentRepository,
    UserRepository,
  ],
})
export class AdminQuestionSessionModule {}
