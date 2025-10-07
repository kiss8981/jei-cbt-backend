import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { AdminQuestionService } from './admin.question.service';

@Controller('/admin/questions')
// @UseGuards(AdminAuthGuard)
export class AdminQuestionController {
  constructor(private readonly adminQuestionService: AdminQuestionService) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionListQueryAdminDto) {
    console.log(query);
    return { message: 'List of questions', query };
  }

  @Post()
  async createQuestion(@Body() body: CreateQuestionAdminDto) {
    return this.adminQuestionService.create(body);
  }
}
