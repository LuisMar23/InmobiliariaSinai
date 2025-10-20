import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard';
import { LayoutComponent } from './shared/components/layout/layout';
import { RegisterComponent } from './components/auth/register/register';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'login/registrar', component: RegisterComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./features/users/users.routes').then((r) => r.UserRoutingModule),
      },
      {
        path: 'urbanizaciones',
        loadChildren: () =>
          import('./features/urbanizacion/urbanizacion.routes').then((r) => r.UrbanizacionRoutingModule),
      },
      {
        path: 'promociones',
        loadChildren: () =>
          import('./features/promocion/promocion.routes').then((r) => r.PromocionesRoutingModule),
      },
      {
        path: 'lotes',
        loadChildren: () =>
          import('./features/lote/lote.routes').then((r) => r.LotesRoutingModule),
      },
      {
        path: 'cotizaciones',
        loadChildren: () =>
          import('./features/cotizacion/cotizacion.routes').then((r) => r.CotizacionesRoutingModule),
      },
      {
        path: 'reservas',
        loadChildren: () =>
          import('./features/reserva/reserva.routes').then((r) => r.ReservaRoutingModule),
      },
      {
        path: 'ventas',
        loadChildren: () =>
          import('./features/venta/venta.routes').then((r) => r.VentasRoutingModule),
      },
    ],
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
