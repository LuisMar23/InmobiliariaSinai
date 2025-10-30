import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../../../components/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private authService = inject(AuthService);

  getAll(): Observable<any> {
    return this.authService.getAllUsers().pipe(
      tap((response) => console.log('Users response:', response)), // Para debug
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data.users)) {
          return response;
        }
        // Si la respuesta no tiene la estructura esperada, crear una estructura válida
        return {
          success: true,
          data: {
            users: Array.isArray(response) ? response : [],
          },
        };
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.authService.getUserById(id).pipe(
      tap((response) => console.log('User by ID response:', response)), // Para debug
      map((response: any) => {
        if (response.success && response.data) {
          return response;
        }
        // Si la respuesta no tiene la estructura esperada, crear una estructura válida
        return {
          success: true,
          data: response || null,
        };
      })
    );
  }

  update(id: number, userData: any): Observable<any> {
    return this.authService.updateUser(id, userData);
  }

  delete(id: number): Observable<any> {
    return this.authService.deleteUser(id);
  }
}
