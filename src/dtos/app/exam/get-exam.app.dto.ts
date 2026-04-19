import { Expose } from 'class-transformer';

export class GetExamAppDto {
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
