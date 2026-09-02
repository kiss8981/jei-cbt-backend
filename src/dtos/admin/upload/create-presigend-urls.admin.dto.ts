import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { UploadPurpose } from 'src/common/constants/upload-purpose.enum';

export class CreateS3PresignedUrlFileAdminDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  size: number;
}

export class CreateS3PresignedUrlsAdminDto {
  @IsEnum(UploadPurpose)
  purpose: UploadPurpose;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateS3PresignedUrlFileAdminDto)
  files: CreateS3PresignedUrlFileAdminDto[];
}
