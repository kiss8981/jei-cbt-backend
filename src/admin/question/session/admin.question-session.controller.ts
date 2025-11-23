import { Controller, Query, UseGuards, Get } from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { GetQuestionSessionListQueryAdminDto } from 'src/dtos/admin/question/get-question-session-list-query.admin.dto';
import { AdminQuestionSessionService } from './admin.question-session.service';

@Controller('/admin/questions/sessions')
@UseGuards(AdminAuthGuard)
export class AdminQuestionSessionController {
  constructor(
    private readonly adminQuestionSessionService: AdminQuestionSessionService,
  ) {}

  @Get()
  async getQuestionSesstions(
    @Query() query: GetQuestionSessionListQueryAdminDto,
  ) {
    return this.adminQuestionSessionService.getAll(
      query.page,
      query.limit,
      query,
    );
  }
}
