import { Expose } from 'class-transformer';

export class GetUnitListAppDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}
