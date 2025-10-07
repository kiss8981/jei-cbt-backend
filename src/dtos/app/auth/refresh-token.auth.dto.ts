import { IsString } from 'class-validator';

export class RefreshTokenAuthAppDto {
  @IsString({
    message: '리프레시 토큰을 입력해주세요.',
  })
  refreshToken: string;
}
