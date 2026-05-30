import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ContactoService } from '../../service/contacto.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contacto-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contacto-create.html',
  styleUrls: ['./contacto-create.css'],
})
export class ContactoCreate implements OnInit {
  form!: FormGroup;
  enviando = signal(false);
  generos = ['Hombre', 'Mujer', 'Otro'];

  private fb = inject(FormBuilder);
  private contactoSvc = inject(ContactoService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      ci: ['', [Validators.required, Validators.minLength(5)]],
      genero: [''],
      telefono: ['', [Validators.required, Validators.minLength(7)]],
      ocupacion: [''],
      email: ['', [Validators.email]],
      pais: [''],
      departamento: [''],
      domicilio: [''],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos correctamente');
      return;
    }
    this.enviando.set(true);
    this.contactoSvc.create(this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Contacto creado exitosamente');
        this.router.navigate(['/contactos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al crear el contacto');
      },
    });
  }
}
