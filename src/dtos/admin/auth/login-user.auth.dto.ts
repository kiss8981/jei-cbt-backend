import { IsString } from 'class-validator';

export class LoginUserAuthAdminDto {
  @IsString({
    message: '아이디를 입력해주세요.',
  })
  id: string;

  @IsString({
    message: '비밀번호를 입력해주세요.',
  })
  password: string;
}
