import { Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { GetQuestionAppDtoUnion } from './get-question.app.dto';

export class GetWrongQuestionAppDto {
  @Expose()
  id: number;

  @Expose()
  questionId: number;

  @Expose()
  title: string;

  @Expose()
  unitId: number;

  @Expose()
  unitName: string;

  @Expose()
  wrongCount: number;

  @Expose()
  lastWrongAt: Date;

  @Expose()
  question: GetQuestionAppDtoUnion;
}
