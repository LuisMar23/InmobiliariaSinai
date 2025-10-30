import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';

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
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.obtenerVenta();
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE_PAGO'],
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

        if (clientes.length === 0) {
          this.notificationService.showWarning('No se encontraron clientes registrados');
        }
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
        this.error.set('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(venta: any): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
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
      clienteId: Number(this.ventaForm.value.clienteId),
      inmuebleTipo: this.ventaForm.value.inmuebleTipo,
      inmuebleId: Number(this.ventaForm.value.inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
      estado: this.ventaForm.value.estado,
    };

    this.ventaSvc.update(this.ventaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
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

  getClienteNombre(): string {
    const clienteId = this.ventaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cambios';
    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'Nuevo cliente';
  }

  getLoteNombre(): string {
    const loteId = this.ventaForm.get('inmuebleId')?.value;
    if (!loteId) return 'Sin cambios';
    const lote = this.lotes().find((l) => l.id === Number(loteId));
    return lote ? lote.numeroLote : 'Nuevo lote';
  }
}
