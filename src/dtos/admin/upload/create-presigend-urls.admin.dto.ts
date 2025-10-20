import { IsString } from 'class-validator';

export class CreateS3PresignedUrlsAdminDto {
  @IsString({ each: true })
  filenames: string[];
}
