import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Registro } from '../Interfaces/registro';

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private readonly KEY = 'registros';
  private registrosSubject = new BehaviorSubject<Registro[]>(this.loadFromStorage());
  registros$ = this.registrosSubject.asObservable();

  get registros(): Registro[] {
    return this.registrosSubject.value;
  }

  setRegistros(lista: Registro[]): void {
    this.registrosSubject.next(lista);
    localStorage.setItem(this.KEY, JSON.stringify(lista)); // guarda
  }

  clear(): void {
    this.registrosSubject.next([]);
    localStorage.removeItem(this.KEY);
  }

  private loadFromStorage(): Registro[] {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) as Registro[] : [];
    } catch { return []; }
  }
}