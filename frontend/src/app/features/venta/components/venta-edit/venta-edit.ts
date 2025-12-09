import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { PropiedadService } from '../../../propiedad/service/propiedad.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import {
  VentaDto,
  UpdateVentaDto,
  RegistrarPagoDto,
} from '../../../../core/interfaces/venta.interface';

@Component({
  selector: 'app-venta-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './venta-edit.html',
  providers: [DatePipe],
})
export class VentaEdit implements OnInit {
  ventaForm: FormGroup;
  pagoForm: FormGroup;
  montoInicialForm: FormGroup;

  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);
  enviandoEditarPago = signal<boolean>(false);
  enviandoMontoInicial = signal<boolean>(false);
  ventaData = signal<VentaDto | null>(null);

  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  propiedades = signal<PropiedadDto[]>([]);
  cajasActivas = signal<Caja[]>([]);

  mostrarFormPago = signal<boolean>(false);
  mostrarFormEditarPago = signal<boolean>(false);
  mostrarFormMontoInicial = signal<boolean>(false);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  searchPropiedad = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  showPropiedadesDropdown = signal<boolean>(false);

  pagoSeleccionado = signal<any>(null);

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 6;
  archivosCargando = signal<boolean>(false);

  recibosVenta = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  filteredClientes = computed(() => {
    const search = this.searchCliente().toLowerCase();
    const clientes = this.clientes();
    if (!search) return clientes;
    return clientes.filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search)) ||
        (cliente.email && cliente.email.toLowerCase().includes(search))
    );
  });

  filteredLotes = computed(() => {
    const search = this.searchLote().toLowerCase();
    const lotes = this.lotes();
    if (!search) return lotes;
    return lotes.filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search)
    );
  });

  filteredPropiedades = computed(() => {
    const search = this.searchPropiedad().toLowerCase();
    const propiedades = this.propiedades();
    if (!search) return propiedades;
    return propiedades.filter(
      (propiedad) =>
        propiedad.nombre?.toLowerCase().includes(search) ||
        propiedad.ubicacion?.toLowerCase().includes(search) ||
        propiedad.ciudad?.toLowerCase().includes(search) ||
        propiedad.tipo?.toLowerCase().includes(search) ||
        propiedad.precio?.toString().includes(search)
    );
  });

  tienePlanPago = computed(() => {
    const venta = this.ventaData();
    return !!venta?.planPago;
  });

  totalPagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
      return Number(planPago.total_pagado);
    }
    if (planPago.pagos && Array.isArray(planPago.pagos)) {
      return planPago.pagos.reduce((sum: number, pago: any) => sum + Number(pago.monto || 0), 0);
    }
    return 0;
  });

  saldoPendiente = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.saldo_pendiente !== undefined && planPago.saldo_pendiente !== null) {
      return Number(planPago.saldo_pendiente);
    }
    const total = Number(planPago.total || 0);
    return Math.max(0, total - this.totalPagado());
  });

  porcentajePagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.porcentaje_pagado !== undefined && planPago.porcentaje_pagado !== null) {
      return Number(planPago.porcentaje_pagado);
    }
    const total = Number(planPago.total || 0);
    if (total === 0) return 0;
    return (this.totalPagado() / total) * 100;
  });

  montoMaximoPago = computed(() => {
    return this.saldoPendiente();
  });

  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private propiedadSvc = inject(PropiedadService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  private reciboSvc = inject(ReciboService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.pagoForm = this.crearPagoForm();
    this.montoInicialForm = this.crearMontoInicialForm();
  }

  ngOnInit(): void {
    this.obtenerVenta();
    this.cargarCajasActivas();
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
      observaciones: [''],
    });
  }

  crearPagoForm(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    return this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha_pago: [fechaHoy, Validators.required],
      observacion: [''],
      metodoPago: ['EFECTIVO', Validators.required],
    });
  }

  crearMontoInicialForm(): FormGroup {
    return this.fb.group({
      nuevoMontoInicial: [0, [Validators.required, Validators.min(0)]],
      cajaId: ['', Validators.required],
    });
  }

  cargarCajasActivas(): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        this.cajasActivas.set(cajas);
      },
      error: (err) => {
        console.error('Error cargando cajas activas:', err);
      },
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
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando clientes:', err);
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        this.lotes.set(lotes);
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  cargarPropiedades(): void {
    this.propiedadSvc.getAll().subscribe({
      next: (propiedades: PropiedadDto[]) => {
        const propiedadesParaVenta = propiedades.filter(
          (propiedad) =>
            propiedad.estadoPropiedad === 'VENTA' &&
            (propiedad.tipo === 'CASA' || propiedad.tipo === 'DEPARTAMENTO')
        );
        this.propiedades.set(propiedadesParaVenta);
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando propiedades:', err);
        this.notificationService.showError('No se pudieron cargar las propiedades');
      },
    });
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
    this.searchLote.set(this.getLoteDisplayText(lote));
    this.showLotesDropdown.set(false);
  }

  selectPropiedad(propiedad: PropiedadDto) {
    this.ventaForm.patchValue({
      inmuebleId: propiedad.id.toString(),
    });
    this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
    this.showPropiedadesDropdown.set(false);
  }

  getLoteDisplayText(lote: LoteDto): string {
    return `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatNumber(
      lote.precioBase
    )}`;
  }

  getPropiedadDisplayText(propiedad: PropiedadDto): string {
    return `${propiedad.nombre} - ${propiedad.tipo} - ${propiedad.ubicacion} - $${this.formatNumber(
      propiedad.precio
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
    }
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
    if (this.showLotesDropdown()) {
      this.showClientesDropdown.set(false);
      this.showPropiedadesDropdown.set(false);
    }
  }

  togglePropiedadesDropdown() {
    this.showPropiedadesDropdown.set(!this.showPropiedadesDropdown());
    if (this.showPropiedadesDropdown()) {
      this.showClientesDropdown.set(false);
      this.showLotesDropdown.set(false);
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
          this.cargarClientes();
          this.cargarLotes();
          this.cargarPropiedades();
          this.cargarRecibosVenta(id);
        } else {
          this.error.set('No se encontró la venta');
          this.cargando.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error obteniendo venta:', err);
        this.error.set('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(venta: VentaDto): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
      inmuebleTipo: venta.inmuebleTipo || 'LOTE',
      inmuebleId: venta.inmuebleId?.toString() || '',
      precioFinal: venta.precioFinal || 0,
      estado: venta.estado || 'PENDIENTE',
      observaciones: venta.observaciones || '',
    });
    this.cargando.set(false);
  }

  setupSearchValues(venta: VentaDto): void {
    const cliente = this.clientes().find((c) => c.id === venta.clienteId);
    if (cliente) {
      this.searchCliente.set(cliente.fullName || '');
    }

    if (venta.inmuebleTipo === 'LOTE') {
      const lote = this.lotes().find((l) => l.id === venta.inmuebleId);
      if (lote) {
        this.searchLote.set(this.getLoteDisplayText(lote));
      }
    } else if (venta.inmuebleTipo === 'PROPIEDAD') {
      const propiedad = this.propiedades().find((p) => p.id === venta.inmuebleId);
      if (propiedad) {
        this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
      }
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onFileChange(event: any) {
    const files: FileList | null = event.target.files;
    if (files) {
      const nuevosArchivos = Array.from(files);
      const archivosActuales = this.archivosSeleccionados();
      const archivosFinales = [...archivosActuales, ...nuevosArchivos];

      if (archivosFinales.length > this.maxArchivos) {
        this.notificationService.showError(
          `Solo puedes subir un máximo de ${this.maxArchivos} archivos.`
        );
        return;
      }

      this.archivosSeleccionados.set(archivosFinales);
    }
  }

  eliminarArchivo(index: number) {
    const archivosActuales = this.archivosSeleccionados();
    archivosActuales.splice(index, 1);
    this.archivosSeleccionados.set([...archivosActuales]);
  }

  subirArchivos() {
    if (this.archivosSeleccionados().length === 0) {
      this.notificationService.showError('No hay archivos seleccionados para subir.');
      return;
    }

    const ventaId = this.ventaId();
    if (!ventaId) {
      this.notificationService.showError('No se puede subir archivos: ID de venta no disponible.');
      return;
    }

    this.archivosCargando.set(true);

    const usuarioId = this.authService.getCurrentUser()?.id;
    if (!usuarioId) {
      this.notificationService.showError('No se pudo obtener el usuario autenticado.');
      this.archivosCargando.set(false);
      return;
    }

    this.reciboSvc
      .subirRecibosGenerales(this.archivosSeleccionados(), {
        tipoOperacion: 'VENTA',
        ventaId: ventaId,
        observaciones: 'Subido desde edición de venta',
      })
      .subscribe({
        next: (response) => {
          this.archivosCargando.set(false);
          this.notificationService.showSuccess('Archivos subidos exitosamente.');
          this.archivosSeleccionados.set([]);
          this.cargarRecibosVenta(ventaId);
        },
        error: (error) => {
          this.archivosCargando.set(false);
          this.notificationService.showError(
            'Error al subir los archivos: ' + (error?.error?.message || 'Error desconocido')
          );
        },
      });
  }

  cargarRecibosVenta(ventaId: number): void {
    this.recibosCargando.set(true);
    this.reciboSvc.obtenerPorVenta(ventaId).subscribe({
      next: (recibos) => {
        this.recibosVenta.set(recibos);
        this.recibosCargando.set(false);
      },
      error: (err) => {
        this.notificationService.showError('No se pudieron cargar los recibos de la venta');
        this.recibosCargando.set(false);
      },
    });
  }

  descargarRecibo(recibo: Recibo) {
    this.reciboSvc.descargarRecibo(recibo);
  }

  eliminarRecibo(recibo: Recibo) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este archivo?')
      .then((result) => {
        if (result.isConfirmed) {
          this.reciboSvc.eliminarRecibo(recibo.id).subscribe({
            next: () => {
              this.notificationService.showSuccess('Archivo eliminado exitosamente.');
              const ventaId = this.ventaId();
              if (ventaId) {
                this.cargarRecibosVenta(ventaId);
              }
            },
            error: (err) => {
              this.notificationService.showError('No se pudo eliminar el archivo.');
            },
          });
        }
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  editarPago(pago: any): void {
    this.pagoSeleccionado.set(pago);
    this.mostrarFormEditarPago.set(true);
    this.mostrarFormPago.set(false);

    const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago) : new Date();
    const fechaFormateada = fechaPago.toISOString().split('T')[0];

    this.pagoForm.patchValue({
      monto: pago.monto,
      fecha_pago: fechaFormateada,
      observacion: pago.observacion || '',
      metodoPago: pago.metodoPago || 'EFECTIVO',
    });
  }

  actualizarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const pagoId = this.pagoSeleccionado()?.id_pago_plan;
    if (!pagoId) {
      this.notificationService.showError('No se ha seleccionado un pago para editar.');
      return;
    }

    this.enviandoEditarPago.set(true);
    const updateData = {
      monto: Number(this.pagoForm.value.monto),
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion,
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.actualizarPagoPlan(pagoId, updateData).subscribe({
      next: (response: any) => {
        this.enviandoEditarPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago actualizado exitosamente!');
          this.cancelarEdicionPago();
          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoEditarPago.set(false);
        console.error('Error al actualizar pago:', err);
        let errorMessage = 'Error al actualizar el pago';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos para el pago. Verifique la fecha.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarPago(pago: any): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operación');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Está seguro que desea eliminar este pago?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.eliminarPagoPlan(pago.id_pago_plan, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Pago eliminado exitosamente!');
                    this.obtenerVenta();
                  } else {
                    this.notificationService.showError(
                      response.message || 'Error al eliminar el pago'
                    );
                  }
                },
                error: (err: any) => {
                  console.error('Error al eliminar pago:', err);
                  this.notificationService.showError('Error al eliminar el pago');
                },
              });
            }
          });
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  editarMontoInicial(): void {
    const venta = this.ventaData();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    this.montoInicialForm.patchValue({
      nuevoMontoInicial: venta.planPago?.monto_inicial || 0,
      cajaId: this.cajasActivas()[0]?.id?.toString() || '',
    });

    this.mostrarFormMontoInicial.set(true);
  }

  actualizarMontoInicial(): void {
    if (this.montoInicialForm.invalid) {
      this.montoInicialForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos correctamente.');
      return;
    }

    const ventaId = this.ventaId();
    if (!ventaId) {
      this.notificationService.showError('ID de venta no válido.');
      return;
    }

    const nuevoMontoInicial = Number(this.montoInicialForm.value.nuevoMontoInicial);
    const cajaId = Number(this.montoInicialForm.value.cajaId);

    if (nuevoMontoInicial < 0) {
      this.notificationService.showError('El monto inicial no puede ser negativo.');
      return;
    }

    const precioFinal = this.ventaData()?.precioFinal || 0;
    if (nuevoMontoInicial > precioFinal) {
      this.notificationService.showError('El monto inicial no puede ser mayor al precio final.');
      return;
    }

    this.enviandoMontoInicial.set(true);

    this.ventaSvc.actualizarMontoInicialPlanPago(ventaId, nuevoMontoInicial, cajaId).subscribe({
      next: (response: any) => {
        this.enviandoMontoInicial.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Monto inicial actualizado exitosamente!');
          this.mostrarFormMontoInicial.set(false);
          this.obtenerVenta();
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar el monto inicial'
          );
        }
      },
      error: (err: any) => {
        this.enviandoMontoInicial.set(false);
        console.error('Error al actualizar monto inicial:', err);
        let errorMessage = 'Error al actualizar el monto inicial';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos para el monto inicial.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  cancelarEdicionMontoInicial(): void {
    this.mostrarFormMontoInicial.set(false);
    this.montoInicialForm.reset();
  }

  registrarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const venta = this.ventaData();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    const monto = Number(this.pagoForm.value.monto);
    const saldoPendiente = this.saldoPendiente();

    if (monto <= 0) {
      this.notificationService.showError('El monto debe ser mayor a cero.');
      return;
    }

    if (monto > saldoPendiente) {
      this.notificationService.showError(
        `El monto no puede ser mayor al saldo pendiente (${this.formatPrecio(saldoPendiente)})`
      );
      return;
    }

    const fechaPago = new Date(this.pagoForm.value.fecha_pago);
    const hoy = new Date();
    const maxFechaPermitida = new Date(hoy);
    maxFechaPermitida.setDate(maxFechaPermitida.getDate() + 90);

    if (fechaPago > maxFechaPermitida) {
      this.notificationService.showError(
        'La fecha de pago no puede ser más de 90 días en el futuro'
      );
      return;
    }

    this.enviandoPago.set(true);
    const pagoData: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago!,
      monto: monto,
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion || '',
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.enviandoPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado exitosamente!');
          this.cancelarEdicionPago();
          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoPago.set(false);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos para el pago. Verifique la fecha.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  cancelarEdicionPago(): void {
    this.mostrarFormPago.set(false);
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    this.pagoForm.patchValue({
      fecha_pago: fechaHoy,
      metodoPago: 'EFECTIVO',
      monto: 0,
      observacion: '',
    });
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    if (this.mostrarFormPago()) {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];
      this.pagoForm.patchValue({
        fecha_pago: fechaHoy,
        metodoPago: 'EFECTIVO',
        monto: 0,
        observacion: '',
      });
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
    const clienteId = this.ventaForm.get('clienteId')?.value;
    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;
    const inmuebleTipo = this.ventaForm.get('inmuebleTipo')?.value;
    if (!clienteId || !inmuebleId || !inmuebleTipo) {
      this.notificationService.showError('Debe seleccionar un cliente y un inmueble');
      return;
    }
    this.enviando.set(true);
    const ventaActual = this.ventaData();
    const dataActualizada: UpdateVentaDto = {};
    if (Number(clienteId) !== ventaActual?.clienteId) {
      dataActualizada.clienteId = Number(clienteId);
    }
    if (
      Number(inmuebleId) !== ventaActual?.inmuebleId ||
      inmuebleTipo !== ventaActual?.inmuebleTipo
    ) {
      dataActualizada.inmuebleTipo = inmuebleTipo;
      dataActualizada.inmuebleId = Number(inmuebleId);
    }
    if (Number(this.ventaForm.value.precioFinal) !== ventaActual?.precioFinal) {
      dataActualizada.precioFinal = Number(this.ventaForm.value.precioFinal);
    }
    if (this.ventaForm.value.estado !== ventaActual?.estado) {
      dataActualizada.estado = this.ventaForm.value.estado;
    }
    if (this.ventaForm.value.observaciones !== ventaActual?.observaciones) {
      dataActualizada.observaciones = this.ventaForm.value.observaciones;
    }
    if (Object.keys(dataActualizada).length === 0) {
      this.notificationService.showInfo('No se detectaron cambios para actualizar.');
      this.enviando.set(false);
      return;
    }
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
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarVenta(): void {
    const id = this.ventaId();
    if (!id) return;

    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operación');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Está seguro que desea eliminar esta venta?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.delete(id, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Venta eliminada correctamente');
                    this.router.navigate(['/ventas/lista']);
                  } else {
                    this.notificationService.showError(
                      response.message || 'Error al eliminar la venta'
                    );
                  }
                },
                error: (err) => {
                  console.error('Error al eliminar venta:', err);
                  let errorMessage = 'No se pudo eliminar la venta';
                  if (err.status === 400) {
                    errorMessage =
                      err.error?.message ||
                      'No se puede eliminar la venta porque tiene documentos asociados';
                  } else if (err.status === 404) {
                    errorMessage = 'Venta no encontrada';
                  } else if (err.error?.message) {
                    errorMessage = err.error.message;
                  }
                  this.notificationService.showError(errorMessage);
                },
              });
            }
          });
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
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

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado] || classes['PENDIENTE'];
  }

  getEstadoPlanPagoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      ACTIVO: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      MOROSO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
    };
    return classes[estado] || classes['ACTIVO'];
  }
}
