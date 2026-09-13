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
import { Exam } from 'src/entities/exam.entity';
import { ExamRepository } from 'src/repositories/exam.repository';
import { QuestionExcelBatch } from 'src/entities/question-excel-batch.entity';
import { AdminQuestionExcelService } from './admin.question-excel.service';

@Module({
  imports: [
    AdminAuthModule,
    AdminUploadModule,
    TypeOrmModule.forFeature([
      Question,
      Answer,
      Unit,
      PhotoMap,
      Exam,
      QuestionExcelBatch,
    ]),
  ],
  controllers: [AdminQuestionController],
  providers: [
    AdminQuestionService,
    AdminQuestionExcelService,
    QuestionRepository,
    AnswerRepository,
    UnitRepository,
    PhotoMapRepository,
    ExamRepository,
  ],
})
export class AdminQuestionModule {}
