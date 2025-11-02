import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UploadArchivosService } from '../../services/archivos.service';

@Component({
  selector: 'app-archivos',
  imports: [],
  templateUrl: './archivos.html',
  styleUrl: './archivos.css'
})
export class ArchivosComponent  {
 @Input() ventaId?: number;
  @Input() reservaId?: number;
  @Input() loteId?: number;
  @Input() urbanizacionId?: number;
  @Input() modo: 'crear' | 'actualizar' = 'crear';
  @Output() subidaCompleta = new EventEmitter<any>();

  archivosSeleccionados: File[] = [];
  previsualizaciones: string[] = [];
  cargando = false;

  constructor(private uploadService: UploadArchivosService) {}

  onSeleccionarArchivos(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.archivosSeleccionados = files;

    this.previsualizaciones = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => this.previsualizaciones.push(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  }

  subirArchivos() {
    if (this.archivosSeleccionados.length === 0) return;

    this.cargando = true;

    const opciones = {
      ventaId: this.ventaId,
      reservaId: this.reservaId,
      loteId: this.loteId,
      urbanizacionId: this.urbanizacionId,
    };

    const request =
      this.modo === 'actualizar'
        ? this.uploadService.actualizarArchivos(this.archivosSeleccionados, opciones)
        : this.uploadService.subirArchivos(this.archivosSeleccionados, opciones);

    request.subscribe({
      next: (res) => {
        this.cargando = false;
        this.archivosSeleccionados = [];
        this.previsualizaciones = [];
        this.subidaCompleta.emit(res);
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al subir archivos:', err);
      },
    });
  }
}
