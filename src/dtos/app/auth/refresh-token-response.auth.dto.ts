import { Expose } from 'class-transformer';

export class RefreshTokenResponseAuthAppDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}
