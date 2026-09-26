import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GetUserListQueryAdminDto } from 'src/dtos/admin/user/get-user-list-query.admin.dto';
import { GetUserListAdminDto } from 'src/dtos/admin/user/get-user-list.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { UserRepository } from 'src/repositories/user.repository';

@Injectable()
export class AdminUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAll(page: number, limit: number, query: GetUserListQueryAdminDto) {
    const [users, totalCount] = await this.userRepository.findAndCount(
      page,
      limit,
      { keyword: query.keyword },
    );

    return plainToInstance(
      createPaginationDto(GetUserListAdminDto),
      {
        items: users,
        totalCount: Number(totalCount),
        perPage: Number(limit),
        pageNum: Number(page),
      },
      { excludeExtraneousValues: true, enableImplicitConversion: true },
    );
  }
}
