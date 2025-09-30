import { IsString } from 'class-validator';

export class LoginUserAuthDto {
  @IsString({
    message: '전화번호를 입력해주세요.',
  })
  phone: string;

  @IsString({
    message: '비밀번호를 입력해주세요.',
  })
  password: string;
}
