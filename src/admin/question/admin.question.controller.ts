import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { AdminQuestionService } from './admin.question.service';
import { EditQuestionAdminDto } from 'src/dtos/admin/question/edit-question.admin.dto';

@Controller('/admin/questions')
// @UseGuards(AdminAuthGuard)
export class AdminQuestionController {
  constructor(private readonly adminQuestionService: AdminQuestionService) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionListQueryAdminDto) {
    return this.adminQuestionService.getAll(query.page, query.limit, query);
  }

  @Get(':questionId')
  async getQuestion(@Param('questionId') questionId: number) {
    return this.adminQuestionService.getById(questionId);
  }

  @Post()
  async createQuestion(@Body() body: CreateQuestionAdminDto) {
    return this.adminQuestionService.create(body);
  }
}
