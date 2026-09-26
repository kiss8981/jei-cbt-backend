import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetUserListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number = 1;

  @IsOptional()
  @IsNumberString()
  limit: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;
}
