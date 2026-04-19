import { Expose } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUnitAdminDto {
  @IsString()
  name: string;

  @IsBoolean()
  isDisplayed: boolean;

  @IsOptional()
  @IsNumber()
  examId?: number | null;
}
