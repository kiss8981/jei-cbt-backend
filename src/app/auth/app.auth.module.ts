import { Module } from '@nestjs/common';
import { AppAuthService } from './app.auth.service';
import { AppAuthController } from './app.auth.controller';

@Module({
  imports: [],
  controllers: [AppAuthController],
  providers: [AppAuthService],
})
export class AppAuthModule {}
