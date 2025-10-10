import { IsOptional, IsString } from 'class-validator';

export class GetQuestionNextQueryAppDto {
  @IsString()
  @IsOptional()
  currentQuestionMapId: number;
}
