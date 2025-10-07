import { Expose } from 'class-transformer';

export class CreateUnitAdminDto {
  @Expose()
  name: string;
}
