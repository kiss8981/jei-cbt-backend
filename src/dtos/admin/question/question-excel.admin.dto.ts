import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CommitQuestionExcelAdminDto {
  @IsUUID()
  previewId: string;

  @IsOptional()
  @IsBoolean()
  acknowledgeWarnings?: boolean;
}
