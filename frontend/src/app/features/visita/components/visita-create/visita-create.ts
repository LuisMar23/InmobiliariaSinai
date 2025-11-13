import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { VisitaService } from '../../service/visita.service';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';

@Component({
  selector: 'app-visita-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './visita-create.html',
})
export class VisitaCreate implements OnInit {
  visitaForm: FormGroup;
  enviando = signal<boolean>(false);
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
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  constructor() {
    this.visitaForm = this.crearFormularioVisita();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
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

  onSubmit(): void {
    if (this.visitaForm.invalid) {
      this.visitaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    const visitaData = {
      ...this.visitaForm.value,
      clienteId: Number(this.visitaForm.value.clienteId),
      inmuebleId: Number(this.visitaForm.value.inmuebleId),
      inmuebleTipo: 'LOTE',
    };

    this.visitaSvc.create(visitaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Visita creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/visitas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la visita');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la visita';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage =
            'No tienes permisos para crear visitas. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA';
        } else if (err.status === 404) {
          errorMessage = 'Cliente o lote no encontrado';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getClienteNombre(): string {
    const clienteId = this.visitaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cliente';

    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'No encontrado';
  }
}
