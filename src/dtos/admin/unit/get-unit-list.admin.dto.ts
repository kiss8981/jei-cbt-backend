import { Expose } from 'class-transformer';

export class GetUnitListAdminDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  isDisplayed: boolean;
}
