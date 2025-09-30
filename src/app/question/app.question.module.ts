import { Module } from '@nestjs/common';
import { AppQuestionController } from './app.question.controller';
import { AppQuestionService } from './app.question.service';

@Module({
  imports: [],
  controllers: [AppQuestionController],
  providers: [AppQuestionService],
})
export class AppQuestionModule {}
