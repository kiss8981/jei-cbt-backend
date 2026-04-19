import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from 'src/entities/exam.entity';
import { AppExamController } from './app.exam.controller';
import { AppExamService } from './app.exam.service';
import { ExamRepository } from 'src/repositories/exam.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Exam])],
  controllers: [AppExamController],
  providers: [AppExamService, ExamRepository],
})
export class AppExamModule {}
