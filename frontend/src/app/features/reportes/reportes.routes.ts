// app.routes.ts
import { RouterModule, Routes } from '@angular/router';
import { ReportesComponent } from './reportes-ventas/reportes-ventas';
import { NgModule } from '@angular/core';


export const routes: Routes = [
  { path: '', component: ReportesComponent },
//   { path: '', redirectTo: '/reportes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportesRoutingModule {}
