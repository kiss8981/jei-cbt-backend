import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { Exam } from 'src/entities/exam.entity';
import { AdminExamController } from './admin.exam.controller';
import { AdminExamService } from './admin.exam.service';
import { ExamRepository } from 'src/repositories/exam.repository';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([Exam])],
  controllers: [AdminExamController],
  providers: [AdminExamService, ExamRepository],
})
export class AdminExamModule {}
