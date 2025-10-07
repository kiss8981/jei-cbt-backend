import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class MeUserAuthAdminDto {
  @Expose()
  sub: number;

  @Expose()
  type: 'access';

  @Expose()
  name: string;
}
