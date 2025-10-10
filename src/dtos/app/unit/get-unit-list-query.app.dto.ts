import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetUnitListQueryAppDto {
  @IsOptional()
  @IsNumberString()
  page: number;

  @IsOptional()
  @IsNumberString()
  limit: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}
