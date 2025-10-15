import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUser,
  faLock,
  faEnvelope,
  faPhone,
  faIdCard,
  faUserTag,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-register',
  standalone:true,
  imports: [ReactiveFormsModule, RouterModule, FontAwesomeModule,CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
 isLoading = false;
  errorMessage = '';
  registerForm: FormGroup;
  showPassword = false;
  _authService = inject(AuthService);
  _notificationService=inject(NotificationService)
  passwordRequirements = {
    minLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSymbol: false
  };

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      ci: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.setupPasswordValidation();
  }

  private setupPasswordValidation(): void {
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      if (password) {
        this.passwordRequirements = {
          minLength: password.length >= 8,
          hasUpperCase: /[A-Z]/.test(password),
          hasNumber: /\d/.test(password),
          hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
      } else {
        this.passwordRequirements = {
          minLength: false,
          hasUpperCase: false,
          hasNumber: false,
          hasSymbol: false
        };
      }
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this._authService.register(this.registerForm.value).subscribe({
      next: (resp) => {
        console.log('Usuario registrado', resp);
        this.isLoading = false;
        
        
        this.router.navigate(['/login']); 
        

        this._notificationService.showSuccess(`Usuario Registrado ${resp}`)
      },
      error: (err) => {
        console.error('Error al registrar usuario', err);
        this.isLoading = false;
        
        // Manejo de errores más específico
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 400) {
          this.errorMessage = 'Datos inválidos. Verifica la información ingresada.';
        } else if (err.status === 409) {
          this.errorMessage = 'El usuario o correo ya existe.';
        } else {
          this.errorMessage = 'Error al crear la cuenta. Inténtalo nuevamente.';
        }
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  // Método para obtener errores específicos de cada campo
  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['email']) {
        return 'Ingrese un email válido';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['pattern']) {
        switch (fieldName) {
          case 'telefono':
            return 'El teléfono debe tener al menos 8 dígitos';
          case 'password':
            return 'La contraseña no cumple con los requisitos';
          default:
            return 'Formato inválido';
        }
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      fullName: 'Nombre completo',
      username: 'Usuario',
      ci: 'Cédula de Identidad',
      telefono: 'Teléfono',
      email: 'Correo',
      password: 'Contraseña'
    };
    return labels[fieldName] || fieldName;
  }

  // Método para toggle del password
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
