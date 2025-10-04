import { Injectable } from '@nestjs/common';
import { RegisterUserAuthDto } from 'src/dtos/app/auth/register-user.auth.dto';
import { UserRepository } from 'src/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';

@Injectable()
export class AppAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  login() {}

  async register(dto: RegisterUserAuthDto) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(dto.password, saltOrRounds);
    const user = await this.userRepository.create({
      name: dto.name,
      phone: dto.phone,
      password: hash,
    });

    return {
      access_token: await this.createToken(user, 'access'),
      refresh_token: await this.createToken(user, 'refresh'),
    };
  }

  async createToken(user: User, type: 'access' | 'refresh') {
    const payload = { sub: user.id, type, name: user.name, phone: user.phone };

    return this.jwtService.signAsync(payload, {
      expiresIn: type == 'access' ? '1h' : '7d',
    });
  }
}
