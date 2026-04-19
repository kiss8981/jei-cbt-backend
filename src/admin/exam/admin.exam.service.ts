import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EXAM_TYPE_LABELS } from 'src/common/constants/exam-type.enum';
import { CreateExamAdminDto } from 'src/dtos/admin/exam/create-exam.admin.dto';
import { GetExamListAdminDto } from 'src/dtos/admin/exam/get-exam-list.admin.dto';
import { GetExamListQueryAdminDto } from 'src/dtos/admin/exam/get-exam-list-query.admin.dto';
import { UpdateExamAdminDto } from 'src/dtos/admin/exam/update-exam.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { ExamRepository } from 'src/repositories/exam.repository';

@Injectable()
export class AdminExamService {
  constructor(private readonly examRepository: ExamRepository) {}

  async getAll(page: number, limit: number, query: GetExamListQueryAdminDto) {
    const [exams, total] = await this.examRepository.findAndCount(page, limit, {
      keyword: query.keyword,
      type: query.type,
    });

    return plainToInstance(
      createPaginationDto(GetExamListAdminDto),
      {
        items: exams.map((exam) =>
          plainToInstance(
            GetExamListAdminDto,
            {
              id: exam.id,
              type: EXAM_TYPE_LABELS[exam.type],
              typeValue: exam.type,
              title: exam.title,
              isDisplayed: exam.isDisplayed,
            },
            { excludeExtraneousValues: true },
          ),
        ),
        totalCount: Number(total),
        perPage: Number(limit),
        pageNum: Number(page),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async create(createExamDto: CreateExamAdminDto) {
    const exam = await this.examRepository.create(createExamDto);

    return plainToInstance(
      GetExamListAdminDto,
      {
        id: exam.id,
        type: EXAM_TYPE_LABELS[exam.type],
        typeValue: exam.type,
        title: exam.title,
        isDisplayed: exam.isDisplayed,
      },
      { excludeExtraneousValues: true },
    );
  }

  async update(examId: number, updateExamDto: UpdateExamAdminDto) {
    const exam = await this.examRepository.update(examId, updateExamDto);

    return plainToInstance(
      GetExamListAdminDto,
      {
        id: exam.id,
        type: EXAM_TYPE_LABELS[exam.type],
        typeValue: exam.type,
        title: exam.title,
        isDisplayed: exam.isDisplayed,
      },
      { excludeExtraneousValues: true },
    );
  }
}
