import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUser } from 'src/entities/admin-user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminUserRepository {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  findOneByLoginId(loginId: string) {
    return this.adminUserRepository.findOne({ where: { loginId } });
  }

  findById(id: number) {
    return this.adminUserRepository.findOne({ where: { id } });
  }
}
