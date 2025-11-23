import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { toArray } from 'src/utils/toArray';

export class GetQuestionSessionListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number = 1;

  @IsOptional()
  @IsNumberString()
  limit: number = 40;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString({ each: true })
  @toArray()
  userIds?: number[];
}
