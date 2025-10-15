import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors();

  // Global prefix para todas las rutas
  app.setGlobalPrefix('apisinai');


  await app.listen(process.env.PORT ?? 3301);
  console.log('Application is running on: http://localhost:3301/apisinai');
}
bootstrap();
