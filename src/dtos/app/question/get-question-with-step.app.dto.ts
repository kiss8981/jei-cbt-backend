import { Expose } from 'class-transformer';
import { GetQuestionAppDtoUnion } from './get-question.app.dto';

export class GetQuestionWithStepAppDto {
  @Expose()
  isLastQuestion: boolean;

  @Expose()
  previousQuestionCount: number | null;

  @Expose()
  nextQuestionCount: number | null;

  @Expose()
  questionMapId: number;

  @Expose()
  question: GetQuestionAppDtoUnion;
}
