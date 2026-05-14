import { Expose } from 'class-transformer';

export class UnitExamSummaryAdminDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  type: string;
}
