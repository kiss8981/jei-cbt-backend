import { Controller, Get, Query } from '@nestjs/common';
import { AppExamService } from './app.exam.service';
import { GetExamListQueryAppDto } from 'src/dtos/app/exam/get-exam-list-query.app.dto';

@Controller()
export class AppExamController {
  constructor(private readonly appExamService: AppExamService) {}

  @Get('/exam-types')
  getExamTypes() {
    return this.appExamService.getExamTypes();
  }

  @Get('/exams')
  getExams(@Query() query: GetExamListQueryAppDto) {
    return this.appExamService.getAll(query.type);
  }
}
