import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const PORT = process.env.PORT;
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
    setHeaders: (res) => {
      res.set('Cache-Control', 'max-age=2592000');
    },
  });

  // Start the application on port 3000
  await app.listen(PORT, () => console.log(`Application running on port: ${PORT}`));
}
bootstrap();
