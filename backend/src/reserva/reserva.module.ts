import { Module } from '@nestjs/common';
import { ReservasService } from './reserva.service';
import { ReservasController } from './reserva.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [ReservasController],
  providers: [ReservasService, PrismaService],
})
export class ReservasModule {}