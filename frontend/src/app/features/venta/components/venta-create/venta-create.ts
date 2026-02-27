import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { PropiedadService } from '../../../propiedad/service/propiedad.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import { VentaDto } from '../../../../core/interfaces/venta.interface';
import { AnticipoPdfService } from '../../../../core/services/pdf-anticipo.service';

@Component({
  selector: 'app-venta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './venta-create.html',
})
export class VentaCreate implements OnInit {
  ventaForm: FormGroup;
  planPagoForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  propiedades = signal<PropiedadDto[]>([]);
  cajas = signal<Caja[]>([]);
  fechaVencimientoCalculada = signal<string>('');
  mostrarModalPdf = signal<boolean>(false);
  ventaCreada = signal<VentaDto | null>(null);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  searchPropiedad = signal<string>('');
  searchCaja = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  showPropiedadesDropdown = signal<boolean>(false);
  showCajasDropdown = signal<boolean>(false);

  inmuebleTipoSeleccionado = signal<string>('LOTE');

  authService = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private propiedadSvc = inject(PropiedadService);
  private notificationService = inject(NotificationService);
  private anticipoPdfService = inject(AnticipoPdfService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.planPagoForm = this.crearPlanPagoForm();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.cargarPropiedades();
    this.cargarCajasActivas();
    this.setupFormListeners();
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      cajaId: ['', Validators.required],
      estado: ['PENDIENTE'],
      observaciones: [''],
    });
  }

  crearPlanPagoForm(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];

    return this.fb.group({
      monto_inicial: [0, [Validators.required, Validators.min(0)]],
      plazo: ['', [Validators.required, Validators.min(1)]],
      periodicidad: ['', Validators.required],
      fecha_inicio: [fechaHoy, Validators.required],
    });
  }

  setupFormListeners(): void {
    this.ventaForm.get('precioFinal')?.valueChanges.subscribe(() => {
      this.onPrecioFinalChange();
    });

    this.planPagoForm.get('fecha_inicio')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    this.planPagoForm.get('plazo')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    this.planPagoForm.get('periodicidad')?.valueChanges.subscribe(() => {
      this.calcularFechaVencimiento();
    });

    this.ventaForm.get('inmuebleTipo')?.valueChanges.subscribe((tipo) => {
      this.inmuebleTipoSeleccionado.set(tipo);
      this.ventaForm.patchValue({ inmuebleId: '', precioFinal: 0 });
      this.searchLote.set('');
      this.searchPropiedad.set('');
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
        } else if (response.success && response.data) {
          clientes = response.data.clientes || response.data.users || response.data || [];
        }

        this.clientes.set(clientes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    const currentUser = this.authService.getCurrentUser();

    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        const lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA',
        );

        const lotesFiltrados = lotesDisponibles.filter(
          (lote) => lote.encargadoId === currentUser?.id,
        );

        this.lotes.set(lotesFiltrados);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  cargarPropiedades(): void {
    const currentUser = this.authService.getCurrentUser();

    this.propiedadSvc.getAll().subscribe({
      next: (propiedades: PropiedadDto[]) => {
        const propiedadesParaVenta = propiedades.filter(
          (propiedad) =>
            propiedad.estadoPropiedad === 'VENTA' &&
            (propiedad.tipo === 'CASA' || propiedad.tipo === 'DEPARTAMENTO') &&
            (propiedad.estado === 'DISPONIBLE' || propiedad.estado === 'CON_OFERTA') &&
            propiedad.encargadoId === currentUser?.id,
        );

        this.propiedades.set(propiedadesParaVenta);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar las propiedades');
      },
    });
  }

  cargarCajasActivas(): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas: Caja[]) => {
        this.cajas.set(cajas);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar las cajas activas');
      },
    });
  }

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();

    return this.clientes().filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search)) ||
        (cliente.email && cliente.email.toLowerCase().includes(search)),
    );
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search),
    );
  }

  filteredPropiedades() {
    const search = this.searchPropiedad().toLowerCase();
    if (!search) return this.propiedades();

    return this.propiedades().filter(
      (propiedad) =>
        propiedad.nombre?.toLowerCase().includes(search) ||
        propiedad.ubicacion?.toLowerCase().includes(search) ||
        propiedad.ciudad?.toLowerCase().includes(search) ||
        propiedad.tipo?.toLowerCase().includes(search) ||
        propiedad.precio?.toString().includes(search),
    );
  }

  filteredCajas() {
    const search = this.searchCaja().toLowerCase();
    if (!search) return this.cajas();

    return this.cajas().filter(
      (caja) =>
        caja.nombre?.toLowerCase().includes(search) ||
        caja.usuarioApertura?.fullName?.toLowerCase().includes(search),
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
      precioFinal: lote.precioBase,
    });
    this.searchLote.set(this.getLoteDisplayText(lote));
    this.showLotesDropdown.set(false);
  }

  selectPropiedad(propiedad: PropiedadDto) {
    this.ventaForm.patchValue({
      inmuebleId: propiedad.id.toString(),
      precioFinal: propiedad.precio,
    });
    this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
    this.showPropiedadesDropdown.set(false);
  }

  selectCaja(caja: Caja) {
    this.ventaForm.patchValue({
      cajaId: caja.id.toString(),
    });
    this.searchCaja.set(this.getCajaDisplayText(caja));
    this.showCajasDropdown.set(false);
  }

  getLoteDisplayText(lote: LoteDto): string {
    return `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatNumber(
      lote.precioBase,
    )}`;
  }

  getPropiedadDisplayText(propiedad: PropiedadDto): string {
    return `${propiedad.nombre} - ${propiedad.tipo} - ${propiedad.ubicacion} - $${this.formatNumber(
      propiedad.precio,
    )}`;
  }

  getCajaDisplayText(caja: Caja): string {
    return `${caja.nombre} - ${caja.usuarioApertura?.fullName} - $${this.formatNumber(
      caja.saldoActual,
    )}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-BO');
  }

  toggleClientesDropdown() {
    this.showClientesDropdown.set(!this.showClientesDropdown());
    if (this.showClientesDropdown()) {
      this.showLotesDropdown.set(false);
      this.showPropiedadesDropdown.set(false);
      this.showCajasDropdown.set(false);
    }
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
    if (this.showLotesDropdown()) {
      this.showClientesDropdown.set(false);
      this.showPropiedadesDropdown.set(false);
      this.showCajasDropdown.set(false);
    }
  }

  togglePropiedadesDropdown() {
    this.showPropiedadesDropdown.set(!this.showPropiedadesDropdown());
    if (this.showPropiedadesDropdown()) {
      this.showClientesDropdown.set(false);
      this.showLotesDropdown.set(false);
      this.showCajasDropdown.set(false);
    }
  }

  toggleCajasDropdown() {
    this.showCajasDropdown.set(!this.showCajasDropdown());
    if (this.showCajasDropdown()) {
      this.showClientesDropdown.set(false);
      this.showLotesDropdown.set(false);
      this.showPropiedadesDropdown.set(false);
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

  onPropiedadBlur() {
    setTimeout(() => {
      this.showPropiedadesDropdown.set(false);
    }, 200);
  }

  onCajaBlur() {
    setTimeout(() => {
      this.showCajasDropdown.set(false);
    }, 200);
  }

  onPrecioFinalChange(): void {
    const precioFinal = this.ventaForm.get('precioFinal')?.value || 0;
    const montoInicial = this.planPagoForm.get('monto_inicial')?.value || 0;
    if (montoInicial > precioFinal) {
      this.planPagoForm.get('monto_inicial')?.setValue(precioFinal);
    }
  }

  calcularFechaVencimiento(): void {
    const fechaInicio = this.planPagoForm.get('fecha_inicio')?.value;
    const plazo = this.planPagoForm.get('plazo')?.value;
    const periodicidad = this.planPagoForm.get('periodicidad')?.value;

    if (fechaInicio && plazo && periodicidad) {
      const fecha = new Date(fechaInicio);
      switch (periodicidad) {
        case 'DIAS':
          fecha.setDate(fecha.getDate() + Number(plazo));
          break;
        case 'SEMANAS':
          fecha.setDate(fecha.getDate() + Number(plazo) * 7);
          break;
        case 'MESES':
          fecha.setMonth(fecha.getMonth() + Number(plazo));
          break;
      }
      this.fechaVencimientoCalculada.set(fecha.toISOString().split('T')[0]);
    } else {
      this.fechaVencimientoCalculada.set('');
    }
  }

  getMontoMaximoInicial(): number {
    return this.ventaForm.get('precioFinal')?.value || 0;
  }

  getSaldoFinanciar(): number {
    const precioFinal = this.ventaForm.get('precioFinal')?.value || 0;
    const montoInicial = this.planPagoForm.get('monto_inicial')?.value || 0;
    return Math.max(0, precioFinal - montoInicial);
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (this.planPagoForm.invalid) {
      this.planPagoForm.markAllAsTouched();
      this.notificationService.showError(
        'Complete todos los campos del plan de pago correctamente.',
      );
      return;
    }

    const clienteId = this.ventaForm.get('clienteId')?.value;
    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;
    const cajaId = this.ventaForm.get('cajaId')?.value;
    const inmuebleTipo = this.ventaForm.get('inmuebleTipo')?.value;

    if (!clienteId || !inmuebleId || !cajaId || !inmuebleTipo) {
      this.notificationService.showError('Debe seleccionar un cliente, un inmueble y una caja');
      return;
    }

    this.enviando.set(true);

    const ventaData: any = {
      clienteId: Number(clienteId),
      inmuebleTipo: inmuebleTipo,
      inmuebleId: Number(inmuebleId),
      precioFinal: Number(this.ventaForm.value.precioFinal),
      cajaId: Number(cajaId),
      estado: this.ventaForm.value.estado,
      observaciones: this.ventaForm.value.observaciones,
      plan_pago: {
        monto_inicial: Number(this.planPagoForm.value.monto_inicial),
        plazo: Number(this.planPagoForm.value.plazo),
        periodicidad: this.planPagoForm.value.periodicidad,
        fecha_inicio: this.planPagoForm.value.fecha_inicio,
      },
    };
    if (inmuebleTipo === 'LOTE') {
      ventaData.loteId = Number(inmuebleId);
      ventaData.propiedadId = null;
    } else if (inmuebleTipo === 'PROPIEDAD') {
      ventaData.propiedadId = Number(inmuebleId);
      ventaData.loteId = null;
    }
    this.ventaSvc.create(ventaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Venta creada exitosamente!');
          if (response.data) {
            this.ventaCreada.set(response.data);
            // CORRECCIÓN: Solo mostrar modal de PDF si es un LOTE
            if (inmuebleTipo === 'LOTE') {
              this.mostrarModalPdf.set(true);
            } else {
              setTimeout(() => {
                this.router.navigate(['/ventas/lista']);
              }, 1000);
            }
          } else {
            setTimeout(() => {
              this.router.navigate(['/ventas/lista']);
            }, 1000);
          }
        } else {
          this.notificationService.showError(response.message || 'Error al crear la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la venta';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para crear ventas';
        } else if (err.status === 404) {
          errorMessage = 'Cliente, inmueble o caja no encontrado';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  descargarAnticipo(): void {
    const venta = this.ventaCreada();
    if (venta) {
      this.anticipoPdfService.generarAnticipoPdf(venta);
    }
  }

  cerrarModalYRedirigir(): void {
    this.mostrarModalPdf.set(false);
    this.router.navigate(['/ventas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getPeriodicidadTexto(): string {
    const periodicidad = this.planPagoForm.get('periodicidad')?.value;
    switch (periodicidad) {
      case 'DIAS':
        return 'días';
      case 'SEMANAS':
        return 'semanas';
      case 'MESES':
        return 'meses';
      default:
        return '';
    }
  }
}
