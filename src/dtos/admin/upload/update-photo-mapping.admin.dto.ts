import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdatePhotoMappingAdminDto {
  @IsString()
  key: string;

  @IsNumber()
  orderIndex: number;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}

export class UpdatePhotoMappingsAdminDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePhotoMappingAdminDto)
  photos: UpdatePhotoMappingAdminDto[];
}
