import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UrbanizacionModule } from './urbanizacion/urbanizacion.module';
import { PromocionModule } from './promocion/promocion.module';
import { LotesModule } from './lote/lote.module';
import { VentasModule } from './venta/venta.module';
import { ReservasModule } from './reserva/reserva.module';
import { CotizacionesModule } from './cotizacion/cotizacion.module';
import { CajaModule } from './caja/caja.module';
import { MovimientoModule } from './movimiento/movimiento.module';
import { CierreModule } from './cierre/cierre.module';

@Module({
  imports: [AuthModule, UsersModule, UrbanizacionModule, PromocionModule, LotesModule, VentasModule, ReservasModule, CotizacionesModule, CajaModule, MovimientoModule, CierreModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
