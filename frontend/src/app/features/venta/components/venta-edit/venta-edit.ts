import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { VentaService } from '../../service/venta.service';
import { UserService } from '../../../../core/services/users.service';
import { LoteService } from '../../../lote/service/lote.service';

@Component({
  selector: 'app-venta-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './venta-edit.html',
  providers: [DatePipe],
})
export class VentaEdit implements OnInit {
  ventaForm: FormGroup;
  ventaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  ventaData: any = null;
  clientes = signal<UserDto[]>([]);
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes();
    this.obtenerVenta();
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      asesorId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE_PAGO'],
    });
  }

  cargarClientes(): void {
    this.userSvc.getAll().subscribe({
      next: (response: any) => {
        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        const clientes = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          return rol === 'CLIENTE';
        });

        this.clientes.set(clientes);

        if (clientes.length === 0) {
          this.notificationService.showWarning('No se encontraron clientes registrados');
        }
      },
      error: (err: any) => {
        console.error('Error al cargar clientes:', err);
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAll().subscribe({
      next: (response: any) => {
        let usuarios: any[] = [];

        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          usuarios = response.data;
        } else {
          console.error('Estructura de respuesta no reconocida:', response);
          return;
        }

        const asesores = usuarios.filter((user: any) => {
          const rol = user.role?.toUpperCase();
          return rol === 'ASESOR';
        });

        this.asesores.set(asesores);

        if (asesores.length === 0) {
          this.notificationService.showWarning('No se encontraron asesores registrados');
        }
      },
      error: (err: any) => {
        console.error('Error al cargar asesores:', err);
        this.notificationService.showError('No se pudieron cargar los asesores');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        this.lotes.set(lotes);
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  obtenerVenta(): void {
    this.ventaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.ventaId) {
      this.error.set('ID de venta no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.ventaSvc.getById(this.ventaId).subscribe({
      next: (venta: any) => {
        if (venta) {
          this.ventaData = venta;
          this.cargarDatosFormulario(venta);
        } else {
          this.error.set('No se encontró la venta');
        }
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar venta:', err);
        this.error.set('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(venta: any): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
      asesorId: venta.asesorId?.toString() || '',
      inmuebleTipo: venta.inmuebleTipo || 'LOTE',
      inmuebleId: venta.inmuebleId?.toString() || '',
      precioFinal: venta.precioFinal || 0,
      estado: venta.estado || 'PENDIENTE_PAGO',
    });
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.ventaId) {
      this.notificationService.showError('ID de venta no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada = {
      ...this.ventaForm.value,
      clienteId: Number(this.ventaForm.value.clienteId),
      asesorId: Number(this.ventaForm.value.asesorId),
      inmuebleId: Number(this.ventaForm.value.inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
    };

    console.log('Datos a actualizar:', dataActualizada);

    this.ventaSvc.update(this.ventaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Venta actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/ventas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error al actualizar:', err);

        let errorMessage = 'Error al actualizar la venta';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Venta no encontrada.';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/ventas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
