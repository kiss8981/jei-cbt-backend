import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUnitAdminDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  examIds?: number[];
}
