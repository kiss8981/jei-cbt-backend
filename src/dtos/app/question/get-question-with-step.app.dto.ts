import { Expose } from 'class-transformer';
import { GetQuestionAppDtoUnion } from './get-question.app.dto';
import { SubmissionAnswerRequestAppDto } from './submission-answer-request.app.dto';

export class GetQuestionWithStepAppDto {
  @Expose()
  isLastQuestion: boolean;

  @Expose()
  previousQuestionCount: number | null;

  @Expose()
  nextQuestionCount: number | null;

  @Expose()
  totalQuestionCount: number;

  @Expose()
  questionMapId: number;

  @Expose()
  question: GetQuestionAppDtoUnion;

  @Expose()
  userAnswer: Pick<
    SubmissionAnswerRequestAppDto,
    | 'answersForInterview'
    | 'answersForMultipleShortAnswer'
    | 'answersForShortAnswer'
    | 'answersForTrueFalse'
    | 'answersForMultipleChoice'
    | 'answersForMatching'
  > | null;
}
