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
import { CreateQuestionSessionByAllAppDto } from 'src/dtos/app/question/create-question-session-by-all.app.dto';
import { AppQuestionSessionSegmentService } from './app.question-session-segmnet.service';
import { CreateQuestionSessionByMockAppDto } from 'src/dtos/app/question/create-question-session-by-mock.app.dto';

@Controller('questions/sessions')
@UseGuards(AuthGuard)
export class AppQuestionSessionController {
  constructor(
    private readonly appQuestionSessionService: AppQuestionSessionService,
    private readonly appQuestionSessionSubmissionService: AppQuestionSessionSubmissionService,
    private readonly appQuestionSessionSegmentService: AppQuestionSessionSegmentService,
  ) {}

  @Post(':sessionId/start')
  async startSession(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionSegmentService.start(user.sub, sessionId);
  }

  @Post(':sessionId/stop')
  async stopSession(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionSegmentService.stop(user.sub, sessionId);
  }

  @Get(':sessionId/elapsed-ms')
  async getElapsedMs(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionSegmentService.getElapsedMs(
      user.sub,
      sessionId,
    );
  }

  @Post(':sessionId/poll')
  async pollSession(
    @Param('sessionId') sessionId: number,
    @User() user: UserPayload,
  ) {
    return this.appQuestionSessionSegmentService.pollSession(
      user.sub,
      sessionId,
    );
  }

  @Get('latest')
  async getLatestSession(@User() user: UserPayload) {
    return this.appQuestionSessionService.getLatestSession(user.sub);
  }

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

  @Post('by-all')
  async createSessionByAll(
    @User() user: UserPayload,
    @Body() createAllSessionDto: CreateQuestionSessionByAllAppDto,
  ) {
    return this.appQuestionSessionService.createSessionByAll(
      user.sub,
      createAllSessionDto.unitIds,
    );
  }

  @Post(':by-mock')
  async createSessionByMock(
    @User() user: UserPayload,
    @Body() body: CreateQuestionSessionByMockAppDto,
  ) {
    return this.appQuestionSessionService.createSessionByMock(user.sub, body);
  }
}
