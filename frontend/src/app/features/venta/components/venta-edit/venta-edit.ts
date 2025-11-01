import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import { VentaDto, UpdateVentaDto } from '../../../../core/interfaces/venta.interface';

@Component({
  selector: 'app-venta-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './venta-edit.html',
  providers: [DatePipe],
})
export class VentaEdit implements OnInit {
  ventaForm: FormGroup;
  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  ventaData = signal<VentaDto | null>(null);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);

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
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
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

    return this.clientes().filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search))
    );
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search)
    );
  }

  selectCliente(cliente: UserDto) {
    this.ventaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.ventaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(`${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${lote.precioBase}`);
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

  obtenerVenta(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de venta no válido');
      this.cargando.set(false);
      return;
    }

    this.ventaId.set(id);
    this.cargando.set(true);

    this.ventaSvc.getById(id).subscribe({
      next: (venta: VentaDto) => {
        if (venta) {
          this.ventaData.set(venta);
          this.cargarDatosFormulario(venta);
          this.setupSearchValues(venta);
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

  cargarDatosFormulario(venta: VentaDto): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
      inmuebleId: venta.inmuebleId?.toString() || '',
      precioFinal: venta.precioFinal || 0,
      estado: venta.estado || 'PENDIENTE',
    });
  }

  setupSearchValues(venta: VentaDto): void {
    const cliente = this.clientes().find((c) => c.id === venta.clienteId);
    if (cliente) {
      this.searchCliente.set(cliente.fullName || '');
    }

    const lote = this.lotes().find((l) => l.id === venta.inmuebleId);
    if (lote) {
      this.searchLote.set(
        `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${lote.precioBase}`
      );
    }
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

    const id = this.ventaId();
    if (!id) {
      this.notificationService.showError('ID de venta no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada: UpdateVentaDto = {
      clienteId: Number(this.ventaForm.value.clienteId),
      inmuebleId: Number(this.ventaForm.value.inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
      estado: this.ventaForm.value.estado,
    };

    this.ventaSvc.update(id, dataActualizada).subscribe({
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

  getVentaData() {
    return this.ventaData();
  }

  getPlanPago() {
    return this.ventaData()?.planPago;
  }

  tienePlanPago(): boolean {
    return !!this.ventaData()?.planPago;
  }

  getTotalPagado(): number {
    const planPago = this.getPlanPago();
    if (!planPago) return 0;
    return planPago.total_pagado || 0;
  }

  getSaldoPendiente(): number {
    const planPago = this.getPlanPago();
    if (!planPago) return 0;
    return planPago.saldo_pendiente || Math.max(0, planPago.total - this.getTotalPagado());
  }

  getPorcentajePagado(): number {
    const planPago = this.getPlanPago();
    if (!planPago || planPago.total === 0) return 0;
    return planPago.porcentaje_pagado || (this.getTotalPagado() / planPago.total) * 100;
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
