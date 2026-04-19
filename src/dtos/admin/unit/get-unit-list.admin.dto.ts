import { Expose } from 'class-transformer';

export class GetUnitListAdminDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  isDisplayed: boolean;

  @Expose()
  examId: number | null;

  @Expose()
  examType: string | null;

  @Expose()
  examTitle: string | null;
}
