import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


export interface RegistroCSV {
  User: string;
  WorkId: string;
  CardNo: string;
  Date: string;
  Time: string;
  IN_OUT: string;
  EventCode: string;
}

export interface DiaAgrupado {
  [nombre: string]: {
    hora_entrada: string;
    hora_salida: string;
    isNovedad: boolean;
    horasTrabajadas: string; // En formato HH:MM:SS
  };
}

export interface RegistrosAgrupados {
  [fecha: string]: DiaAgrupado;
}

@Injectable({
  providedIn: 'root'
})
export class RegistroProcessorService {
  
  // =====================
  // CONSTANTES
  // =====================
  private readonly KEY = 'registros';
  private readonly MEDIODIA = '12:00:00';
  private readonly ENTRADA_DEFAULT = '12:00:00';
  private readonly SALIDA_DEFAULT = '17:30:00';

  // =====================
  // ESTADO
  // =====================
  private registrosOriginales: RegistroCSV[] = this.cargarDeStorage();
  private registrosSubject = new BehaviorSubject<RegistrosAgrupados>(
    this.registrosOriginales.length > 0 
      ? this.agruparPorFechaYUsuario(this.registrosOriginales) 
      : {}
  );
  
  registros$ = this.registrosSubject.asObservable();

  // =====================
  // STORAGE
  // =====================
  private cargarDeStorage(): RegistroCSV[] {
    try {
      const stored = localStorage.getItem(this.KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private guardarEnStorage(registros: RegistroCSV[]): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(registros));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  // =====================
  // MÉTODOS PÚBLICOS
  // =====================

  // Cargar nuevos registros
  setRegistros(registros: RegistroCSV[]): void {
    // Filtrar nulls y registros inválidos
    const registrosLimpios = this.limpiarRegistros(registros);
    
    // Guardar registros originales
    this.registrosOriginales = registrosLimpios;
    this.guardarEnStorage(registrosLimpios);
    
    // Procesar y emitir agrupados
    const agrupados = this.agruparPorFechaYUsuario(registrosLimpios);
    this.registrosSubject.next(agrupados);
  }


  // =====================
  // PROCESAMIENTO
  // =====================
  private limpiarRegistros(registros: RegistroCSV[]): RegistroCSV[] {
    return registros
      .filter(r => {
        // Ignorar NULLs y registros inválidos
        return r.User && 
               r.User !== 'NULL' && 
               r.User.trim() !== '' &&
               r.Date && 
               r.Time;
      })
      .map(r => ({
        // Limpiar comillas y espacios
        ...r,
        User: r.User.replace(/'/g, '').trim(),
        WorkId: (r.WorkId || '').replace(/'/g, '').trim(),
        CardNo: (r.CardNo || '').replace(/'/g, '').trim()
      }));
  }

  public agruparPorFechaYUsuario(registros: RegistroCSV[]): RegistrosAgrupados {
    const resultado: RegistrosAgrupados = {};
    
    // Agrupar por fecha
    const porFecha = this.groupBy(registros, 'Date');
    
    Object.entries(porFecha).forEach(([fecha, registrosDelDia]) => {
      resultado[fecha] = {};

      // Agrupar por usuario
      const registrosValidos = registrosDelDia.filter(r =>
          (r.User !='' && r.User!='NULL')
      );

      const porUsuario = this.groupBy(registrosValidos, 'User');

      
      
      Object.entries(porUsuario).forEach(([usuario, registrosUsuario]) => {
        const { entrada, salida, isNovedad } = this.inferirEntradaSalida(registrosUsuario);
        
        const horasDecimal = this.calcularHorasTrabajadas(entrada, salida);
        const horasFormato = this.horasDecimalAHHMMSS(horasDecimal);
        
        resultado[fecha][usuario] = {
          hora_entrada: entrada,
          hora_salida: salida,
          isNovedad,
          horasTrabajadas: horasFormato
        };
      });
    });

    return resultado;
  }

  private inferirEntradaSalida(registros: RegistroCSV[]): 
    { entrada: string; salida: string; isNovedad: boolean } {
    
    // Obtener todos los tiempos ordenados
    const tiempos = registros
      .map(r => ({ 
        time: r.Time, 
        seconds: this.timeToSeconds(r.Time) 
      }))
      .filter(t => !isNaN(t.seconds))
      .sort((a, b) => a.seconds - b.seconds);

    if (tiempos.length === 0) {
      // No hay registros válidos, usar defaults
      return { 
        entrada: this.ENTRADA_DEFAULT, 
        salida: this.SALIDA_DEFAULT, 
        isNovedad: true 
      };
    }

    const mediodiaSec = this.timeToSeconds(this.MEDIODIA);
    
    // Separar antes y después del mediodía
    const antesDelMediodia = tiempos.filter(t => t.seconds < mediodiaSec);
    const despuesDelMediodia = tiempos.filter(t => t.seconds >= mediodiaSec);

    let entrada = '';
    let salida = '';
    let isNovedad = false;

    // Determinar entrada (primera antes del mediodía)
    if (antesDelMediodia.length > 0) {
      entrada = antesDelMediodia[0].time;
    } else {
      // No hay registro antes del mediodía, usar default
      entrada = this.ENTRADA_DEFAULT;
      isNovedad = true;
    }

    // Determinar salida (última después del mediodía)
    if (despuesDelMediodia.length > 0) {
      salida = despuesDelMediodia[despuesDelMediodia.length - 1].time;
    } else {
      // No hay registro después del mediodía, usar default
      salida = this.SALIDA_DEFAULT;
      isNovedad = true;
    }

    return { entrada, salida, isNovedad };
  }

  // =====================
  // CÁLCULO DE HORAS TRABAJADAS
  // =====================
  private calcularHorasTrabajadas(entrada: string, salida: string): number {
    const segundosEntrada = this.timeToSeconds(entrada);
    const segundosSalida = this.timeToSeconds(salida);
    
    if (isNaN(segundosEntrada) || isNaN(segundosSalida)) return 0;
    
    let diferencia = segundosSalida - segundosEntrada;
    
    // Si la salida es antes que la entrada, asumimos día siguiente
    if (diferencia < 0) {
      diferencia += 86400; // 24 horas en segundos
    }
    
    // Restar hora de almuerzo (1 hora y 30 minutos = 5400 segundos)
    diferencia = diferencia - 5400;
    
    // Si queda negativo después de restar almuerzo, poner en 0
    if (diferencia < 0) diferencia = 0;
    
    // Retornar en horas decimales
    return diferencia / 3600;
  }

  // =====================
  // UTILIDADES DE CONVERSIÓN
  // =====================
  public horasDecimalAHHMMSS(horasDecimales: number): string {
    // Manejar valores negativos o cero
    if (horasDecimales <= 0) return '00:00:00';
    
    const horas = Math.floor(horasDecimales);
    const minutosDecimales = (horasDecimales - horas) * 60;
    const minutos = Math.floor(minutosDecimales);
    const segundosDecimales = (minutosDecimales - minutos) * 60;
    const segundos = Math.round(segundosDecimales);
    
    // Ajustar si los segundos son 60
    let m = minutos;
    let s = segundos;
    let h = horas;
    
    if (s >= 60) {
      s = 0;
      m++;
    }
    
    if (m >= 60) {
      m = 0;
      h++;
    }
    
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    
    return `${hh}h : ${mm}min : ${ss}seg`;
  }

  public horasHHMMSSADecimal(tiempo: string): number {
    const partes = tiempo.split(':');
    if (partes.length < 2) return 0;
    
    const horas = parseInt(partes[0]) || 0;
    const minutos = parseInt(partes[1]) || 0;
    const segundos = parseInt(partes[2]) || 0;
    
    return horas + (minutos / 60) + (segundos / 3600);
  }

  private timeToSeconds(time: string): number {
    if (!time) return NaN;
    
    const partes = time.split(':');
    if (partes.length < 2) return NaN;
    
    const h = parseInt(partes[0]) || 0;
    const m = parseInt(partes[1]) || 0;
    const s = parseInt(partes[2]) || 0;
    
    return h * 3600 + m * 60 + s;
  }

  // =====================
  // HELPER
  // =====================
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  // =====================
  // MÉTODOS DE CONSULTA SIMPLES
  // =====================
  
  // Obtener lista de todos los trabajadores
  obtenerTodosTrabajadores(): string[] {
    const trabajadores = new Set<string>();
    const registros = this.registrosSubject.value;
    
    Object.values(registros).forEach(dia => {
      Object.keys(dia).forEach(nombre => trabajadores.add(nombre));
    });
    
    return Array.from(trabajadores).sort();
  }

  // Obtener registros de un trabajador específico
  obtenerRegistrosTrabajador(nombre: string): any[] {
    const registros = this.registrosSubject.value;
    const resultado: any[] = [];
    
    Object.entries(registros).forEach(([fecha, dia]) => {
      if (dia[nombre]) {
        resultado.push({
          fecha,
          ...dia[nombre]
        });
      }
    });
    
    return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

// Método que calcula todos los promedios en una sola pasada
  public calcularPromediosHorasTrabajadas(): {
    porTrabajador: Map<string, { totalHoras: number; dias: number; promedio: string }>;
    promedioGeneral: string;
  } {
    const registros = this.registrosSubject.value;
    const estadisticasPorTrabajador = new Map<string, { totalHoras: number; dias: number }>();
    
    let totalHorasGlobal = 0;
    let totalDiasGlobal = 0;
    
    // Una sola iteración para acumular todo
    Object.values(registros).forEach(dia => {
      Object.entries(dia).forEach(([trabajador, datos]) => {
        // Convertir a decimal una sola vez
        const horasDecimal = this.horasHHMMSSADecimal(datos.horasTrabajadas);
        
        // Acumular por trabajador
        const stats = estadisticasPorTrabajador.get(trabajador) || { totalHoras: 0, dias: 0 };
        stats.totalHoras += horasDecimal;
        stats.dias += 1;
        estadisticasPorTrabajador.set(trabajador, stats);
        
        // Acumular global
        totalHorasGlobal += horasDecimal;
        totalDiasGlobal += 1;
      });
    });
    
    // Calcular promedios y formatear
    const resultado = new Map<string, { totalHoras: number; dias: number; promedio: string }>();
    
    estadisticasPorTrabajador.forEach((stats, trabajador) => {
      const promedio = stats.dias > 0 ? stats.totalHoras / stats.dias : 0;
      resultado.set(trabajador, {
        totalHoras: stats.totalHoras,
        dias: stats.dias,
        promedio: this.horasDecimalAHHMMSS(promedio)
      });
    });
    
    // Promedio general
    const promedioGeneralDecimal = totalDiasGlobal > 0 ? totalHorasGlobal / totalDiasGlobal : 0;
    
    return {
      porTrabajador: resultado,
      promedioGeneral: this.horasDecimalAHHMMSS(promedioGeneralDecimal)
    };
  }
}