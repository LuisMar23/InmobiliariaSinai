import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHome,
  faUsers,
  faCity,
  faMapMarkedAlt,
  faFileInvoiceDollar,
  faReceipt,
  faCalendarCheck,
  faEye,
  faHeadset,
  faChartLine,
  faMoneyBillWave,
  faFileAlt,
  faHistory,
  faCog,
  faBars,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faSun,
  faMoon,
  faTimes,
  faTachometerAlt,
  faDollarSign,
  faChartBar,
  faHandHoldingUsd,
  faClipboardList,
  faBuilding,
  faHomeUser,
  faTag,
  faCashRegister,
  faHouse,
  faShieldAlt,
  faUsersCog,
  faChevronDown,
  faChevronUp,
  faTree,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { PermisosStateService } from '../../../core/services/permisosState.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar implements OnInit {
  faTimes = faTimes;
  faBars = faBars;
  faChevronLeft = faChevronLeft;
  faUsers = faUsers;
  faTachometerAlt = faTachometerAlt;
  faCity = faCity;
  faMapMarkedAlt = faMapMarkedAlt;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faReceipt = faReceipt;
  faCalendarCheck = faCalendarCheck;
  faEye = faEye;
  faDollarSign = faDollarSign;
  faHandHoldingUsd = faHandHoldingUsd;
  faBuilding = faBuilding;
  faHomeUser = faHomeUser;
  faCog = faCog;
  faTag = faTag;
  faHouse = faHouse;
  faChartBar = faChartBar;
  faShieldAlt = faShieldAlt;
  faMoneyBillWave = faMoneyBillWave;
  faUsersCog = faUsersCog;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faTree = faTree;

  @Output() sidebarToggled = new EventEmitter<boolean>();
  private permisosState = inject(PermisosStateService);
  imagen: string = 'assets/logoSinai.jpg';
  currentUser: any;

  isCollapsed = false;
  isMobileOpen = false;

  menuGroups = [
    {
      label: '',
      items: [
        { label: 'Dashboard', icon: faTachometerAlt, route: '/dashboard', clave: 'dashboard' },
      ],
    },
    {
      label: 'Comercial',
      items: [
        {
          label: 'Urbanizaciones',
          icon: faCity,
          route: '/urbanizaciones',
          clave: 'urbanizaciones',
        },
        { label: 'Lotes', icon: faMapMarkedAlt, route: '/lotes', clave: 'lotes' },
        { label: 'Manzanos', icon: faTree, route: '/manzanos', clave: 'manzanos' },
        { label: 'Propiedades', icon: faHouse, route: '/propiedades', clave: 'propiedades' },
        {
          label: 'Cotizaciones',
          icon: faFileInvoiceDollar,
          route: '/cotizaciones',
          clave: 'cotizaciones',
        },
        { label: 'Ventas', icon: faReceipt, route: '/ventas', clave: 'ventas' },
        { label: 'Reservas', icon: faCalendarCheck, route: '/reservas', clave: 'reservas' },
        { label: 'Visitas', icon: faEye, route: '/visitas', clave: 'visitas' },
        { label: 'Promociones', icon: faTag, route: '/promociones', clave: 'promociones' },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        { label: 'Caja', icon: faCashRegister, route: '/caja', clave: 'caja' },
        { label: 'Gastos', icon: faMoneyBillWave, route: '/egresos', clave: 'egresos' },
        { label: 'Créditos', icon: faHandHoldingUsd, route: '/creditos', clave: 'creditos' },
        { label: 'Cobros', icon: faMoneyBillWave, route: '/cobros', clave: 'cobros' },
      ],
    },
    {
      label: 'Reportes',
      items: [{ label: 'Reportes', icon: faChartBar, route: '/reportes', clave: 'reportes' }],
    },
    {
      label: 'Gestión',
      items: [
        { label: 'Clientes', icon: faUsers, route: '/clientes', clave: 'clientes' },
        { label: 'Usuarios', icon: faUsersCog, route: '/usuarios', clave: 'usuarios' },
        { label: 'Seguridad', icon: faShieldAlt, route: '/seguridad', clave: 'seguridad' },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

  get filteredGroups() {
    return this.menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => this.permisosState.tieneAcceso(item.clave)),
      }))
      .filter((group) => group.items.length > 0);
  }

  private openGroups = new Set<string>(['Comercial', 'Finanzas', 'Reportes', 'Gestión']);

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  toggleGroup(label: string) {
    if (this.openGroups.has(label)) {
      this.openGroups.delete(label);
    } else {
      this.openGroups.add(label);
    }
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups.has(label);
  }
}
