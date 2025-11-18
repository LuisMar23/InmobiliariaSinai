// lotes-promocion.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PromocionBadgeComponent } from '../promocion-badge-component/promocion-badge-component';
import { PrecioPromocionComponent } from '../precio-promocion-component/precio-promocion-component';
import { LoteService } from '../../lotes/services/lote.service';
import { environment } from '../../../../environments/environment';

interface LoteConPromocion {
  id: number;
  uuid: string;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  descripcion?: string;
  ciudad: string;
  archivos?: Array<{ urlArchivo: string }>;
  lotePromocion?: {
    precioOriginal: number;
    precioConDescuento: number;
    promocion: {
      titulo: string;
      descripcion?: string;
      descuento: number;
      fechaInicio: Date;
      fechaFin: Date;
    };
  };
}

@Component({
  selector: 'app-lotes-promocion',
  standalone: true,
  imports: [CommonModule, RouterLink, PromocionBadgeComponent, PrecioPromocionComponent],
  templateUrl:'./promocion-list.html'
})
export class LotesPromocionComponent implements OnInit {
  lotesPromocion = signal<LoteConPromocion[]>([]);
  urlServer = environment.fileServer;
  ngOnInit() {
    this.cargarLotesPromocion();
  }
  private loteService = inject(LoteService);
  cargarLotesPromocion() {
    this.loteService.getLotesPromocion().subscribe({
      next: (resp) => {
        console.log(resp);
        this.lotesPromocion.set(resp);
      },
    });
  }
}
