import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ContactoService } from '../../service/contacto.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-contacto-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contacto-edit.html',
  styleUrls: ['./contacto-edit.css'],
})
export class ContactoEdit implements OnInit {
  form!: FormGroup;
  enviando = signal(false);
  cargando = signal(true);
  id!: number;
  generos = ['Hombre', 'Mujer', 'Otro'];

  private fb = inject(FormBuilder);
  private contactoSvc = inject(ContactoService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
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
    this.cargarDatos();
  }

  cargarDatos() {
    this.contactoSvc.getById(this.id).subscribe({
      next: (contacto) => {
        this.form.patchValue({
          firstName: contacto.firstName,
          lastName: contacto.lastName,
          ci: contacto.ci,
          genero: contacto.genero || '',
          telefono: contacto.telefono,
          ocupacion: contacto.ocupacion || '',
          email: contacto.email || '',
          pais: contacto.pais || '',
          departamento: contacto.departamento || '',
          domicilio: contacto.domicilio || '',
        });
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notify.showError('Error al cargar el contacto');
        this.router.navigate(['/contactos']);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos correctamente');
      return;
    }
    this.enviando.set(true);
    this.contactoSvc.update(this.id, this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Contacto actualizado exitosamente');
        this.router.navigate(['/contactos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al actualizar el contacto');
      },
    });
  }
}
