import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RegistroProcessorService, RegistrosAgrupados } from '../../Services/RegistroAgrupado';

interface RangoFrecuencia {
  rango: string;
  cantidad: number;
  porcentaje: number;
  promedioDiario: string;
  tendencia: 'up' | 'down' | 'flat';
  variacion: number;
}

interface EstadisticaHoraria {
  hora: string;
  entradas: number;
  salidas: number;
}

@Component({
  selector: 'app-analisis-frecuencias',
  imports: [CommonModule],
  templateUrl: './rangos-details.html',
  styleUrl:'../../output.css'
})
export class RangosDetails {
  
  // Estado
  private periodo: 'hoy' | 'semana' | 'mes' | 'siempre' = 'semana';
  private subscription?: Subscription;
  private datosAgrupados: RegistrosAgrupados = {};
  
  // Datos calculados
  private _topRangosEntrada: RangoFrecuencia[] = [];
  private _topRangosSalida: RangoFrecuencia[] = [];
  private _estadisticasHorarias: EstadisticaHoraria[] = [];
  private _totalEntradas = 0;
  private _totalSalidas = 0;
  private _horaPicoEntrada = 'N/A';
  private _horaPicoSalida = 'N/A';
  private _maxEntradas = 1;
  private _maxSalidas = 1;

  constructor(private registroService: RegistroProcessorService) {}

