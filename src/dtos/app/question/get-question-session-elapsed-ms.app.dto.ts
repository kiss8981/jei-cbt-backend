import { Expose } from 'class-transformer';

export class GetQuestionSessionElapsedMsAppDto {
  @Expose()
  sessionId: number;

  @Expose()
  elapsedMs: number;
}
