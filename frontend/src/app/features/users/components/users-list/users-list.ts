import { Component, inject, OnInit } from '@angular/core';
import {
  faCogs,
  faEdit,
  faEnvelope,
  faSearch,
  faTrash,
  faUser,
  faUserCircle,
  faUsers,
  faUserShield,
  faUserTimes,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../../components/services/auth.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { UserService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule, CommonModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersComponent implements OnInit {
  faEdit = faEdit;
  faTrash = faTrash;
  faUserTimes = faUserTimes;
  faUsers = faUsers;
  faSearch = faSearch;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faUserShield = faUserShield;
  faCogs = faCogs;
  faUserCircle = faUserCircle;

  users: UserDto[] = [];
  allUsers: any[] = [];
  currentUser: any;
  searchTerm = '';

  _authService = inject(AuthService);
  _usersService = inject(UserService);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this._usersService.getAll().subscribe({
      next: (data) => {
        this.allUsers = data;
        this.applyFilter();
      },
      error: (err: any) => {
        console.error('Error loading users:', err);
        alert('Error al cargar usuarios');
      },
    });
  }

  applyFilter() {
    if (!this.searchTerm) {
      this.users = this.allUsers;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.users = this.allUsers.filter(
        (user: any) =>
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term)
      );
    }
  }

  editRole(user: any) {
    const newRole = prompt(`Asignar nuevo rol a ${user.username}:`, user.role);
    if (newRole && newRole !== user.role) {
      this._usersService.updateRole(user.id, newRole).subscribe({
        next: () => this.loadUsers(),
        error: (err) => {
          console.error('Error updating role:', err);
          alert('Error al actualizar el rol');
        },
      });
    }
  }

  deleteUser(user: any) {
    if (confirm(`¿Deseas eliminar al usuario ${user.username}?`)) {
      this._usersService.delete(user.id).subscribe({
        next: () => this.loadUsers(),
        error: (err: any) => {
          console.error('Error deleting user:', err);
          alert('Error al eliminar usuario');
        },
      });
    }
  }
}
