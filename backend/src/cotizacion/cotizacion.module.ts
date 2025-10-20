import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CotizacionesController } from './cotizacion.controller';
import { CotizacionesService } from './cotizacion.service';

@Module({
  controllers: [CotizacionesController],
  providers: [CotizacionesService, PrismaService],
})
export class CotizacionesModule {}
