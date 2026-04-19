import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { AdminExamService } from './admin.exam.service';
import { GetExamListQueryAdminDto } from 'src/dtos/admin/exam/get-exam-list-query.admin.dto';
import { CreateExamAdminDto } from 'src/dtos/admin/exam/create-exam.admin.dto';
import { UpdateExamAdminDto } from 'src/dtos/admin/exam/update-exam.admin.dto';

@Controller('/admin/exams')
@UseGuards(AdminAuthGuard)
export class AdminExamController {
  constructor(private readonly adminExamService: AdminExamService) {}

  @Get()
  getExams(@Query() query: GetExamListQueryAdminDto) {
    const { page = 1, limit = 20 } = query;
    return this.adminExamService.getAll(page, limit, query);
  }

  @Post()
  createExam(@Body() body: CreateExamAdminDto) {
    return this.adminExamService.create(body);
  }

  @Put('/:examId')
  updateExam(@Param('examId') examId: number, @Body() body: UpdateExamAdminDto) {
    return this.adminExamService.update(examId, body);
  }
}
