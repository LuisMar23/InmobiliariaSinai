import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ContactoList } from './components/contacto-list/contacto-list';
import { ContactoCreate } from './components/contacto-create/contacto-create';
import { ContactoEdit } from './components/contacto-edit/contacto-edit';

const routes: Routes = [
  { path: '', component: ContactoList, canActivate: [AuthGuard] },
  { path: 'lista', component: ContactoList, canActivate: [AuthGuard] },
  { path: 'crear', component: ContactoCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: ContactoEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContactoRoutingModule {}
