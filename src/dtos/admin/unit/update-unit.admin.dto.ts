import { Expose } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';

export class UpdateUnitAdminDto {
  @IsString()
  name: string;

  @IsBoolean()
  isDisplayed: boolean;
}
