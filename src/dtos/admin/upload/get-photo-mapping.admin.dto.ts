import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class GetPhotoMappingAdminDto {
  @IsNumber()
  @Expose()
  id: number;

  @IsString()
  @Expose()
  key: string;

  @IsString()
  @Expose()
  originalFileName: string;

  @IsNumber()
  @Expose()
  orderIndex: number;
}
