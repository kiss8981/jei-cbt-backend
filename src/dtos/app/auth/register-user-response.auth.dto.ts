import { Expose } from 'class-transformer';

export class RegisterUserResponseAuthAppDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}
