import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetUnitListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number = 1;

  @IsOptional()
  @IsNumberString()
  limit: number = 40;

  @IsOptional()
  @IsString()
  keyword?: string;
}
