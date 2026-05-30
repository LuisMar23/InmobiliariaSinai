import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { SedeService } from './sede.service';
import { SedeController } from './sede.controller';

@Module({
  controllers: [SedeController],
  providers: [SedeService, PrismaService],
})
export class SedeModule {}
