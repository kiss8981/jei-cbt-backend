import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RequestPasswordResetAuthAppDto {
  @IsString()
  @Matches(/^\d{10,11}$/)
  phone: string;
}

export class VerifyPasswordResetAuthAppDto {
  @IsString()
  @Matches(/^\d{10,11}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}

export class CompletePasswordResetAuthAppDto {
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  passwordConfirmation: string;
}
