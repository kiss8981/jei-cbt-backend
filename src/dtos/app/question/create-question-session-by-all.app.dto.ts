import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuestionSessionByAllAppDto {
  @IsArray()
  @IsNumber({}, { each: true })
  unitIds: number[];
}
