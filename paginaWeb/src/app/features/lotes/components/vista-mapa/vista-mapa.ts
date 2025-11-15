import { Component, Input, signal, PLATFORM_ID, inject, afterNextRender, ElementRef, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet'; // ← Importación de tipos solamente
import { Lote } from '../../../../core/interfaces/datos.interface';

@Component({
  selector: 'app-vista-mapa',
  imports: [],
  templateUrl: './vista-mapa.html',
  styleUrl: './vista-mapa.css',
})
export class VistaMapa {
  @Input() lotes: Lote[] = [];

  private map?: L.Map;
  private platformId = inject(PLATFORM_ID);
  private L?: typeof L; // Referencia a la librería Leaflet

  constructor() {
    // Inicializar el mapa solo en el navegador
    afterNextRender(() => {
      this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Importación dinámica de Leaflet solo en el navegador
    this.L = (await import('leaflet')).default;

    this.map = this.L.map('map', {
      center: [-17.3895, -66.1568], // Cochabamba por defecto
      zoom: 13,
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.agregarMarcadores();
  }

  private agregarMarcadores() {
    if (!this.lotes.length || !this.map || !this.L) return;

    const bounds = this.L.latLngBounds([]);

    this.lotes.forEach((l) => {
      if (l.latitud && l.longitud && this.map && this.L) {
        const marker = this.L.marker([l.latitud, l.longitud]).addTo(this.map);
        marker.bindPopup(`
          <strong>Lote ${l.numeroLote}</strong><br>
          ${l.ciudad} - ${l.urbanizacion?.nombre || ''}
          <br>Bs ${l.precioBase.toLocaleString()}
        `);
        bounds.extend([l.latitud, l.longitud]);
      }
    });

    if (bounds.isValid() && this.map) this.map.fitBounds(bounds);
  }

  // Si necesitas actualizar los marcadores cuando cambian los lotes
  ngOnChanges() {
    if (this.map && isPlatformBrowser(this.platformId)) {
      this.agregarMarcadores();
    }
  }
}