import { Expose } from 'class-transformer';
import { SessionType } from 'src/common/constants/session-type.enum';

export class GetQuestionSessionResultAppDto {
  @Expose()
  id: number;

  @Expose()
  totalQuestions: number; // 총 문제 수

  @Expose()
  durationMs: number; // 총 진행 시간 (밀리초 단위)

  @Expose()
  correctAnswers: number; // 맞춘 문제 수

  @Expose()
  results: GetQuestionSessionResultItemAppDto[];
}

export class GetQuestionSessionResultItemAppDto {
  @Expose()
  title: string;

  @Expose()
  questionId: number;

  @Expose()
  isCorrect: boolean;

  @Expose()
  userAnswer: string;

  @Expose()
  correctAnswer: string;

  @Expose()
  explanation: string;
}
