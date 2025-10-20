import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UserService } from '../../../../core/services/users.service';
import { VentaService } from '../../service/venta.service';
import { LoteService } from '../../../lote/service/lote.service';

@Component({
  selector: 'app-venta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './venta-create.html',
})
export class VentaCreate implements OnInit {
  ventaForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  asesores = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private userSvc = inject(UserService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarAsesores();
    this.cargarLotes();
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
        const lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA'
        );
        this.lotes.set(lotesDisponibles);
      },
      error: (err: any) => {
        console.error('Error al cargar lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    const ventaData = {
      ...this.ventaForm.value,
      clienteId: Number(this.ventaForm.value.clienteId),
      asesorId: Number(this.ventaForm.value.asesorId),
      inmuebleId: Number(this.ventaForm.value.inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
    };

    console.log('Datos a enviar:', ventaData);

    this.ventaSvc.create(ventaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          this.notificationService.showSuccess('Venta creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/ventas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        console.error('Error completo:', err);

        let errorMessage = 'Error al crear la venta';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique los datos ingresados.';
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
    const clienteId = this.ventaForm.get('clienteId')?.value;
    if (!clienteId) return 'Sin cliente';

    const cliente = this.clientes().find((c) => c.id === Number(clienteId));
    return cliente ? cliente.fullName : 'No encontrado';
  }

  getAsesorNombre(): string {
    const asesorId = this.ventaForm.get('asesorId')?.value;
    if (!asesorId) return 'Sin asesor';

    const asesor = this.asesores().find((a) => a.id === Number(asesorId));
    return asesor ? asesor.fullName : 'No encontrado';
  }
}
