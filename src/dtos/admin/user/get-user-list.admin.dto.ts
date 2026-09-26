import { Expose } from 'class-transformer';

export class GetUserListAdminDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  phone: string;

  @Expose()
  createdAt: Date;
}
