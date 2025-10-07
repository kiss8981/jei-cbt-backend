import { Expose } from 'class-transformer';

export class GetUnitAdminDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}
