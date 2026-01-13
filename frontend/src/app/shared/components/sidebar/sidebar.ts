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
  faHouse, // Icono para Propiedades
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
  faHouse = faHouse; // Icono para Propiedades

  @Output() sidebarToggled = new EventEmitter<boolean>();

  imagen: string = 'assets/logoSinai.jpg';
  currentUser: any;

  isCollapsed = false;
  isMobileOpen = false;

  // Menú - SOLO modificar la opción de Usuarios
menuItems: { 
    label: string; 
    icon: IconDefinition; 
    route: string;
    roles: string[]; // Roles que tienen acceso a este item
  }[] = [
    // Acceso para todos los roles
    { label: 'Dashboard', icon: faTachometerAlt, route: '/dashboard', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    
    // Gestión de Propiedades y Urbanizaciones (Admin y Secretaria)
    { label: 'Urbanizaciones', icon: faCity, route: '/urbanizaciones', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    { label: 'Lotes', icon: faMapMarkedAlt, route: '/lotes', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    { label: 'Propiedades', icon: faHouse, route: '/propiedades', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    
    // Gestión de Clientes (todos)
    { label: 'Clientes', icon: faHomeUser, route: '/clientes', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    
    // Gestión Comercial
    { label: 'Cotizaciones', icon: faFileInvoiceDollar, route: '/cotizaciones', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    { label: 'Ventas', icon: faReceipt, route: '/ventas', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    { label: 'Reservas', icon: faCalendarCheck, route: '/reservas', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    { label: 'Visitas', icon: faEye, route: '/visitas', roles: ['ADMINISTRADOR', 'SECRETARIA', 'ASESOR'] },
    
    // Gestión Financiera y Operativa
    { label: 'Caja', icon: faCashRegister, route: '/caja', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    { label: 'Promociones', icon: faTag, route: '/promociones', roles: ['ADMINISTRADOR', 'SECRETARIA'] },
    
    // Gestión de Usuarios (solo Admin)
    { label: 'Usuarios', icon: faUsers, route: '/usuarios', roles: ['ADMINISTRADOR'] },
    
    // Configuración (solo Admin)
    { label: 'Configuración', icon: faCog, route: '/configuracion', roles: ['ADMINISTRADOR'] },
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

    // Filtrar menú según el rol del usuario
    this.filteredMenu = this.menuItems.filter(item => 
      item.roles.includes(this.currentUser.role)
    );
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }
}
