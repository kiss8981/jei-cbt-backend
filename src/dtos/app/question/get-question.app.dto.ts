import { Expose } from 'class-transformer';
import { QuestionType } from 'src/common/constants/question-type.enum';

export type GetQuestionAppDtoUnion =
  | GetTrueFalseQuestionAppDto
  | GetMultipleChoiceQuestionAppDto
  | GetMatchingQuestionAppDto
  | GetShortAnswerQuestionAppDto
  | GetCompletionQuestionAppDto
  | GetMultipleShortAnswerQuestionAppDto
  | GetInterviewQuestionAppDto;

export class GetQuestionAppDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  additionalText: string;

  @Expose()
  unitId: number;

  @Expose()
  unitName: string;
}

export class GetTrueFalseQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.TRUE_FALSE;

  @Expose()
  question: string;

  @Expose()
  correctAnswer: boolean;
}

export class GetMultipleChoiceQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.MULTIPLE_CHOICE;

  @Expose()
  question: string;

  @Expose()
  isMultipleAnswer: boolean;

  @Expose()
  choices: { id: number; option: string }[];
}

export class GetMatchingQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.MATCHING;

  @Expose()
  leftItems: {
    id: number;
    option: string;
  }[];

  @Expose()
  rightItems: {
    id: number;
    option: string;
  }[];
}

export class GetShortAnswerQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.SHORT_ANSWER;

  @Expose()
  question: string;
}

export class GetCompletionQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.COMPLETION;

  @Expose()
  question: string; // 네덜란드의 수도는 {0}이고, 프랑스의 수도는 {1}이다.
}

export class GetMultipleShortAnswerQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.MULTIPLE_SHORT_ANSWER;

  @Expose()
  question: string; // 네덜란드의 수도는 {0}이고, 프랑스의 수도는 {1}이다.
}

export class GetInterviewQuestionAppDto extends GetQuestionAppDto {
  @Expose()
  type: QuestionType.INTERVIEW;

  @Expose()
  question: string; // 면접 질문 내용
}
