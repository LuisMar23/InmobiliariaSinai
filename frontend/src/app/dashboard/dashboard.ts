import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUsers,
  faHomeUser,
  faReceipt,
  faDollarSign,
  faCity,
  faMapMarkedAlt,
  faFileInvoiceDollar,
  faCalendarCheck,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard',
  imports: [FontAwesomeModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  // Iconos básicos que necesitas
  faUsers = faUsers;
  faHomeUser = faHomeUser;
  faReceipt = faReceipt;
  faDollarSign = faDollarSign;
  faCity = faCity;
  faMapMarkedAlt = faMapMarkedAlt;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faCalendarCheck = faCalendarCheck;

  // Datos simulados básicos
  usuariosTotales = 12;
  totalClientes = 45;
  totalVentas = 23;
  totalPagos = 67;
}
