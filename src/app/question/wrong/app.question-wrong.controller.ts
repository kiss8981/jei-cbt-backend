import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AppQuestionWrongService } from './app.question-wrong.service';
import { User, UserPayload } from 'src/common/decorators/user.decorator';
import { GetWrongQuestionListQueryAppDto } from 'src/dtos/app/question/get-wrong-question-list-query.app.dto';

@Controller('questions/wrongs')
@UseGuards(AuthGuard)
export class AppQuestionWrongController {
  constructor(
    private readonly appQuestionWrongService: AppQuestionWrongService,
  ) {}

  @Get()
  async getWrongQuestions(
    @User() user: UserPayload,
    @Query() query: GetWrongQuestionListQueryAppDto,
  ) {
    return this.appQuestionWrongService.getWrongQuestions(
      user.sub,
      query.page,
      query.limit,
      {
        sortType: query.sortType,
      },
    );
  }
}
