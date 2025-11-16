import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export enum WrongQuestionSortType {
  LEAST_RECENT = 'LEAST_RECENT', // 최근 틀린 문제
  MOST_WRONG = 'MOST_WRONG', // 많이 틀린 문제
}

export class GetWrongQuestionListQueryAppDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit: number;

  @IsString()
  @IsOptional()
  sortType: WrongQuestionSortType;
}
