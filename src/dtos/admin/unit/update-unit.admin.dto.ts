import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUnitAdminDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  isDisplayed: boolean;

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  examIds?: number[];
}
