import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Length,
} from 'class-validator';

export class WriteNoticeAdminDto {
  @IsString()
  @Length(1, 200)
  title: string;

  @IsString()
  contentHtml: string;

  @IsBoolean()
  isPublished: boolean;

  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  assetIds: number[];
}
