import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
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
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
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

  @Output() sidebarToggled = new EventEmitter<boolean>();

  imagen: string = 'assets/logoSinai.jpg';

  isCollapsed = false;
  isMobileOpen = false;

  // Menú
  menu: { label: string; icon: IconDefinition; route: string }[] = [
    { label: 'Dashboard', icon: faTachometerAlt, route: '/dashboard' },
    { label: 'Urbanizaciones', icon: faCity, route: '/urbanizaciones' },
    { label: 'Lotes', icon: faMapMarkedAlt, route: '/lotes' },
    { label: 'Usuarios', icon: faUsers, route: '/usuarios' },
    { label: 'Clientes', icon: faHomeUser, route: '/clientes' },
    { label: 'Cotizaciones', icon: faFileInvoiceDollar, route: '/cotizaciones' },
    { label: 'Ventas', icon: faReceipt, route: '/ventas' },
    { label: 'Reservas', icon: faCalendarCheck, route: '/reservas' },
    { label: 'Visitas', icon: faEye, route: '/visitas' },
    { label: 'Planes Financiamiento', icon: faHandHoldingUsd, route: '/planes-financiamiento' },
    { label: 'Pagos', icon: faDollarSign, route: '/pagos' },
    { label: 'Ajustes', icon: faCog, route: '/ajustes' },
  ];

  constructor() {
    this.imagen = 'assets/logoSinai.jpg';
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }
}
