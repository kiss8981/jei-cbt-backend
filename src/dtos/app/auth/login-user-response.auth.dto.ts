import { Expose } from 'class-transformer';

export class LoginUserResponseAuthAppDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}
