import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User, UserPayload } from 'src/common/decorators/user.decorator';
import { AdminAuthService } from './admin.auth.service';
import { LoginUserAuthAdminDto } from 'src/dtos/admin/auth/login-user.auth.dto';
import { RefreshTokenAuthAdminDto } from 'src/dtos/admin/auth/refresh-token.auth.dto';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import {
  AdminUser,
  AdminUserPayload,
} from 'src/common/decorators/admin-user.decorator';

@Controller('/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async me(@AdminUser() admin: AdminUserPayload) {
    return admin;
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserAuthAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginUserResponseDto =
      await this.adminAuthService.login(loginUserDto);

    res.cookie('refreshToken-admin', loginUserResponseDto.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    res.cookie('accessToken-admin', loginUserResponseDto.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    return loginUserResponseDto;
  }

  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenAuthAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenResponseDto = await this.adminAuthService.refreshToken(
      refreshTokenDto.refreshToken,
    );

    res.cookie('refreshToken-admin', refreshTokenResponseDto.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    res.cookie('accessToken-admin', refreshTokenResponseDto.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    return refreshTokenResponseDto;
  }
}
