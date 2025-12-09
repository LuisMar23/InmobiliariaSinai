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
  menu: { label: string; icon: IconDefinition; route: string }[] = [
    { label: 'Dashboard', icon: faTachometerAlt, route: '/dashboard' },
    { label: 'Urbanizaciones', icon: faCity, route: '/urbanizaciones' },
    { label: 'Lotes', icon: faMapMarkedAlt, route: '/lotes' },
    { label: 'Propiedades', icon: faHouse, route: '/propiedades' }, // Nueva opción agregada
    // Usuarios se agrega dinámicamente según el rol
    { label: 'Clientes', icon: faHomeUser, route: '/clientes' },
    { label: 'Cotizaciones', icon: faFileInvoiceDollar, route: '/cotizaciones' },
    { label: 'Ventas', icon: faReceipt, route: '/ventas' },
    { label: 'Reservas', icon: faCalendarCheck, route: '/reservas' },
    { label: 'Visitas', icon: faEye, route: '/visitas' },
    { label: 'Caja', icon: faCashRegister, route: '/caja' },
    { label: 'Promociones', icon: faTag, route: '/promociones' },
  ];

  constructor(private authService: AuthService) {
    this.imagen = 'assets/logoSinai.jpg';
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.filterMenuByRole();
  }

  private filterMenuByRole() {
    // SOLO agregar "Usuarios" si el rol es ADMINISTRADOR o SECRETARIA
    if (this.currentUser && ['ADMINISTRADOR', 'SECRETARIA'].includes(this.currentUser.role)) {
      // Insertar "Usuarios" después de "Propiedades" (posición 4)
      this.menu.splice(4, 0, {
        label: 'Usuarios',
        icon: faUsers,
        route: '/usuarios',
      });
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }
}
