import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faTrash,
  faSearch,
  faUser,
  faEnvelope,
  faUserCircle,
  faUserTimes,
  faUsers,
  faUserEdit,
  faPhone,
  faMapMarkerAlt,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { ClientesService } from '../../service/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './cliente-list.html',
})
export class ClientesListComponent implements OnInit {
  faEdit = faEdit;
  faTrash = faTrash;
  faSearch = faSearch;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faUserCircle = faUserCircle;
  faUserTimes = faUserTimes;
  faUsers = faUsers;
  faUserEdit = faUserEdit;
  faPhone = faPhone;
  faMapMarkerAlt = faMapMarkerAlt;
  faPlus = faPlus;

  // USANDO SIGNALS COMO URBANIZACIÓN
  clientes = signal<any[]>([]);
  allClientes = signal<any[]>([]);
  searchTerm = signal('');
  isLoading = signal(false);

  // Columnas para ordenamiento
  columns = [
    { key: 'fullName', label: 'Cliente', sortable: true },
    { key: 'ci', label: 'CI', sortable: true },
    { key: 'telefono', label: 'Teléfono', sortable: true },
    { key: 'direccion', label: 'Dirección', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  // Señales para ordenamiento
  sortColumn = signal<string>('fullName');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Computed para búsqueda y ordenamiento - IGUAL QUE URBANIZACIÓN
  filteredClientes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let clientes = this.allClientes();

    // Aplicar filtro de búsqueda
    if (term) {
      clientes = clientes.filter(
        (cliente: any) =>
          cliente.fullName?.toLowerCase().includes(term) ||
          cliente.ci?.toLowerCase().includes(term) ||
          cliente.telefono?.toLowerCase().includes(term)
      );
    }

    // Aplicar ordenamiento
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return clientes;

    return [...clientes].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Manejar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Ordenar por texto
      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  // Paginación
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private clientesService = inject(ClientesService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);

  // CONSTRUCTOR CON CARGA INMEDIATA - IGUAL QUE URBANIZACIÓN
  constructor() {
    this.loadClientes();
  }

  ngOnInit() {
    // Recargar cuando cambie la ruta
    this.route.url.subscribe(() => {
      this.loadClientes();
    });
  }

  // CARGA DIRECTA EN CONSTRUCTOR - IGUAL QUE URBANIZACIÓN
  loadClientes() {
    this.isLoading.set(true);
    this.clientesService.getClientes().subscribe({
      next: (response: any) => {
        this.isLoading.set(false);

        if (response.success && response.data && Array.isArray(response.data.clientes)) {
          this.allClientes.set(response.data.clientes);
          this.total.set(response.data.clientes.length);
        } else {
          this.allClientes.set([]);
          this.total.set(0);
        }

        this.clientes.set([...this.allClientes()]);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.notificationService.showError('Error al cargar los clientes');
        this.allClientes.set([]);
        this.clientes.set([]);
        this.total.set(0);
      },
    });
  }

  // Ordenamiento
  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  // Método para obtener clase de flecha
  getClaseFlecha(columna: string): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  deleteCliente(cliente: any) {
    this.notificationService
      .confirmDelete(`¿Estás seguro de eliminar al cliente ${cliente.fullName}?`)
      .then((result) => {
        if (result.isConfirmed) {
          this.clientesService.delete(cliente.id).subscribe({
            next: (response: any) => {
              this.notificationService.showSuccess(
                response.message || 'Cliente eliminado correctamente'
              );
              this.loadClientes();
            },
            error: (err: any) => {
              this.notificationService.showError('Error al eliminar el cliente');
            },
          });
        }
      });
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700'
      : 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700';
  }

  // Paginación
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }

  getClientesPaginados(): any[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredClientes().slice(startIndex, endIndex);
  }
}
