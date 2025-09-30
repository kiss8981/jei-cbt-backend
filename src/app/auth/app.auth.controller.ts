import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppAuthService } from './app.auth.service';
import { LoginUserAuthDto } from 'src/dtos/app/auth/login-user.auth.dto';

@Controller('auth')
export class AppAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Post('login')
  login(@Body() loginUserDto: LoginUserAuthDto) {
    return this.appAuthService.login();
  }
}
