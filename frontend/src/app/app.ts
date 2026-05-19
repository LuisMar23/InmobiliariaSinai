import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PermisosStateService } from './core/services/permisosState.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Inmobiliaria-Frontend');

  private permisosState = inject(PermisosStateService);

  ngOnInit() {
    this.permisosState.recuperar();
  }
}
