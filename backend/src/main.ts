import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configurar CORS
  // app.enableCors({
  //       origin: ['http://localhost:4300', ],
  //   credentials: true,
  // });
  app.enableCors({
  origin: '*', // cualquier dominio
});

  // Global prefix para todas las rutas
  app.setGlobalPrefix('apisinai');

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(process.env.PORT ?? 3301);
  console.log('Application is running on: http://localhost:3301/apisinai');
}
bootstrap();
