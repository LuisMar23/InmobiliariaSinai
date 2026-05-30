import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { GrupoList } from './components/grupo-list/grupo-list';
import { GrupoCreate } from './components/grupo-create/grupo-create';
import { GrupoEdit } from './components/grupo-edit/grupo-edit';

const routes: Routes = [
  { path: '', component: GrupoList, canActivate: [AuthGuard] },
  { path: 'lista', component: GrupoList, canActivate: [AuthGuard] },
  { path: 'crear', component: GrupoCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: GrupoEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GrupoRoutingModule {}
