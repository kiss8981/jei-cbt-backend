import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  @Get(':wrongId')
  async getWrongQuestionDetail(
    @User() user: UserPayload,
    @Param('wrongId') wrongId: number,
  ) {
    return this.appQuestionWrongService.getWrongQuestionDetail(
      user.sub,
      wrongId,
    );
  }

  @Post(':wrongId/review')
  async wrongQuestionAsReviewed(
    @User() user: UserPayload,
    @Param('wrongId') wrongId: number,
    @Body() body: any,
  ) {
    return this.appQuestionWrongService.wrongQuestionAnswer(
      user.sub,
      wrongId,
      body,
    );
  }
}
