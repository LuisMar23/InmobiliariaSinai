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
    this.cargando.set(true);
    this.loteSvc.getAll().subscribe({
      next: (data) => {
        this.lotes.set([...data]); // clonamos array
        this.lotesFiltrados.set([...data]);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      }
    });
  }

onBuscar(filtros: FiltrosLote) {
  // Actualizar la referencia de filtros
  this.filtros = { ...filtros };
  // Aplicar filtros inmediatamente con los nuevos valores
  this.aplicarFiltros();
}
aplicarFiltros() {
  const f = {
    ciudad: (this.filtros.ciudad ?? '').toString().trim().toLowerCase(),
    precioMin: Number(this.filtros.precioMin ?? 0),
    precioMax: Number(this.filtros.precioMax ?? 9999999),
    superficieMin: Number(this.filtros.superficieMin ?? 0),
    superficieMax: Number(this.filtros.superficieMax ?? 9999999),
    estado: (this.filtros.estado ?? '').toString().trim(),
    busqueda: (this.filtros.busqueda ?? '').toString().trim().toLowerCase()
  };

  // Agregar console.log para debug
  console.log('Filtros aplicados:', f);
  console.log('Total lotes origen:', this.lotes().length);

  const origen = this.lotes();

  const filtrados = origen.filter(lote => {
    const ciudad = (lote.ciudad ?? '').toString().trim().toLowerCase();
    const numeroLote = (lote.numeroLote ?? '').toString().toLowerCase();
    const descripcion = (lote.descripcion ?? '').toString().toLowerCase();
    
    // CAMBIO CRÍTICO: Verificar longitud === 0 en lugar de !f.ciudad
    const cumpleCiudad = f.ciudad.length === 0 || ciudad.includes(f.ciudad);
    const cumplePrecio = (lote.precioBase ?? 0) >= f.precioMin && (lote.precioBase ?? 0) <= f.precioMax;
    const cumpleSup = (lote.superficieM2 ?? 0) >= f.superficieMin && (lote.superficieM2 ?? 0) <= f.superficieMax;
    const cumpleEstado = f.estado.length === 0 || lote.estado === f.estado;
    const cumpleTexto = f.busqueda.length === 0 || numeroLote.includes(f.busqueda) || descripcion.includes(f.busqueda);

    return cumpleCiudad && cumplePrecio && cumpleSup && cumpleEstado && cumpleTexto;
  });

  console.log('Lotes filtrados:', filtrados.length);
  this.lotesFiltrados.set(filtrados);

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
