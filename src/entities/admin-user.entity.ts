import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class AdminUser extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  loginId: string;

  @Column()
  password: string;
}
