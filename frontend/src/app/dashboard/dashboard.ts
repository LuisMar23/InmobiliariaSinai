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
import {
  ChartConfiguration,
  ChartData,
  ChartType,
} from 'chart.js';

import { DashboardService } from './services/dashboard.service';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  imports: [FontAwesomeModule, CommonModule, BaseChartDirective],
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

  resumen: any = null;
  isLoading = true;

  // === CONFIGURACIÓN CHART.JS ===
  public lineChartData!: ChartData<'bar' | 'line'>;
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Actividad mensual' },
    },
    scales: {
      x: {},
      y: { beginAtZero: true },
    },
  };
  public lineChartType: ChartType = 'bar'; // Gráfico combinado (barras + línea)

  constructor(private dashboardSvc: DashboardService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;

    // Resumen general
    this.dashboardSvc.getResumen().subscribe({
      next: (res) => (this.resumen = res),
      error: (err) => console.error('Error cargando resumen:', err),
    });

    // Actividad mensual
    this.dashboardSvc.getActividad().subscribe({
      next: (data) => {
        const ventas = data.ventas.map((v: any) => Number(v.total));
        const reservas = data.reservas.map((r: any) => Number(r.total));
        const cotizaciones = data.cotizaciones.map((c: any) => Number(c.total));

        const meses = [
          'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
        ];

        this.lineChartData = {
          labels: meses,
          datasets: [
            {
              type: 'bar',
              label: 'Ventas',
              data: ventas,
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1,
            },
            {
              type: 'bar',
              label: 'Reservas',
              data: reservas,
              backgroundColor: 'rgba(255, 205, 86, 0.6)',
              borderColor: 'rgb(255, 205, 86)',
              borderWidth: 1,
            },
            {
              type: 'line',
              label: 'Cotizaciones',
              data: cotizaciones,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.3)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y',
            },
          ],
        };

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando actividad mensual:', err);
        this.isLoading = false;
      },
    });
  }
}
