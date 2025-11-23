import { Expose } from 'class-transformer';
import { SessionType } from 'src/common/constants/session-type.enum';

export class GetQuestionSessionListAdminDto {
  @Expose()
  sessionId: number;

  @Expose()
  sessionType: SessionType;

  @Expose()
  createdAt: Date;

  @Expose()
  elapsedMs: number;

  @Expose()
  elapsedMs7d: number;

  @Expose()
  elapsedMs30d: number;

  @Expose()
  elapsedMsToday: number;

  @Expose()
  elapsedMsTotal: number;

  @Expose()
  userId: number;

  @Expose()
  userName: string;
}
