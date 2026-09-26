import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { EntityManager, In, Repository } from 'typeorm';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findOneByPhone(phone: string) {
    return this.userRepository.findOne({ where: { phone } });
  }

  findByIds(ids: number[]) {
    return this.userRepository.find({
      where: {
        id: In(ids),
      },
    });
  }

  create(user: Partial<User>) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  findById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  softDeleteById(id: number) {
    return this.userRepository.softDelete(id);
  }

  deleteById(id: number) {
    return this.userRepository.delete(id);
  }

  updatePassword(id: number, password: string, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(User)
      : this.userRepository;
    return repository.update(id, { password });
  }

  findAndCount(page: number, limit: number, { keyword }: { keyword?: string }) {
    const query = this.userRepository.createQueryBuilder('user');
    if (keyword?.trim()) {
      query.andWhere('(user.name LIKE :keyword OR user.phone LIKE :keyword)', {
        keyword: `%${keyword.trim()}%`,
      });
    }
    return query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
