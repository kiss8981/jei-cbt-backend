import { PreviewQuestionExcelItemAdminDto } from './excel-preview.admin.dto';

export class CommitQuestionExcelItemAdminDto
  extends PreviewQuestionExcelItemAdminDto
{
  selectedAction?: 'APPLY' | 'SKIP';
}

export class CommitQuestionExcelAdminDto {
  items: CommitQuestionExcelItemAdminDto[];
}
