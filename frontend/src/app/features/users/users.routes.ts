import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersEditComponent } from './components/users-edit/users-edit';
import { UsersComponent } from './components/users-list/users-list'; 
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: UsersComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMINISTRADOR', 'SECRETARIA'] },
  },
  {
    path: 'editar/:id',
    component: UsersEditComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMINISTRADOR', 'SECRETARIA'] },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
