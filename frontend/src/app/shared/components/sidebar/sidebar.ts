import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
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
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
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
  faMoneyBillWave = faMoneyBillWave;
  faCashRegister = faCashRegister;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  imagen: string = 'assets/logoSinai.jpg';
  currentUser: any;

  isCollapsed = false;
  isMobileOpen = false;

  menuItems: {
    label: string;
    icon: IconDefinition;
    route: string;
    roles: string[];
  }[] = [
    {
      label: 'Dashboard',
      icon: faTachometerAlt,
      route: '/dashboard',
      roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'],
    },
    {
      label: 'Urbanizaciones',
      icon: faCity,
      route: '/urbanizaciones',
      roles: ['ADMINISTRADOR', 'SECRETARIA'],
    },
    {
      label: 'Lotes',
      icon: faMapMarkedAlt,
      route: '/lotes',
      roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'],
    },
    { label: 'Propiedades', icon: faHouse, route: '/propiedades', roles: ['ADMINISTRADOR'] },
    {
      label: 'Clientes',
      icon: faHomeUser,
      route: '/clientes',
      roles: ['ADMINISTRADOR', 'SECRETARIA'],
    },
    {
      label: 'Creditos',
      icon: faHomeUser,
      route: '/creditos',
      roles: ['ADMINISTRADOR', 'SECRETARIA'],
    },
    {
      label: 'Cotizaciones',
      icon: faFileInvoiceDollar,
      route: '/cotizaciones',
      roles: ['ADMINISTRADOR'],
    },
    {
      label: 'Ventas',
      icon: faReceipt,
      route: '/ventas',
      roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'],
    },
    {
      label: 'Cobros',
      icon: faMoneyBillWave,
      route: '/cobros',
      roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'], // ✅ Ahora visible para ASESOR también
    },
    {
      label: 'Reservas',
      icon: faCalendarCheck,
      route: '/reservas',
      roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'],
    },
    { label: 'Visitas', icon: faEye, route: '/visitas', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    { label: 'Reportes', icon: faEye, route: '/reportes', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    { label: 'Caja', icon: faCashRegister, route: '/caja', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    {
      label: 'Gastos',
      icon: faCashRegister,
      route: '/egresos',
      roles: ['ADMINISTRADOR', 'SECRETARIA'],
    },
    { label: 'Promociones', icon: faTag, route: '/promociones', roles: ['ADMINISTRADOR'] },
    { label: 'Usuarios', icon: faUsers, route: '/usuarios', roles: ['ADMINISTRADOR'] },
  ];

  filteredMenu: any[] = [];

  constructor(private authService: AuthService) {
    this.imagen = 'assets/logoSinai.jpg';
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.filterMenuByRole();
  }

  private filterMenuByRole() {
    if (!this.currentUser) {
      this.filteredMenu = [];
      return;
    }
    this.filteredMenu = this.menuItems.filter((item) => item.roles.includes(this.currentUser.role));
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }
}