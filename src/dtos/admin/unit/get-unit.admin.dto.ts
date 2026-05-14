import { Expose, Type } from 'class-transformer';
import { UnitExamSummaryAdminDto } from './unit-exam-summary.admin.dto';

export class GetUnitAdminDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  isDisplayed: boolean;

  @Expose()
  examIds: number[];

  @Expose()
  @Type(() => UnitExamSummaryAdminDto)
  exams: UnitExamSummaryAdminDto[];
}
