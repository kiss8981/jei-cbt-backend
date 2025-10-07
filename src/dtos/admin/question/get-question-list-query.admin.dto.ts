import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { toArray } from 'src/utils/toArray';

export class GetQuestionListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number = 1;

  @IsOptional()
  @IsNumberString()
  limit: number = 40;

  @IsOptional()
  @IsString({ each: true })
  @toArray()
  unitIds?: number[];

  @IsOptional()
  @IsString()
  keyword?: string;
}
