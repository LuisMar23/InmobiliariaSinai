import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FiltrosLote } from '../../../../core/interfaces/datos.interface';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filtro-lotes',
  imports: [FormsModule],
  templateUrl: './filtro-lotes.html',
  styleUrl: './filtro-lotes.css',
})
export class FiltroLotes {
 @Input() filtros!: FiltrosLote;
  @Output() buscar = new EventEmitter<FiltrosLote>();

  onBuscar() {
    this.buscar.emit(this.filtros);
  }

  limpiar() {
    this.filtros = {
      ciudad: '',
      precioMin: 0,
      precioMax: 9999999,
      superficieMin: 0,
      superficieMax: 9999999,
      estado: '',
      busqueda: '',
    };
    this.buscar.emit(this.filtros);
  }
}
