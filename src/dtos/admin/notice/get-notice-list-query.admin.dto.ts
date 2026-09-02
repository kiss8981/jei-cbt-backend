import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetNoticeListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isPublished?: string;
}
