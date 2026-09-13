import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { ExcelRow } from 'src/admin/question/question-excel.codec';

@Entity()
export class QuestionExcelBatch {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'bigint' })
  adminId: string;

  @Index('IDX_question_excel_batch_expiresAt')
  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'json' })
  rows: ExcelRow[];

  @Column({ type: 'json', nullable: true })
  result: {
    created: number;
    updated: number;
    unchanged: number;
    questionIds: string[];
  } | null;

  @Column({ type: 'datetime', nullable: true })
  committedAt: Date | null;
}
