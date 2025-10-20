import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { PromocionDto } from '../../../core/interfaces/promocion.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class PromocionService {
  apiUrl = `${environment.apiUrl}/promociones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PromocionDto[]> {
    return this.http
      .get<ApiResponse<PromocionDto[]>>(this.apiUrl)
      .pipe(map((response) => response.data));
  }

  getById(id: number): Observable<PromocionDto> {
    return this.http
      .get<ApiResponse<PromocionDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(promocion: Partial<PromocionDto>): Observable<PromocionDto> {
    return this.http
      .post<ApiResponse<PromocionDto>>(this.apiUrl, promocion)
      .pipe(map((response) => response.data));
  }

  update(id: number, promocion: Partial<PromocionDto>): Observable<PromocionDto> {
    return this.http
      .patch<ApiResponse<PromocionDto>>(`${this.apiUrl}/${id}`, promocion)
      .pipe(map((response) => response.data));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }
}
