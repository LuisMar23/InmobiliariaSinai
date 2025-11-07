// src/app/modules/urbanizacion/urbanizacion-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { UrbanizacionList } from './components/urbanizacion-list/urbanizacion-list';
import { UrbanizacionEdit } from './components/urbanizacion-edit/urbanizacion-edit';

const routes: Routes = [
  { path: '', component: UrbanizacionList, canActivate: [AuthGuard] },
  { path: 'lista', component: UrbanizacionList, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: UrbanizacionEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UrbanizacionRoutingModule {}
