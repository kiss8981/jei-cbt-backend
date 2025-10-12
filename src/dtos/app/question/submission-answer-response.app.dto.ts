import { Expose } from 'class-transformer';

export class SubmissionAnswerResponseAppDto {
  @Expose()
  submissionId: number;

  @Expose()
  isCorrect: boolean | null;
  @Expose()
  explanation: string | null;
  @Expose()
  answer: string | null;
}
