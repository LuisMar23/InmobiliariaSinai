import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UrbanizacionDto } from '../../../core/interfaces/urbanizacion.interface';
import { environment } from '../../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class UrbanizacionService {
  private apiUrl = environment.apiUrl+'/urbanizacion';

  constructor(private http: HttpClient) {}

  getAll(page: number, pageSize: number): Observable<{ data: UrbanizacionDto[]; total: number }> {
    return this.http.get<{ data: UrbanizacionDto[]; total: number }>(`${this.apiUrl}?page=${page}&pageSize=${pageSize}`);
  }

  create(dto: UrbanizacionDto): Observable<UrbanizacionDto> {
    return this.http.post<UrbanizacionDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UrbanizacionDto): Observable<UrbanizacionDto> {
    return this.http.patch<UrbanizacionDto>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
