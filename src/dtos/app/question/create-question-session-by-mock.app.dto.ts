import { IsArray, IsEnum, IsNumber, ValidateIf } from 'class-validator';

export enum QuestionSessionByMockTypeEnum {
  UNIT = 'UNIT',
}

export class CreateQuestionSessionByMockAppDto {
  @IsEnum(QuestionSessionByMockTypeEnum)
  type: QuestionSessionByMockTypeEnum;

  @IsArray()
  @IsNumber({}, { each: true })
  @ValidateIf((o) => o.type === QuestionSessionByMockTypeEnum.UNIT)
  unitIds: number[];

  @IsNumber()
  count: number;
}
