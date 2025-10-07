import { Expose } from 'class-transformer';

export class RefreshTokenResponseAuthAdminDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}
