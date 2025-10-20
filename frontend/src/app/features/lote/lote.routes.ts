import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { LoteList } from './components/lote-list/lote-list';
import { LoteCreate } from './components/lote-create/lote-create';
import { LoteEdit } from './components/lote-edit/lote-edit';

const routes: Routes = [
  { path: '', component: LoteList, canActivate: [AuthGuard] },
  { path: 'lista', component: LoteList, canActivate: [AuthGuard] },
  { path: 'crear', component: LoteCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: LoteEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LotesRoutingModule {}
