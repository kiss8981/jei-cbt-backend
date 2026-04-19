import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUnitAdminDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  examId?: number | null;
}
