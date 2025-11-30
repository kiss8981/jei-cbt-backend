import { Expose } from 'class-transformer';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { GetPhotoMappingAdminDto } from '../upload/get-photo-mapping.admin.dto';

export class GetQuestionAdminDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  explanation: string;

  @Expose()
  additionalText: string;

  @Expose()
  unitId: number;

  @Expose()
  unitName: string;

  @Expose()
  photos: GetPhotoMappingAdminDto;

  @Expose()
  createdAt: Date;
}

export class GetTrueFalseQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.TRUE_FALSE;

  @Expose()
  question: string;

  @Expose()
  correctAnswer: boolean;
}

export class GetMultipleChoiceQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.MULTIPLE_CHOICE;

  @Expose()
  question: string;

  @Expose()
  isMultipleAnswer: boolean; // 다중 정답 여부 서비스단에서 관리 프론트 미사용

  @Expose()
  choices: { id: number; content: string; isCorrect: boolean }[];
}

export class GetMatchingQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.MATCHING;

  @Expose()
  items: {
    leftItem: { id: number; content: string };
    rightItem: { id: number; content: string };
  };
}

export class GetShortAnswerQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.SHORT_ANSWER;

  @Expose()
  question: string;

  @Expose()
  correctAnswers: { id: number; answer: string }[];
}

export class GetCompletionQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.COMPLETION;

  @Expose()
  question: string; // 네덜란드의 수도는 {0}이고, 프랑스의 수도는 {1}이다.
}

export class GetMultipleShortAnswerQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.MULTIPLE_SHORT_ANSWER;

  @Expose()
  question: string; // 네덜란드의 수도는 {0}이고, 프랑스의 수도는 {1}이다.

  @Expose()
  correctAnswers: { id: number; content: string; orderIndex: number }[];
}

export class GetInterviewQuestionAdminDto extends GetQuestionAdminDto {
  @Expose()
  type: QuestionType.INTERVIEW;

  @Expose()
  question: string; // 면접 질문 내용

  @Expose()
  answer: string; // 모범 답안 내용
}
