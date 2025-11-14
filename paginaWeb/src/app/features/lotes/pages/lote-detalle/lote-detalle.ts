import {
  afterNextRender,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { LoteService } from '../../services/lote.service';
import { Lote } from '../../../../core/interfaces/datos.interface';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SwiperOptions } from 'swiper/types';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { SafeUrlPipe } from './safe-url.pipe';


@Component({
  selector: 'app-lote-detalle',

  imports: [CommonModule, ReactiveFormsModule, RouterModule,SafeUrlPipe],
  templateUrl: './lote-detalle.html',
  styleUrl: './lote-detalle.css',

})
export class LoteDetalle {
  lote = signal<Lote | null>(null);
  cargando = signal(true);
  lightboxOpen = signal(false);
  selectedImage = signal<string | null>(null);
@ViewChild('swiperEl') swiperEl!: ElementRef;
  urlServer = environment.fileServer;
  contactoForm!: FormGroup;
  currentIndex = 0;
  totalImages = 0;


  constructor(
    private route: ActivatedRoute,
    private loteSvc: LoteService,
    private fb: FormBuilder,
    public sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
      mensaje: ['Estoy interesado en este lote. ¿Podrían brindarme más información?'],
    });

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.loteSvc.getByUuid(uuid).subscribe({
        next: (data) => {
          this.lote.set(data);
             this.totalImages = data.archivos?.length || 0;
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
    }
  }

  obtenerEstadoClase(estado: string) {
    return (
      {
        DISPONIBLE: 'bg-green-100 text-green-700',
        RESERVADO: 'bg-yellow-100 text-yellow-700',
        VENDIDO: 'bg-red-100 text-red-700',
      }[estado] || ''
    );
  }
  private platformId = inject(PLATFORM_ID);


  closeLightbox() {
    this.lightboxOpen.set(false);
    this.selectedImage.set(null);
  }

  enviarWhatsApp() {

    if (!isPlatformBrowser(this.platformId)) return;

    if (this.contactoForm.invalid || !this.lote()) return;

    const { nombre, telefono, mensaje } = this.contactoForm.value;
    const lote = this.lote()!;
    const texto = `Hola, soy ${nombre}.\nTeléfono: ${telefono}\n\n${mensaje}\n\nEstoy interesado en el lote ${lote.numeroLote} en ${lote.ciudad}.`;
    const url = `https://wa.me/59174537051?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  }
  osmIframeUrl(ubicacion?: string): string {
    const coords = ubicacion ? this.coordenadas(ubicacion) : { lat: -21.5319, lon: -64.7296 };
    const zoom = 16;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.005},${
      coords.lat - 0.005
    },${coords.lon + 0.005},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lon}`;
  }

  coordenadas(ubicacion: string): { lat: number; lon: number } {
    const parts = ubicacion.split(',');
    if (parts.length >= 2) return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    return { lat: -21.5319, lon: -64.7296 };
  }
  get mapaUrl(): string | null {
    const loteData = this.lote();

    if (loteData?.latitud && loteData?.longitud) {
      // Usamos lat/lng para embed
      return `https://www.google.com/maps?q=${loteData.latitud},${loteData.longitud}&output=embed`;
    } else if (loteData?.ubicacion) {
  
      return loteData.ubicacion;
    }

    return null;
  }

  get esEmbed(): boolean {
    const loteData = this.lote();
    return !!(loteData?.latitud && loteData?.longitud);
  }




  prevImage() {
    if (!this.lote()?.archivos?.length) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.lote()?.archivos.length) %
      this.lote()?.archivos.length;
  }

  nextImage() {
    if (!this.lote()?.archivos?.length) return;
    this.currentIndex =
      (this.currentIndex + 1) % this.lote()?.archivos.length;
  }

zoomOpen = signal(false); // <-- inicializado en falso

openZoom() {
  this.zoomOpen.set(true);
}

closeZoom() {
  this.zoomOpen.set(false);
}

}
