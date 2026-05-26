// app.routes.ts
import { RouterModule, Routes } from '@angular/router';
import { ReportesComponent } from './reportes-ventas/reportes-ventas';
import { NgModule } from '@angular/core';
import { ReportesLotesComponent } from './reportes-lotes/reportes-lotes';
import { ReportesClientesComponent } from './reportes-clientes/reportes-clientes';


export const routes: Routes = [
  { path: '', component: ReportesComponent },
//   { path: '', redirectTo: '/reportes', pathMatch: 'full' }
  { path: 'clientes', component:ReportesClientesComponent },
    { path: 'lotes', component: ReportesLotesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportesRoutingModule {}
