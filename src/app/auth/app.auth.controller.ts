import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AppAuthService } from './app.auth.service';
import { LoginUserAuthAppDto } from 'src/dtos/app/auth/login-user.auth.dto';
import { RegisterUserAuthAppDto } from 'src/dtos/app/auth/register-user.auth.dto';
import { Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User, UserPayload } from 'src/common/decorators/user.decorator';
import { RefreshTokenAuthAppDto } from 'src/dtos/app/auth/refresh-token.auth.dto';

@Controller('auth')
export class AppAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@User() user: UserPayload) {
    return user;
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserAuthAppDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginUserResponseDto = await this.appAuthService.login(loginUserDto);

    res.cookie('refreshToken', loginUserResponseDto.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    res.cookie('accessToken', loginUserResponseDto.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    return loginUserResponseDto;
  }

  @Post('register')
  async register(
    @Body() loginUserDto: RegisterUserAuthAppDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const registerUserResponseDto =
      await this.appAuthService.register(loginUserDto);

    res.cookie('refreshToken', registerUserResponseDto.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });
    res.cookie('accessToken', registerUserResponseDto.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });
    return registerUserResponseDto;
  }

  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenAuthAppDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenResponseDto = await this.appAuthService.refreshToken(
      refreshTokenDto.refreshToken,
    );

    res.cookie('refreshToken', refreshTokenResponseDto.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    res.cookie('accessToken', refreshTokenResponseDto.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000,
      domain: process.env.DOMAIN,
    });

    return refreshTokenResponseDto;
  }

  @Post('signout')
  @UseGuards(AuthGuard)
  async signout(
    @Res({ passthrough: true }) res: Response,
    @User() user: UserPayload,
  ) {
    await this.appAuthService.signOut(user.sub);
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.DOMAIN,
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.DOMAIN,
    });
    return true;
  }

  @Post('reset-password/verify')
  async resetPasswordVerify(@Body('phone') phone: string) {
    return this.appAuthService.resetPasswordVerifyPhone(phone);
  }
}
