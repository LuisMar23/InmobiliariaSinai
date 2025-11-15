import { Component, computed, signal } from '@angular/core';
import { UrbanizacionService } from '../services/urbanizacion.service';
import { Urbanizacion } from '../../../core/interfaces/datos.interface';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-urbanizacion-list',
  imports: [RouterModule, CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './urbanizacion-list.html',
  styleUrl: './urbanizacion-list.css',
})
export class UrbanizacionList {
  urbanizaciones = signal<Urbanizacion[]>([]);
  urlServer=environment.fileServer

  filtroCity = signal<string>('');

  constructor(private urbanizacionService: UrbanizacionService) {}
  urbanizacionesFiltradas = computed(() => {
    const filtro = this.filtroCity().toLowerCase().trim();
    if (!filtro) {
      return this.urbanizaciones();
    }
    
    return this.urbanizaciones().filter(u => 
      u.ciudad?.toLowerCase().includes(filtro)
    );
  });
  ngOnInit(): void {
    this.urbanizacionService.getAll().subscribe({
      next: (data) => {
        this.urbanizaciones.set(data), console.log(data);
      },
      error: (err) => console.error(err),
    });
  }
    limpiarFiltro(): void {
    this.filtroCity.set('');
  }
}
