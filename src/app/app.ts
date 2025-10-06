import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: '../output.css'
})
export class App {
 protected readonly title = signal('MonitoreoTiempoTrabajo');
  router= inject(Router);

  public tiempoTrabajado24(entrada: string, salida: string): number {
    let a = this.parseTime24(entrada);
    let b = this.parseTime24(salida);
    if (b < a) b += 24 * 3600;
    return (b - a)-(1800)-(3600); 
  }

  public parseTime24(hora: string): number {
    if (!hora) return 0;
    const [hh = '0', mm = '0', ss = '0'] = hora.split(':');
    const h = Math.max(0, Math.min(23, parseInt(hh, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(mm, 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(ss, 10) || 0));
    return h * 3600 + m * 60 + s;
  }

  public segundosToHora24(segundos: number): string {
    const s = Math.round(segundos) % (24 * 3600);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  }

}
