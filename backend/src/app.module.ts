import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UrbanizacionModule } from './urbanizacion/urbanizacion.module';

@Module({
  imports: [AuthModule, UsersModule, UrbanizacionModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
