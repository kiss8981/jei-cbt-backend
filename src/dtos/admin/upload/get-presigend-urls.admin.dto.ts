import { Expose } from 'class-transformer';

export class GetS3PresignedUrlAdminDto {
  @Expose()
  fileName: string;

  @Expose()
  uploadUrl: string;

  @Expose()
  key: string;
}
