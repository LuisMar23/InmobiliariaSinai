import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSave,
  faUserPlus,
  faUser,
  faIdCard,
  faPhone,
  faEnvelope,
  faUserShield,
  faLock,
  faEye,
  faEyeSlash,
  faMapMarkerAlt,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../../components/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { LoteService } from '../../../lote/service/lote.service';
@Component({
  selector: 'app-users-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './ussers-create.html',
})
export class UsersCreateComponent implements OnInit {
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faUserPlus = faUserPlus;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faEnvelope = faEnvelope;
  faUserShield = faUserShield;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faMapMarker = faMapMarkerAlt;

  createForm: FormGroup;
  enviando = signal<boolean>(false);
  canAssignRole = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA', 'USUARIO'];
  ciudades: string[] = [];

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private loteService = inject(LoteService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor() {
    this.createForm = this.crearFormularioUsuario();

    // Reaccionar al cambio de rol
    this.createForm.get('role')?.valueChanges.subscribe((role) => {
      const ciudadControl = this.createForm.get('ciudadAsignada');
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
    this.canAssignRole.set(currentUser?.role === 'ADMINISTRADOR');

    if (!this.canAssignRole()) {
      this.createForm.patchValue({ role: 'USUARIO' });
      this.createForm.get('role')?.disable();
    }

    // Cargar ciudades — si falla, el input igual funciona
    this.loteService.getCiudades().subscribe({
      next: (ciudades) => {
        ((this.ciudades = ciudades), console.log(this.ciudades));
      },
      error: () => (this.ciudades = []),
    });
  }

  crearFormularioUsuario(): FormGroup {
    return this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(3)]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        telefono: ['', []],
        ci: [''],
        direccion: [''],
        observaciones: [''],
        role: ['USUARIO', [Validators.required]],
        ciudadAsignada: [null],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  get requiresCiudad(): boolean {
    const role = this.createForm.get('role')?.value;
    return role === 'ASESOR' || role === 'SECRETARIA';
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    if (this.createForm.errors?.['passwordMismatch']) {
      this.notificationService.showError('Las contraseñas no coinciden');
      return;
    }

    this.enviando.set(true);

    const newUser = {
      fullName: this.createForm.value.fullName,
      username: this.createForm.value.username,
      email: this.createForm.value.email || undefined,
      password: this.createForm.value.password,
      telefono: this.createForm.value.telefono,
      ci: this.createForm.value.ci || undefined,
      direccion: this.createForm.value.direccion || undefined,
      observaciones: this.createForm.value.observaciones || undefined,
      role: this.canAssignRole() ? this.createForm.value.role : 'USUARIO',
      ciudadesAsignadas: this.requiresCiudad // Fix #2
        ? [this.createForm.value.ciudadAsignada].filter(Boolean)
        : [],
    };

    this.authService.register(newUser).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        this.notificationService.showSuccess(response.message || 'Usuario creado correctamente');
        setTimeout(() => this.router.navigate(['/usuarios']), 1500);
      },
      error: (error: any) => {
        this.enviando.set(false);
        this.notificationService.showError(error.message || 'Error al crear el usuario');
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.createForm.controls).forEach((key) => {
      this.createForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.createForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['email']) return 'Email inválido';
    }
    if (
      fieldName === 'confirmPassword' &&
      this.createForm.errors?.['passwordMismatch'] &&
      control?.touched
    ) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.createForm.get(fieldName);
    if (fieldName === 'confirmPassword') {
      return !!(
        control?.touched &&
        (control?.invalid || this.createForm.errors?.['passwordMismatch'])
      );
    }
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }
}
