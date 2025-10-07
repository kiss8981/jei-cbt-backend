import { Expose } from 'class-transformer';

export class MeUserAuthAppDto {
  @Expose()
  sub: number;

  @Expose()
  type: 'access';

  @Expose()
  name: string;

  @Expose()
  phone: string;
}
