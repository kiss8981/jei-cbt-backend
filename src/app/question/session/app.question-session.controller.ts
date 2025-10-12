import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppQuestionSessionService } from './app.question-session.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User, UserPayload } from 'src/common/decorators/user.decorator';
import { GetQuestionNextQueryAppDto } from 'src/dtos/app/question/get-question-next-query.app.dto';
import { AppQuestionSessionSubmissionService } from './app.question-session-submission.service';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';

@Controller('questions/sessions')
@UseGuards(AuthGuard)
export class AppQuestionSessionController {
  constructor(
    private readonly appQuestionSessionService: AppQuestionSessionService,
    private readonly appQuestionSessionSubmissionService: AppQuestionSessionSubmissionService,
  ) {}

  @Get(':sessionId')
  async getSessionById(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionService.getSessionById(user.sub, sessionId);
  }

  @Get(':sessionId/next')
  async getNextQuestion(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
    @Query() query: GetQuestionNextQueryAppDto,
  ) {
    return this.appQuestionSessionService.getNextQuestion(
      user.sub,
      sessionId,
      query.currentQuestionMapId,
    );
  }

  @Get(':sessionId/current')
  async getCurrentQuestion(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionService.getCurrentQuestion(
      user.sub,
      sessionId,
    );
  }

  @Get(':sessionId/previous')
  async getPreviousQuestion(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
    @Query() query: GetQuestionNextQueryAppDto,
  ) {
    return this.appQuestionSessionService.getPreviousQuestion(
      user.sub,
      sessionId,
      query.currentQuestionMapId,
    );
  }

  @Post(':sessionId/submit/:questionMapId')
  async submitAnswer(
    @Param('sessionId') sessionId: number,
    @Param('questionMapId') questionMapId: number,
    @User() user: UserPayload,
    @Body() answerDto: any,
  ) {
    return this.appQuestionSessionSubmissionService.submitAnswer(
      user.sub,
      sessionId,
      questionMapId,
      answerDto,
    );
  }

  @Post('by-unit/:unitId')
  async createSessionByUnitId(
    @Param('unitId') unitId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionService.createSessionByUnitId(
      user.sub,
      unitId,
    );
  }
}
