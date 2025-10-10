import { Controller, Get, Param } from '@nestjs/common';
import { AppQuestionService } from './app.question.service';

@Controller('questions')
export class AppQuestionController {
  constructor(private readonly appQuestionService: AppQuestionService) {}

  @Get('/by-unit/:unitId')
  getByUnitId(@Param('unitId') unitId: number) {
    return this.appQuestionService.getByUnitId(unitId);
  }
}
