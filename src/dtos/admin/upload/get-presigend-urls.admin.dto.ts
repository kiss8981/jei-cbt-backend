import { Expose } from 'class-transformer';

export class GetS3PresignedUrlAdminDto {
  @Expose()
  uploadId: number | null;

  @Expose()
  fileName: string;

  @Expose()
  uploadUrl: string;

  @Expose()
  key: string;

  @Expose()
  publicUrl: string;

  @Expose()
  mimeType: string;

  @Expose()
  size: number;
}
