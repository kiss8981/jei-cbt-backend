import { Expose } from "class-transformer";
import { GetQuestionAppDtoUnion } from "./get-question.app.dto";

export class GetQuestionWithStepAppDto {
  @Expose()
  isLastQuestion: boolean;

  @Expose()
  questionMapId: number;

  @Expose()
  question: GetQuestionAppDtoUnion;
}
