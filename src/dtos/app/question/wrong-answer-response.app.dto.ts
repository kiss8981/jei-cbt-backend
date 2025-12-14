import { Expose } from 'class-transformer';

export class WrongAnswerResponseAppDto {
  @Expose()
  wrongId: number;

  @Expose()
  isCorrect: boolean | null;
  @Expose()
  explanation: string | null;
  @Expose()
  answer: string | null;
}
