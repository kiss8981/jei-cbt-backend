import { Expose } from 'class-transformer';
import { SessionType } from 'src/common/constants/session-type.enum';

export class GetQuestionSessionAppDto {
  @Expose()
  id: number;

  @Expose()
  duration: number; // 세션 시간 (초 단위)

  @Expose()
  startedAt: Date; // 세션 시작 시간

  @Expose()
  totalQuestions: number; // 총 문제 수
}

export class GetUnitQuestionSessionAppDto extends GetQuestionSessionAppDto {
  @Expose()
  unitId: number; // 연관된 단위 ID

  @Expose()
  unitName: string; // 연관된 단위 이름

  @Expose()
  type: SessionType.UNIT;

  @Expose()
  lastQuestionMapId: number | null; // 사용자가 마지막으로 푼 문제의 ID (없을 경우 null)
}

export class GetMockQuestionSessionAppDto extends GetQuestionSessionAppDto {
  @Expose()
  type: SessionType.MOCK;
}

export class GetAllQuestionSessionAppDto extends GetQuestionSessionAppDto {
  @Expose()
  type: SessionType.ALL;
}
