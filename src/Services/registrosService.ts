import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Registro } from '../Interfaces/registro'; // ajusta la ruta

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private registrosSubject = new BehaviorSubject<Registro[]>([]);
  registros$ = this.registrosSubject.asObservable();

  get registros(): Registro[] {
    return this.registrosSubject.value;
  }

  setRegistros(lista: Registro[]): void {
    this.registrosSubject.next(lista);
  }

  clear(): void {
    this.registrosSubject.next([]);
  }
}