  ngOnInit() {
    this.subscription = this.registroService.registros$.subscribe(agrupados => {
      this.datosAgrupados = agrupados;
      this.procesarDatos();
    });

    
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  // =====================
  // MÉTODOS PÚBLICOS PARA EL TEMPLATE
  // =====================
  
  cambiarPeriodo(p: 'hoy' | 'semana' | 'mes' | 'siempre') {
    this.periodo = p;
    this.procesarDatos();
  }

  periodoSeleccionado() {
    return this.periodo;
  }

  cantidadTop() {
    return 5;
  }

  totalEntradas() {
    return this._totalEntradas;
  }

  totalSalidas() {
    return this._totalSalidas;
  }

  horaPickEntrada() {
    return this._horaPicoEntrada;
  }

  horaPickSalida() {
    return this._horaPicoSalida;
  }

  topRangosEntrada() {
    return this._topRangosEntrada;
  }

  topRangosSalida() {
    return this._topRangosSalida;
  }

  maxEntradas() {
    return this._maxEntradas;
  }

  maxSalidas() {
    return this._maxSalidas;
  }

  estadisticasHorarias() {
    return this._estadisticasHorarias;
  }

  calcularAnchoBarra(cantidad: number, max: number): string {
    if (max === 0) return '0%';
    return `${Math.round((cantidad / max) * 100)}%`;
  }

  obtenerColorTendencia(tendencia: 'up' | 'down' | 'flat'): string {
    switch (tendencia) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  obtenerIconoTendencia(tendencia: 'up' | 'down' | 'flat'): string {
    switch (tendencia) {
      case 'up': return 'M5 10l7-7m0 0l7 7m-7-7v18';
      case 'down': return 'M19 14l-7 7m0 0l-7-7m7 7V3';
      default: return 'M5 12h14';
    }
  }

  // =====================
  // PROCESAMIENTO DE DATOS
  // =====================
  
  private procesarDatos() {
    const fechasFiltradas = this.obtenerFechasPorPeriodo();
    
    // Filtrar datos según el periodo
    const datosFiltrados: RegistrosAgrupados = {};
    fechasFiltradas.forEach(fecha => {
      if (this.datosAgrupados[fecha]) {
        datosFiltrados[fecha] = this.datosAgrupados[fecha];
      }
    });
    console.log(datosFiltrados);
    
    // Calcular estadísticas
    this.calcularTotales(datosFiltrados);
    this.calcularTopRangos(datosFiltrados);
    this.calcularDistribucionHoraria(datosFiltrados);
  }

  private obtenerFechasPorPeriodo(): string[] {
    const todasFechas = Object.keys(this.datosAgrupados).sort();
    if (todasFechas.length === 0) return [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return todasFechas.filter(fechaStr => {
      const fecha = new Date(fechaStr);
      
      switch (this.periodo) {
        case 'hoy':
          return fecha.toDateString() === hoy.toDateString();
        
        case 'semana':
          const hace7dias = new Date(hoy);
          hace7dias.setDate(hoy.getDate() - 7);
          return fecha >= hace7dias && fecha <= hoy; 
        
        case 'mes':
          const hace30dias = new Date(hoy);
          hace30dias.setDate(hoy.getDate() - 30);
          return fecha >= hace30dias && fecha <= hoy;
        
        default:
          return true;
      }
    });
  }

  private calcularTotales(datos: RegistrosAgrupados) {
    let totalEntradas = 0;
    let totalSalidas = 0;

    Object.values(datos).forEach(dia => {
      Object.values(dia).forEach(() => {

      });
    });

    this._totalEntradas = totalEntradas;
    this._totalSalidas = totalSalidas;
  }

  private calcularTopRangos(datos: RegistrosAgrupados) {
    const rangosEntrada = new Map<string, number>();
    const rangosSalida = new Map<string, number>();

    // Contar frecuencias por rango
    Object.values(datos).forEach(dia => {
      Object.values(dia).forEach(trabajador => {
        const rangoEntrada = this.obtenerRango(trabajador.hora_entrada);
        const rangoSalida = this.obtenerRango(trabajador.hora_salida);
        
        rangosEntrada.set(rangoEntrada, (rangosEntrada.get(rangoEntrada) || 0) + 1);
        rangosSalida.set(rangoSalida, (rangosSalida.get(rangoSalida) || 0) + 1);
      });
    });

    const totalDias = Object.keys(datos).length || 1;

    // Convertir a array y ordenar
    this._topRangosEntrada = this.convertirYOrdenarRangos(rangosEntrada, totalDias,'entrada');
    this._topRangosSalida = this.convertirYOrdenarRangos(rangosSalida, totalDias,'salida');

    // Actualizar máximos para barras
    this._maxEntradas = this._topRangosEntrada[0]?.cantidad || 1;
    this._maxSalidas = this._topRangosSalida[0]?.cantidad || 1;

    // Obtener horas pico
    this._horaPicoEntrada = this._topRangosEntrada[0]?.rango || 'N/A';
    this._horaPicoSalida = this._topRangosSalida[0]?.rango || 'N/A';
  }

  private obtenerRango(hora: string): string {
    if (!hora) return '00:00 - 00:15';
    
    const [h, m] = hora.split(':').map(Number);
    const minutosTotales = h * 60 + m;
    
    // Rangos de N minutos
    const rangoInicio = Math.floor(minutosTotales / 15) * 15;
    const rangoFin = rangoInicio + 15;
    
    const formatearHora = (mins: number) => {
      const horas = Math.floor(mins / 60);
      const minutos = mins % 60;
      return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };
    
    return `${formatearHora(rangoInicio)} - ${formatearHora(rangoFin)}`;
  }

  private convertirYOrdenarRangos(rangosMap: Map<string, number>, totalDias: number,  tipo: 'entrada' | 'salida'):
    RangoFrecuencia[] {
    const total = Array.from(rangosMap.values()).reduce((a, b) => a + b, 0) || 1;
    
    var stats = Array.from(rangosMap.entries())
      .map(([rango, cantidad]) => ({
        rango,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100),
        promedioDiario: `${(cantidad / totalDias).toFixed(1)}/día`,
        tendencia: 'flat' as const, 
        variacion: 0
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
      
      if (tipo === 'entrada') {
        stats.forEach(element => this._totalEntradas += element.cantidad);
      } else {
        stats.forEach(element => this._totalSalidas += element.cantidad);
      }

      return stats;
      
  }

  private calcularDistribucionHoraria(datos: RegistrosAgrupados) {
    const distribucion = new Array(24).fill(0).map((_, i) => ({
      hora: `${i.toString().padStart(2, '0')}:00`,
      entradas: 0,
      salidas: 0
  }));

    Object.values(datos).forEach(dia => {
      Object.values(dia).forEach(trabajador => {
        // Extraer hora de entrada
        const [horaEntrada] = trabajador.hora_entrada.split(':').map(Number);
        if (horaEntrada >= 0 && horaEntrada < 24) {
          distribucion[horaEntrada].entradas++;
        }

        // Extraer hora de salida
        const [horaSalida] = trabajador.hora_salida.split(':').map(Number);
        if (horaSalida >= 0 && horaSalida < 24) {
          distribucion[horaSalida].salidas++;
        }
      });
    });

    this._estadisticasHorarias = distribucion;
  }
}