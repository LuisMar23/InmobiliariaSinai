import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginDto } from '../../core/interfaces/login.interface';
import { RegisterDto } from '../../core/interfaces/register.interface';
import { Router } from '@angular/router';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ForgotPasswordResponse {
  message?: string;
  success?: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';
  private userKey = 'user_data';

  constructor(private http: HttpClient, private router: Router) {}

  login(data: LoginDto): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, data).pipe(
      tap((res) => {
        console.log('Respuesta login:', res);
        if (res.data) {
          if (data.rememberMe) {
            localStorage.setItem(this.tokenKey, res.data.accessToken);
            localStorage.setItem('refresh_token', res.data.refreshToken);
            localStorage.setItem(this.userKey, JSON.stringify(res.data.user));
          } else {
            sessionStorage.setItem(this.tokenKey, res.data.accessToken);
            sessionStorage.setItem('refresh_token', res.data.refreshToken);
            sessionStorage.setItem(this.userKey, JSON.stringify(res.data.user));
          }
        }
      }),
      catchError((error) => {
        console.error('Error en login service:', error);
        let errorMessage = 'Error en el login';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 401) {
          errorMessage = 'Credenciales incorrectas';
        } else if (error.status === 423) {
          errorMessage = 'Cuenta bloqueada temporalmente';
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  register(data: RegisterDto): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((res) => {
        console.log('Respuesta registro completa:', res);
      }),
      catchError((error) => {
        console.error('Error en registro service:', error);
        let errorMessage = 'Error al registrar usuario';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          if (error.error.message?.includes('email')) {
            errorMessage = 'El email ya está registrado';
          } else if (error.error.message?.includes('usuario')) {
            errorMessage = 'El nombre de usuario ya existe';
          } else if (error.error.message?.includes('CI')) {
            errorMessage = 'El CI ya está registrado';
          } else if (error.error.message?.includes('teléfono')) {
            errorMessage = 'El teléfono ya está registrado';
          } else {
            errorMessage = 'El usuario o email ya existe';
          }
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos en el formulario';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        }

        return throwError(() => ({
          message: errorMessage,
          status: error.status,
          error: error.error,
        }));
      })
    );
  }

  refreshToken(): Observable<string> {
    const token = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    if (!token) {
      this.logout();
      throw new Error('No hay refresh token disponible');
    }

    return this.http
      .post<{ data: { accessToken: string; refreshToken: string } }>(
        `${this.apiUrl}/auth/refresh`,
        {
          refreshToken: token,
        }
      )
      .pipe(
        tap((res) => {
          const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
          storage.setItem('access_token', res.data.accessToken);
          storage.setItem('refresh_token', res.data.refreshToken);
        }),
        map((res) => res.data.accessToken),
        catchError((error) => {
          this.logout();
          return throwError(() => new Error('Error al refrescar token'));
        })
      );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http
      .post<ForgotPasswordResponse>(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        catchError((error) => {
          let errorMessage = 'Error al enviar el correo de recuperación';

          if (error.status === 404) {
            errorMessage = 'No se encontró una cuenta con este email';
          } else if (error.status === 429) {
            errorMessage = 'Demasiados intentos. Por favor, espera unos minutos';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(this.userKey);

    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem(this.userKey);

    this.router.navigate(['/login']);
  }

  getCurrentUser(): any {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
    return null;
  }
}
