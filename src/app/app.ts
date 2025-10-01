import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Registro } from '../Interfaces/registro';
import { PromedioEntradaSalida, ResumenTrabajador } from '../Interfaces/registrosIndividuales';

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


  public procesarDatosPorTrabajador(registros: Registro[]): ResumenTrabajador[] {
    // Paso 1: Usar .reduce() para agrupar y calcular simultáneamente
    const resumenesMap = registros.reduce((acumulador, registro) => {
      const nombre = registro.nombre;

      // Condición para saltar registros sin nombre válido
      if (!nombre || nombre.trim() === '') {
        return acumulador; // Simplemente devolvemos el acumulador sin modificarlo
      }

      // Si el trabajador no existe en nuestro mapa, lo inicializamos
      if (!acumulador[nombre]) {
        acumulador[nombre] = {
          nombre: nombre,
          totalHorasTrabajadas: 0,
          registros: []
        };
      }

      // Calculamos las horas de este registro y las sumamos al total del trabajador
      const horasDeEsteRegistro = this.tiempoTrabajado24(registro.hora_inicio, registro.hora_salida);
      acumulador[nombre].totalHorasTrabajadas += horasDeEsteRegistro;
      
      // Opcional: guardamos el registro original
      acumulador[nombre].registros.push(registro);
      console.log(acumulador[nombre]);
      
      return acumulador;
    }, {} as { [nombre: string]: ResumenTrabajador });

    return Object.values(resumenesMap);
  }

  public calcularPromedioEntradaSalidaPorTrabajador(registros: Registro[]): PromedioEntradaSalida[] {
    const statsPorTrabajador = registros.reduce((acumulador, registro) => {
      const nombre = registro.nombre;

      if (!nombre || nombre.trim() === '') {
        return acumulador;
      }

      if (!acumulador[nombre]) {
        acumulador[nombre] = {
          totalSegundosEntrada: 0,
          totalSegundosSalida: 0, 
          cantidadRegistros: 0
        };
      }

      acumulador[nombre].totalSegundosEntrada += this.parseTime24(registro.hora_inicio);
      acumulador[nombre].totalSegundosSalida += this.parseTime24(registro.hora_salida); 
      acumulador[nombre].cantidadRegistros += 1;

      return acumulador;
    }, {} as { [nombre: string]: { 
        totalSegundosEntrada: number, 
        totalSegundosSalida: number, 
        cantidadRegistros: number 
      } 
    });

    const promediosFinales = Object.keys(statsPorTrabajador).map(nombre => {
      const stats = statsPorTrabajador[nombre];
      
      const promedioEntradaSeg = stats.totalSegundosEntrada / stats.cantidadRegistros;
      
      const promedioSalidaSeg = stats.totalSegundosSalida / stats.cantidadRegistros;

      return {
        nombre: nombre,
        promedioEntradaSegundos: promedioEntradaSeg,
        promedioEntradaFormateado: this.segundosToHora24(promedioEntradaSeg),
        promedioSalidaSegundos: promedioSalidaSeg, 
        promedioSalidaFormateado: this.segundosToHora24(promedioSalidaSeg) 
      };
    });

    return promediosFinales;
  }

  public parseHoursMinute(promedioHorasTrabajadas:any): string{
    var hours = Math.floor(promedioHorasTrabajadas);
    var minutes_decimal = (promedioHorasTrabajadas - hours) * 60;
    var minutes =  Math.round(minutes_decimal);

    return`${hours}h : ${minutes_decimal}m`
  }
}
