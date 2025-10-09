import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface Festivo {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: any;
  launchYear: any;
  types: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FestivosService {
  private apiUrl = 'https://date.nager.at/api/v3/publicholidays';
  private festivosCache = new Map<number, Festivo[]>();

  constructor(private http: HttpClient) {}

  obtenerFestivos(año: number): Observable<Festivo[]> {
    if (this.festivosCache.has(año)) {
      return of(this.festivosCache.get(año)!);
    }

    return this.http.get<Festivo[]>(`${this.apiUrl}/${año}/CO`).pipe(
      tap(festivos => {
        this.festivosCache.set(año, festivos);
        console.log(`Festivos ${año} cargados:`, festivos);
      }),
      catchError(error => {
        console.error('Error obteniendo festivos:', error);
        return of([]);
      })
    );
  }
}