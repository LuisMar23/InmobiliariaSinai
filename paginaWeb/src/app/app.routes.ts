import { RouterModule, Routes } from '@angular/router';
import { MainLayout } from './shared/main-layout/main-layout';
import { NgModule } from '@angular/core';
import { Contacto } from './features/contacto/contacto/contacto';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
  { path: '', redirectTo: 'lotes', pathMatch: 'full' },     
        {
        path: 'lotes',
        loadChildren: () =>
          import('./features/lotes/lotes.routes').then((m) => m.LotesRoutingModule),
      },
      {
        path: 'urbanizaciones',
        loadChildren: () =>
          import('./features/urbanizacion/urbanizacion.routes').then(
            (m) => m.UrbanizacionRoutingModule
          ),
      },
      {
        path:'contacto',
        component:Contacto
      }
    ],
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // Configuración optimizada para lazy loading
      preloadingStrategy: false, // Desactivar preloading para evitar conflictos
      enableTracing: false,
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
