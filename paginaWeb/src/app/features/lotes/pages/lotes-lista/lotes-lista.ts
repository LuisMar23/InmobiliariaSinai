import { Component, ComponentRef, signal, viewChild, ViewContainerRef } from '@angular/core';
import { FiltrosLote, Lote, VistaLote } from '../../../../core/interfaces/datos.interface';
import { LoteService } from '../../services/lote.service';
import { LoteCard } from '../../components/lote-card/lote-card';
import { LoteListItem } from '../../components/lote-list-item/lote-list-item';
import { VistaMapa } from '../../components/vista-mapa/vista-mapa';
import { CommonModule } from '@angular/common';
import { FiltroLotes } from '../../components/filtro-lotes/filtro-lotes';

@Component({
  selector: 'app-lotes-lista',
  imports: [LoteCard, LoteListItem, CommonModule, FiltroLotes],
  templateUrl: './lotes-lista.html',
  styleUrl: './lotes-lista.css',
})
export class LotesLista {
  lotes = signal<Lote[]>([]);
  lotesFiltrados = signal<Lote[]>([]);
  vista = signal<VistaLote>('grid');

  mapaContainer = viewChild('mapaContainer', { read: ViewContainerRef });
  private mapaComponentRef?: ComponentRef<any>;

  filtros: FiltrosLote = {
    ciudad: '',
    precioMin: 0,
    precioMax: 9999999,
    superficieMin: 0,
    superficieMax: 9999999,
    estado: '',
    busqueda: '',
  };

  cargando = signal(false);

  constructor(private loteSvc: LoteService) {
    this.cargarLotes();
  }

  cargarLotes() {
  console.log('📡 Intentando cargar lotes...');
  this.cargando.set(true);
  
  this.loteSvc.getAll().subscribe({
    next: (data) => {
      console.log('✅ Lotes recibidos:', data);
      console.log('📊 Cantidad:', data.length);
      this.lotes.set(data);
      this.lotesFiltrados.set(data);
      this.cargando.set(false);
    },
    error: (err) => {
      console.error('❌ Error cargando lotes:', err);
      console.error('❌ Status:', err.status);
      console.error('❌ Mensaje:', err.message);
      this.cargando.set(false);
    },
  });
  }

  onBuscar(filtros: FiltrosLote) {
    this.filtros = filtros;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const f = this.filtros;
    this.lotesFiltrados.set(
      this.lotes().filter((lote) => {
        const cumpleCiudad =
          !f.ciudad || lote.ciudad.toLowerCase().includes(f.ciudad.toLowerCase());
        const cumplePrecio = lote.precioBase >= f.precioMin && lote.precioBase <= f.precioMax;
        const cumpleSup =
          lote.superficieM2 >= f.superficieMin && lote.superficieM2 <= f.superficieMax;
        const cumpleEstado = !f.estado || lote.estado === f.estado;
        const cumpleTexto =
          !f.busqueda ||
          lote.numeroLote.toLowerCase().includes(f.busqueda.toLowerCase()) ||
          lote.descripcion?.toLowerCase().includes(f.busqueda.toLowerCase());

        return cumpleCiudad && cumplePrecio && cumpleSup && cumpleEstado && cumpleTexto;
      })
    );

    // Actualizar el mapa si ya está cargado
    if (this.mapaComponentRef) {
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
    }
  }

  // ✅ Método que cambia la vista (usa este en los botones)
  cambiarVista(v: VistaLote) {
    this.vista.set(v);

    // Cargar VistaMapa dinámicamente solo cuando se selecciona vista mapa
    if (v === 'map' && !this.mapaComponentRef) {
      setTimeout(() => this.cargarVistaMapa(), 0);
    }

    // Actualizar lotes si el mapa ya existe
    if (v === 'map' && this.mapaComponentRef) {
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
    }
  }

  private async cargarVistaMapa() {
    const container = this.mapaContainer();
    if (!container) {
      console.error('Container del mapa no encontrado');
      return;
    }

    try {
      // Importación dinámica del componente
      const { VistaMapa } = await import('../../components/vista-mapa/vista-mapa');

      // Crear el componente dinámicamente
      this.mapaComponentRef = container.createComponent(VistaMapa);
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
      console.log('Mapa cargado correctamente');
    } catch (error) {
      console.error('Error cargando vista mapa:', error);
    }
  }
}
