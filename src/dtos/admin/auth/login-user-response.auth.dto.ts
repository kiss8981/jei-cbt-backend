import { Expose } from 'class-transformer';

export class LoginUserResponseAuthAdminDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}
