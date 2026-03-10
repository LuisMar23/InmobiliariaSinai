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
  faEye,
  faEyeSlash,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { AuthService } from '../../../../components/services/auth.service';
import { LoteService } from '../../../lote/service/lote.service';

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
  ciudades: string[] = [];
faLock = faLock;
faEye = faEye;
faEyeSlash = faEyeSlash;
showPassword = signal<boolean>(false);
showConfirmPassword = signal<boolean>(false);

togglePasswordVisibility(): void {
  this.showPassword.update(v => !v);
}

toggleConfirmPasswordVisibility(): void {
  this.showConfirmPassword.update(v => !v);
}
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private loteService = inject(LoteService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor() {
    this.editForm = this.crearFormularioUsuario();

    // Reaccionar al cambio de rol
    this.editForm.get('role')?.valueChanges.subscribe(role => {
      const ciudadControl = this.editForm.get('ciudadAsignada');
      if (role === 'ASESOR' || role === 'SECRETARIA') {
        ciudadControl?.setValidators([Validators.required]);
      } else {
        ciudadControl?.clearValidators();
        ciudadControl?.setValue(null);
      }
      ciudadControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.canEditRole.set(currentUser?.role === 'ADMINISTRADOR');

    // Cargar ciudades sugeridas
    this.loteService.getCiudades().subscribe({
      next: (ciudades) => this.ciudades = ciudades,
      error: () => this.ciudades = [],
    });

    this.obtenerUsuario();
  }

  crearFormularioUsuario(): FormGroup {
    return this.fb.group({
      fullName:       ['', [Validators.required, Validators.minLength(3)]],
      username:       ['', [Validators.required, Validators.minLength(3)]],
      email:          ['', [Validators.required, Validators.email]],
      telefono:       ['', [Validators.required]],
      direccion:      [''],
      observaciones:  [''],
      role:           ['', [Validators.required]],
       password:        ['', [Validators.minLength(6)]],
           confirmPassword: [''],
      ciudadAsignada: [null],
    },{
    validators: this.passwordMatchValidator
  });
  }
passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  // Solo valida si escribió algo en password
  if (password && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}
  get requiresCiudad(): boolean {
    const role = this.editForm.get('role')?.value;
    return role === 'ASESOR' || role === 'SECRETARIA';
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

          if (user?.role === 'CLIENTE') {
            this.notificationService.showError('No se puede editar clientes desde esta sección');
            this.router.navigate(['/usuarios']);
            return;
          }
          console.log(user)
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
      fullName:       user.fullName      || '',
      username:       user.username      || '',
      email:          user.email         || '',
      telefono:       user.telefono      || '',
      direccion:      user.direccion     || '',
      observaciones:  user.observaciones || '',
      role:           user.role          || 'USUARIO',
      ciudadAsignada: user.ciudadAsignada || null,
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

const updateData: any = {
  fullName:      this.editForm.value.fullName,
  username:      this.editForm.value.username,
  email:         this.editForm.value.email,
  telefono:      this.editForm.value.telefono,
  direccion:     this.editForm.value.direccion,
  observaciones: this.editForm.value.observaciones,
  ...(this.canEditRole() && { role: this.editForm.value.role }),
  ...(this.canEditRole() && this.requiresCiudad && {
    ciudadAsignada: this.editForm.value.ciudadAsignada || undefined,
  }),
  // Solo envía password si el usuario escribió algo
  ...(this.editForm.value.password && {
    password: this.editForm.value.password,
  }),
};

    this.userService.update(this.userId()!, updateData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        this.notificationService.showSuccess(
          response.message || 'Usuario actualizado correctamente'
        );
        setTimeout(() => this.router.navigate(['/usuarios']), 1500);
      },
      error: (error: any) => {
        this.enviando.set(false);
        this.notificationService.showError(error.message || 'Error al actualizar el usuario');
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.editForm.controls).forEach((key) => {
      this.editForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return 'Mínimo 3 caracteres';
      if (control.errors['email']) return 'Email inválido';
    }
      if (fieldName === 'confirmPassword' && this.editForm.errors?.['passwordMismatch'] && control?.touched) {
    return 'Las contraseñas no coinciden';
  }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
      if (fieldName === 'confirmPassword') {
    return !!(control?.touched && (control?.invalid || this.editForm.errors?.['passwordMismatch']));
  }
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }
}