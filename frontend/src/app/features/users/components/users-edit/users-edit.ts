import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSave,
  faUserEdit,
  faUser,
  faIdCard,
  faPhone,
  faEnvelope,
  faUserShield,
  faCalendar,
  faMapMarkerAlt,
  faStickyNote,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { AuthService } from '../../../../components/services/auth.service';

@Component({
  selector: 'app-users-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './users-edit.html',
})
export class UsersEditComponent implements OnInit {
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faUserEdit = faUserEdit;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faEnvelope = faEnvelope;
  faUserShield = faUserShield;
  faCalendar = faCalendar;
  faMapMarkerAlt = faMapMarkerAlt;
  faStickyNote = faStickyNote;

  editForm: FormGroup;
  userId = signal<number | null>(null);
  userData = signal<any>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  canEditRole = signal<boolean>(false);
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA', 'USUARIO'];

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor() {
    this.editForm = this.crearFormularioUsuario();
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.canEditRole.set(currentUser?.role === 'ADMINISTRADOR');
    this.obtenerUsuario();
  }

  crearFormularioUsuario(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      direccion: [''],
      observaciones: [''],
      role: ['', [Validators.required]],
    });
  }

  obtenerUsuario(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de usuario no válido');
      this.cargando.set(false);
      return;
    }

    this.userId.set(id);
    this.cargando.set(true);

    this.userService.getById(id).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const user = response.data.user || response.data;

          // Validar que NO sea un cliente
          if (user && user.role === 'CLIENTE') {
            this.notificationService.showError('No se puede editar clientes desde esta sección');
            this.router.navigate(['/usuarios']);
            return;
          }

          this.userData.set(user);
          this.cargarDatosFormulario(user);
        } else {
          this.error.set('No se pudo cargar la información del usuario');
        }
        this.cargando.set(false);
      },
      error: (error: any) => {
        console.error('Error loading user:', error);
        this.error.set(error.message || 'Error al cargar los datos del usuario');
        this.cargando.set(false);
        this.router.navigate(['/usuarios']);
      },
    });
  }

  cargarDatosFormulario(user: any): void {
    this.editForm.patchValue({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      telefono: user.telefono || '',
      direccion: user.direccion || '',
      observaciones: user.observaciones || '',
      role: user.role || 'USUARIO',
    });

    if (!this.canEditRole()) {
      this.editForm.get('role')?.disable();
    }
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    if (!this.userId()) {
      this.notificationService.showError('ID de usuario no válido');
      return;
    }

    this.enviando.set(true);

    const updateData = {
      fullName: this.editForm.value.fullName,
      username: this.editForm.value.username,
      email: this.editForm.value.email,
      telefono: this.editForm.value.telefono,
      direccion: this.editForm.value.direccion,
      observaciones: this.editForm.value.observaciones,
      ...(this.canEditRole() && { role: this.editForm.value.role }),
    };

    this.userService.update(this.userId()!, updateData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        this.notificationService.showSuccess(
          response.message || 'Usuario actualizado correctamente'
        );
        setTimeout(() => {
          this.router.navigate(['/usuarios']);
        }, 1500);
      },
      error: (error: any) => {
        this.enviando.set(false);
        console.error('Error updating user:', error);
        this.notificationService.showError(error.message || 'Error al actualizar el usuario');
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.editForm.controls).forEach((key) => {
      const control = this.editForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return 'Mínimo 3 caracteres';
      if (control.errors['email']) return 'Email inválido';
    }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }
}
