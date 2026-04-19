import { Expose } from 'class-transformer';

export class GetExamTypeAppDto {
  @Expose()
  value: string;

  @Expose()
  label: string;
}
