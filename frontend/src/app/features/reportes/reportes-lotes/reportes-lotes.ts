import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesLotesService } from '../services/reportes-lotes.service';
import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-reportes-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-lotes.html',
})
export class ReportesLotesComponent implements OnInit {
  private readonly reportesService = inject(ReportesLotesService);
  private readonly urbanizacionContext = inject(UrbanizacionContextService);

  // Ya no necesitas mantener urbanizacionId como signal, lo obtienes del contexto
  manzanoSeleccionado = signal<string>('todas');
  manzanos = signal<string[]>([]);

  cargandoTotal        = signal(false);
  cargandoDisponibles  = signal(false);
  cargandoVendidos     = signal(false);
  cargandoReservados   = signal(false);
  cargandoDetalle      = signal(false);
  cargandoGeneral      = signal(false);

  // Getter para obtener el ID actual
  private get urbanizacionId(): number | null {
    return this.urbanizacionContext.urbanizacionId;
  }

  ngOnInit() {
    this.cargarManzanos();
  }

  async cargarManzanos() {
    const id = this.urbanizacionId;
    console.log('urbanizacionId:', id);
    
    if (!id) {
      console.warn('No hay urbanización seleccionada');
      this.manzanos.set([]);
      return;
    }
    
    try {
      const lista = await this.reportesService.getManzanos(id);
      this.manzanos.set(lista);
    } catch (error) {
      console.error('Error cargando manzanos:', error);
      this.manzanos.set([]);
    }
  }

  onManzanoChange(value: string) {
    this.manzanoSeleccionado.set(value);
  }

  async descargarTotalLotes() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoTotal.set(true);
    try {
      await this.reportesService.exportarTotalLotesPdf(
        id,
        this.manzanoSeleccionado(),
      );
    } finally {
      this.cargandoTotal.set(false);
    }
  }

  async descargarDisponibles() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoDisponibles.set(true);
    try {
      await this.reportesService.exportarLotesDisponiblesPdf(
        id,
        this.manzanoSeleccionado(),
      );
    } finally {
      this.cargandoDisponibles.set(false);
    }
  }

  async descargarVendidos() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoVendidos.set(true);
    try {
      await this.reportesService.exportarLotesVendidosPdf(
        id,
        this.manzanoSeleccionado(),
      );
    } finally {
      this.cargandoVendidos.set(false);
    }
  }

  async descargarReservados() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoReservados.set(true);
    try {
      await this.reportesService.exportarLotesReservadosPdf(
        id,
        this.manzanoSeleccionado(),
      );
    } finally {
      this.cargandoReservados.set(false);
    }
  }

  async descargarDetalle() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoDetalle.set(true);
    try {
      await this.reportesService.exportarDetalleLotesPdf(
        id,
        this.manzanoSeleccionado(),
      );
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  async descargarGeneralDetallado() {
    const id = this.urbanizacionId;
    if (!id) return;
    
    this.cargandoGeneral.set(true);
    try {
      await this.reportesService.exportarGeneralDetalladoPdf(id);
    } finally {
      this.cargandoGeneral.set(false);
    }
  }
}