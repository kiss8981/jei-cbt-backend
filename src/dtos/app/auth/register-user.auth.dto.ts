import { IsString, Matches } from 'class-validator';

export class RegisterUserAuthDto {
  @IsString({
    message: '전화번호를 입력해주세요.',
  })
  phone: string;

  @IsString({
    message: '비밀번호를 입력해주세요.',
  })
  password: string;

  @IsString({
    message: '이름을 입력해주세요.',
  })
  name: string;
}
