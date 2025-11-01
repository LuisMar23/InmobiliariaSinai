import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { VisitaService } from '../../service/visita.service';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';

@Component({
  selector: 'app-visita-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './visita-edit.html',
})
export class VisitaEdit implements OnInit {
  visitaForm: FormGroup;
  visitaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  visitaData: any = null;
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');

  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private visitaSvc = inject(VisitaService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  constructor() {
    this.visitaForm = this.crearFormularioVisita();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.obtenerVisita();
  }

  crearFormularioVisita(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      fechaVisita: ['', Validators.required],
      estado: ['PENDIENTE'],
      comentarios: [''],
    });
  }

  cargarClientes(): void {
    this.authService.getClientes().subscribe({
      next: (response: any) => {
        let clientes: any[] = [];

        if (response.data && Array.isArray(response.data.clientes)) {
          clientes = response.data.clientes;
        } else if (response.data && Array.isArray(response.data)) {
          clientes = response.data;
        } else if (Array.isArray(response)) {
          clientes = response;
        } else {
          this.notificationService.showWarning('No se pudieron cargar los clientes');
          return;
        }

        this.clientes.set(clientes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        this.lotes.set(lotes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();

    return this.clientes().filter((cliente) => cliente.fullName?.toLowerCase().includes(search));
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        lote.estado?.toLowerCase().includes(search) ||
        lote.precioBase?.toString().includes(search) ||
        lote.urbanizacion?.nombre?.toLowerCase().includes(search)
    );
  }

  selectCliente(cliente: UserDto) {
    this.visitaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.visitaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(
      `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - ${lote.estado} - $${lote.precioBase}`
    );
    this.showLotesDropdown.set(false);
  }

  toggleClientesDropdown() {
    this.showClientesDropdown.set(!this.showClientesDropdown());
    if (this.showClientesDropdown()) {
      this.showLotesDropdown.set(false);
    }
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
    if (this.showLotesDropdown()) {
      this.showClientesDropdown.set(false);
    }
  }

  onClienteBlur() {
    setTimeout(() => {
      this.showClientesDropdown.set(false);
    }, 200);
  }

  onLoteBlur() {
    setTimeout(() => {
      this.showLotesDropdown.set(false);
    }, 200);
  }

  obtenerVisita(): void {
    this.visitaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.visitaId) {
      this.error.set('ID de visita no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.visitaSvc.getById(this.visitaId).subscribe({
      next: (visita: any) => {
        if (visita) {
          this.visitaData = visita;
          this.cargarDatosFormulario(visita);
        } else {
          this.error.set('No se encontró la visita');
        }
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set('No se pudo cargar la visita');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(visita: any): void {
    const clienteSeleccionado = this.clientes().find((c) => c.id === visita.clienteId);
    const loteSeleccionado = this.lotes().find((l) => l.id === visita.inmuebleId);

    const fechaVisita = new Date(visita.fechaVisita);
    const fechaFormateada = fechaVisita.toISOString().slice(0, 16);

    this.visitaForm.patchValue({
      clienteId: visita.clienteId?.toString() || '',
      inmuebleTipo: visita.inmuebleTipo || 'LOTE',
      inmuebleId: visita.inmuebleId?.toString() || '',
      fechaVisita: fechaFormateada,
      estado: visita.estado || 'PENDIENTE',
      comentarios: visita.comentarios || '',
    });

    if (clienteSeleccionado) {
      this.searchCliente.set(clienteSeleccionado.fullName || '');
    }
    if (loteSeleccionado) {
      this.searchLote.set(
        `${loteSeleccionado.numeroLote} - ${loteSeleccionado.urbanizacion?.nombre} - ${loteSeleccionado.estado} - $${loteSeleccionado.precioBase}`
      );
    }
  }

  onSubmit(): void {
    if (this.visitaForm.invalid) {
      this.visitaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.visitaId) {
      this.notificationService.showError('ID de visita no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada = {
      ...this.visitaForm.value,
      clienteId: Number(this.visitaForm.value.clienteId),
      inmuebleId: Number(this.visitaForm.value.inmuebleId),
      inmuebleTipo: 'LOTE',
    };

    this.visitaSvc.update(this.visitaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Visita actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/visitas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la visita');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la visita';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Visita no encontrada.';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/visitas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
