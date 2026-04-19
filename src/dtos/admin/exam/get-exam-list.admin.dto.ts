import { Expose } from 'class-transformer';

export class GetExamListAdminDto {
  @Expose()
  id: number;

  @Expose()
  type: string;

  @Expose()
  typeValue: string;

  @Expose()
  title: string;

  @Expose()
  isDisplayed: boolean;
}
