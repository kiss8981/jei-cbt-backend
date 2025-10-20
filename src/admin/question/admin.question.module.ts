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
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { PhotoMap } from 'src/entities/photo-map.entity';
import { AdminUploadModule } from '../upload/admin.upload.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminUploadModule,
    TypeOrmModule.forFeature([Question, Answer, Unit, PhotoMap]),
  ],
  controllers: [AdminQuestionController],
  providers: [
    AdminQuestionService,
    QuestionRepository,
    AnswerRepository,
    UnitRepository,
    PhotoMapRepository,
  ],
})
export class AdminQuestionModule {}
