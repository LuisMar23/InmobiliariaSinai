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
    ],
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
