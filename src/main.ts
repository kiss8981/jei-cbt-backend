import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new CustomValidationPipe());

  morgan.token('timestamp', () => new Date().toISOString());
  app.use(morgan(':timestamp - :method :url :status - :response-time ms'));

  await app.listen(3000);
}
bootstrap();
