import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  EXAM_TYPE_LABELS,
  ExamType,
} from 'src/common/constants/exam-type.enum';
import { GetExamAppDto } from 'src/dtos/app/exam/get-exam.app.dto';
import { GetExamTypeAppDto } from 'src/dtos/app/exam/get-exam-type.app.dto';
import { ExamRepository } from 'src/repositories/exam.repository';

@Injectable()
export class AppExamService {
  constructor(private readonly examRepository: ExamRepository) {}

  getExamTypes() {
    return plainToInstance(
      GetExamTypeAppDto,
      Object.values(ExamType).map((type) => ({
        value: type,
        label: EXAM_TYPE_LABELS[type],
      })),
      { excludeExtraneousValues: true },
    );
  }

  async getAll(type?: ExamType) {
    const exams = await this.examRepository.findAllByType(type, true);

    return plainToInstance(
      GetExamAppDto,
      exams.map((exam) => ({
        id: exam.id,
        type: EXAM_TYPE_LABELS[exam.type],
        typeValue: exam.type,
        title: exam.title,
        isDisplayed: exam.isDisplayed,
      })),
      { excludeExtraneousValues: true },
    );
  }
}
