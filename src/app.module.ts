import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppAuthModule } from './app/auth/app.auth.module';
import { AdminAuthModule } from './admin/auth/admin.auth.module';
import { AdminQuestionModule } from './admin/question/admin.question.module';
import { AdminUnitModule } from './admin/unit/admin.unit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      entities: [join(__dirname, '/entities/**/*.js')],
      synchronize: true,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    AdminAuthModule,
    AdminQuestionModule,
    AdminUnitModule,
    AppAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
