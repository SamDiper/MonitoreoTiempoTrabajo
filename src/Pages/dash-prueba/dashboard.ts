import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RegistroProcessorService, RegistrosAgrupados } from '../../Services/RegistroAgrupado';
import { Subscription } from 'rxjs';

interface RangoFrecuencia {
  rango: string;
  cantidad: number;
  porcentaje: number;
  promedioDiario: string;
}

interface TrabajadorStats {
  nombre: string;
  totalHoras: number;
  dias: number;
  promedio: string;
  promedioDecimal: number;
}

interface TrabajadorEntrada {
  nombre: string;
  rangoFrecuente: string;
  horaPromedio: number;
  horaPromedioFormato: string;
  totalDias: number;
  frecuencia: number;
}

interface TrabajadorSalida {
  nombre: string;
  rangoFrecuente: string;
  horaPromedio: number;
  horaPromedioFormato: string;
  totalDias: number;
  frecuencia: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: '../../output.css',
})
export class DashboardComponent implements OnInit, OnDestroy {

  private periodo: 'hoy' | 'semana' | 'mes' | 'siempre' = 'semana';
  private subscription?: Subscription;
  private datosAgrupados: RegistrosAgrupados = {};
  private datosFiltrados: RegistrosAgrupados = {};
  
  // ========== DATOS - FRECUENCIA GENERAL ==========
  private _topRangosEntrada: RangoFrecuencia[] = [];
  private _topRangosSalida: RangoFrecuencia[] = [];
  private _totalEntradas = 0;
  private _totalSalidas = 0;
  private _horaPicoEntrada = 'N/A';
  private _horaPicoSalida = 'N/A';
  private _maxEntradas = 1;
  private _maxSalidas = 1;

  // ========== DATOS - HORAS TRABAJADAS ==========
  trabajadoresArray: TrabajadorStats[] = [];
  promedioGeneral = '00:00:00';
  rankingMasHoras: TrabajadorStats[] = [];
  rankingMasPromedio: TrabajadorStats[] = [];
  
  // ========== DATOS - FRECUENCIA POR TRABAJADOR ==========
  trabajadoresEntradas: TrabajadorEntrada[] = [];
  trabajadoresSalidas: TrabajadorSalida[] = [];
  rankingEntradas: TrabajadorEntrada[] = [];
  rankingSalidas: TrabajadorSalida[] = [];

  // ========== ESTADÍSTICAS GENERALES ==========
  estadisticasGenerales = {
    totalTrabajadores: 0,
    totalDias: 0,
    horasTotales: 0
  };
  
  // ========== TOGGLES ==========
  mostrarMasHoras = true;
  mostrarMayorPromedio = true;
  mostrarEntradaTemprana = true;
  mostrarSalidaTemprana = true;

  constructor(private registroService: RegistroProcessorService) {}

  ngOnInit() {
    this.subscription = this.registroService.registros$.subscribe(agrupados => {
      this.datosAgrupados = agrupados;
      this.actualizarTodo();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  // ======== CARGAR DATOS =========
  private actualizarTodo() {
    this.filtrarDatosPorPeriodo();
    this.calcularTopRangosGenerales();
    this.calcularEstadisticasHoras();
    this.calcularFrecuenciaEntradas();
    this.calcularFrecuenciaSalidas();
    this.actualizarRankings();
    this.calcularEstadisticasGenerales();
  }

  // ========== PERÍODO ==========
  cambiarPeriodo(p: 'hoy' | 'semana' | 'mes' | 'siempre') {
    this.periodo = p;
    this.actualizarTodo();
  }

  periodoSeleccionado() {
    return this.periodo;
  }

  private filtrarDatosPorPeriodo() {
    const fechasFiltradas = this.obtenerFechasPorPeriodo();
    this.datosFiltrados = {};
    fechasFiltradas.forEach(fecha => {
      if (this.datosAgrupados[fecha]) {
        this.datosFiltrados[fecha] = this.datosAgrupados[fecha];
      }
    });
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

  // ========== GETTERS PARA HTML ==========
  totalEntradas() { return this._totalEntradas; }
  totalSalidas() { return this._totalSalidas; }
  horaPickEntrada() { return this._horaPicoEntrada; }
  horaPickSalida() { return this._horaPicoSalida; }
  topRangosEntrada() { return this._topRangosEntrada; }
  topRangosSalida() { return this._topRangosSalida; }
  maxEntradas() { return this._maxEntradas; }
  maxSalidas() { return this._maxSalidas; }

  // ========== CÁLCULO DE RANGOS GENERALES ==========
  private calcularTopRangosGenerales() {
    const rangosEntrada = new Map<string, number>();
    const rangosSalida = new Map<string, number>();

    Object.values(this.datosFiltrados).forEach(dia => {
      Object.values(dia).forEach(trabajador => {
        const rangoEntrada = this.obtenerRango15Min(trabajador.hora_entrada);
        const rangoSalida = this.obtenerRango15Min(trabajador.hora_salida);
        
        rangosEntrada.set(rangoEntrada, (rangosEntrada.get(rangoEntrada) || 0) + 1);
        rangosSalida.set(rangoSalida, (rangosSalida.get(rangoSalida) || 0) + 1);
      });
    });

    const totalDias = Object.keys(this.datosFiltrados).length || 1;

    this._totalEntradas = 0;
    this._totalSalidas = 0;

    this._topRangosEntrada = this.convertirARangoFrecuencia(rangosEntrada, totalDias, 'entrada');
    this._topRangosSalida = this.convertirARangoFrecuencia(rangosSalida, totalDias, 'salida');

    this._maxEntradas = this._topRangosEntrada[0]?.cantidad || 1;
    this._maxSalidas = this._topRangosSalida[0]?.cantidad || 1;
    this._horaPicoEntrada = this._topRangosEntrada[0]?.rango || 'N/A';
    this._horaPicoSalida = this._topRangosSalida[0]?.rango || 'N/A';
  }

  private obtenerRango15Min(hora: string): string {
    if (!hora) return '00:00 - 00:15';
    
    const [h, m] = hora.split(':').map(Number);
    const minutosTotales = h * 60 + m;
    const rangoInicio = Math.floor(minutosTotales / 15) * 15;
    const rangoFin = rangoInicio + 15;
    
    const formatear = (mins: number) => {
      const horas = Math.floor(mins / 60);
      const minutos = mins % 60;
      return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };
    
    return `${formatear(rangoInicio)} - ${formatear(rangoFin)}`;
  }



  private obtenerRangoDesdeDecimal(horaDecimal: number): string {
    const horas = Math.floor(horaDecimal);
    const minutos = Math.floor((horaDecimal - horas) * 60);
    const minutosTotales = horas * 60 + minutos;
    
    const rangoInicio = Math.floor(minutosTotales / 15) * 15;
    const rangoFin = rangoInicio + 15; 
    
    const formatear = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    return `${formatear(rangoInicio)} - ${formatear(rangoFin)}`;
  }

  private convertirARangoFrecuencia(
    rangosMap: Map<string, number>, 
    totalDias: number, 
    tipo: 'entrada' | 'salida'
  ): RangoFrecuencia[] {
    const total = Array.from(rangosMap.values()).reduce((a, b) => a + b, 0) || 1;
    
    const stats = Array.from(rangosMap.entries())
      .map(([rango, cantidad]) => ({
        rango,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100),
        promedioDiario: `${(cantidad / totalDias).toFixed(1)}/día`
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
      
    if (tipo === 'entrada') {
      stats.forEach(e => this._totalEntradas += e.cantidad);
    } else {
      stats.forEach(e => this._totalSalidas += e.cantidad);
    }

    return stats;
  }

  // ========== CÁLCULO DE HORAS TRABAJADAS ==========
  private calcularEstadisticasHoras() {
    const porTrabajador = new Map<string, { totalHoras: number; dias: number }>();

    Object.values(this.datosFiltrados).forEach(dia => {
      Object.entries(dia).forEach(([nombre, trabajador]) => {
        const horasTrabajadas = this.calcularHorasTrabajadas(
          trabajador.hora_entrada, 
          trabajador.hora_salida
        );
        
        if (!porTrabajador.has(nombre)) {
          porTrabajador.set(nombre, { totalHoras: 0, dias: 0 });
        }
        
        const stats = porTrabajador.get(nombre)!;
        stats.totalHoras += horasTrabajadas;
        stats.dias += 1;
      });
    });

    this.trabajadoresArray = Array.from(porTrabajador.entries()).map(([nombre, datos]) => {
      const promedio = datos.dias > 0 ? datos.totalHoras / datos.dias : 0;
      return {
        nombre,
        totalHoras: datos.totalHoras,
        dias: datos.dias,
        promedio: this.formatearHoras(promedio),
        promedioDecimal: promedio
      };
    });

    const totalHoras = this.trabajadoresArray.reduce((sum, t) => sum + t.totalHoras, 0);
    const totalDias = this.trabajadoresArray.reduce((sum, t) => sum + t.dias, 0);
    const promedioGeneralDecimal = totalDias > 0 ? totalHoras / totalDias : 0;
    this.promedioGeneral = this.formatearHoras(promedioGeneralDecimal);
  }

  private calcularHorasTrabajadas(entrada: string, salida: string): number {
    if (!entrada || !salida) return 0;
    
    const [hE, mE, sE = 0] = entrada.split(':').map(Number);
    const [hS, mS, sS = 0] = salida.split(':').map(Number);
    
    const entradaMinutos = hE * 60 + mE + sE / 60;
    const salidaMinutos = hS * 60 + mS + sS / 60;
    
    return (salidaMinutos - entradaMinutos) / 60;
  }

  // ========== CÁLCULO FRECUENCIA ENTRADA POR TRABAJADOR ==========
  private calcularFrecuenciaEntradas() {
    const entradasPorTrabajador = new Map<string, number[]>();

    Object.values(this.datosFiltrados).forEach(dia => {
      Object.entries(dia).forEach(([nombre, trabajador]) => {
        const horaEntrada = trabajador.hora_entrada;
        
        if (horaEntrada && horaEntrada !== '--:--' && horaEntrada.includes(':')) {
          const horaDecimal = this.horaADecimal(horaEntrada);
          
          if (!isNaN(horaDecimal) && horaDecimal > 0) {
            if (!entradasPorTrabajador.has(nombre)) {
              entradasPorTrabajador.set(nombre, []);
            }
            entradasPorTrabajador.get(nombre)!.push(horaDecimal);
          }
        }
      });
    });

    this.trabajadoresEntradas = [];

    entradasPorTrabajador.forEach((entradas, nombre) => {
      if (entradas.length > 0) {
        const sumaHoras = entradas.reduce((acc, h) => acc + h, 0);
        const horaPromedio = sumaHoras / entradas.length;

        const rangos = new Map<string, number>();
        entradas.forEach(hora => {
          const rango = this.obtenerRangoDesdeDecimal(hora);
          rangos.set(rango, (rangos.get(rango) || 0) + 1);
        });

        let rangoFrecuente = '';
        let maxFrecuencia = 0;
        rangos.forEach((frecuencia, rango) => {
          if (frecuencia > maxFrecuencia) {
            maxFrecuencia = frecuencia;
            rangoFrecuente = rango;
          }
        });

        this.trabajadoresEntradas.push({
          nombre,
          rangoFrecuente,
          horaPromedio,
          horaPromedioFormato: this.decimalAHoraHHMM(horaPromedio),
          totalDias: entradas.length,
          frecuencia: maxFrecuencia
        });
      }
    });
  }

  // ========== CÁLCULO FRECUENCIA SALIDA POR TRABAJADOR ==========
  private calcularFrecuenciaSalidas() {
    const salidasPorTrabajador = new Map<string, number[]>();

    Object.values(this.datosFiltrados).forEach(dia => {
      Object.entries(dia).forEach(([nombre, trabajador]) => {
        const horaSalida = trabajador.hora_salida;
        
        if (horaSalida && horaSalida !== '--:--' && horaSalida.includes(':')) {
          const horaDecimal = this.horaADecimal(horaSalida);
          
          if (!isNaN(horaDecimal) && horaDecimal > 0) {
            if (!salidasPorTrabajador.has(nombre)) {
              salidasPorTrabajador.set(nombre, []);
            }
            salidasPorTrabajador.get(nombre)!.push(horaDecimal);
          }
        }
      });
    });

    this.trabajadoresSalidas = [];

    salidasPorTrabajador.forEach((salidas, nombre) => {
      if (salidas.length > 0) {
        const sumaHoras = salidas.reduce((acc, h) => acc + h, 0);
        const horaPromedio = sumaHoras / salidas.length;

        const rangos = new Map<string, number>();
        salidas.forEach(hora => {
          const rango = this.obtenerRangoDesdeDecimal(hora);
          rangos.set(rango, (rangos.get(rango) || 0) + 1);
        });

        let rangoFrecuente = '';
        let maxFrecuencia = 0;
        rangos.forEach((frecuencia, rango) => {
          if (frecuencia > maxFrecuencia) {
            maxFrecuencia = frecuencia;
            rangoFrecuente = rango;
          }
        });

        this.trabajadoresSalidas.push({
          nombre,
          rangoFrecuente,
          horaPromedio,
          horaPromedioFormato: this.decimalAHoraHHMM(horaPromedio),
          totalDias: salidas.length,
          frecuencia: maxFrecuencia
        });
      }
    });
  }

  // ========== ACTUALIZAR RANKINGS ==========
  actualizarRankings() {
    this.actualizarRankingHoras();
    this.actualizarRankingPromedio();
    this.actualizarRankingEntradas();
    this.actualizarRankingSalidas();
  }

  private actualizarRankingHoras() {
    this.rankingMasHoras = [...this.trabajadoresArray]
      .sort((a, b) => this.mostrarMasHoras ? 
        b.totalHoras - a.totalHoras : 
        a.totalHoras - b.totalHoras
      )
      .slice(0, 10);
  }

  private actualizarRankingPromedio() {
    this.rankingMasPromedio = [...this.trabajadoresArray]
      .sort((a, b) => this.mostrarMayorPromedio ? 
        b.promedioDecimal - a.promedioDecimal : 
        a.promedioDecimal - b.promedioDecimal
      )
      .slice(0, 10);
  }


  private extraerHoraDeRango(rango: string): number {
    const inicio = rango.split(' - ')[0];
    const [h, m] = inicio.split(':').map(Number);
    return h + m / 60; // 8.5
  }

  private actualizarRankingEntradas() {
    this.rankingEntradas = [...this.trabajadoresEntradas]
      .sort((a, b) => {
        // Primero: ordenar por frecuencia (quien más veces entra en su rango)
        const frecuenciaDiff = b.frecuencia - a.frecuencia;
        if (frecuenciaDiff !== 0) return frecuenciaDiff;
        
        // Segundo (desempate): ordenar por hora del rango
        const horaA = this.extraerHoraDeRango(a.rangoFrecuente);
        const horaB = this.extraerHoraDeRango(b.rangoFrecuente);
        
        return this.mostrarEntradaTemprana ? 
          horaA - horaB : 
          horaB - horaA;
      })
      .slice(0, 10);
  }

  private actualizarRankingSalidas() {
    this.rankingSalidas = [...this.trabajadoresSalidas]
      .sort((a, b) => {
        // Primero: ordenar por frecuencia (quien más veces sale en su rango)
        const frecuenciaDiff = b.frecuencia - a.frecuencia;
        if (frecuenciaDiff !== 0) return frecuenciaDiff;
        
        // Segundo (desempate): ordenar por hora del rango
        const horaA = this.extraerHoraDeRango(a.rangoFrecuente);
        const horaB = this.extraerHoraDeRango(b.rangoFrecuente);
        
        return this.mostrarSalidaTemprana ? 
          horaA - horaB : 
          horaB - horaA;
      })
      .slice(0, 10);
  }

  // ========== TOGGLES ==========
  toggleHoras() {
    this.mostrarMasHoras = !this.mostrarMasHoras;
    this.actualizarRankingHoras();
  }

  togglePromedio() {
    this.mostrarMayorPromedio = !this.mostrarMayorPromedio;
    this.actualizarRankingPromedio();
  }

  toggleRangosFrecuenciaEntrada() {
    this.mostrarEntradaTemprana = !this.mostrarEntradaTemprana;
    this.actualizarRankingEntradas();
  }

  toggleRangosFrecuenciaSalida() {
    this.mostrarSalidaTemprana = !this.mostrarSalidaTemprana;
    this.actualizarRankingSalidas();
  }

  private calcularEstadisticasGenerales() {
    this.estadisticasGenerales = {
      totalTrabajadores: this.trabajadoresArray.length,
      totalDias: Object.keys(this.datosFiltrados).length,
      horasTotales: this.trabajadoresArray.reduce((sum, t) => sum + t.totalHoras, 0)
    };
  }

  // ========== HELPERS ==========
  horaADecimal(hora: string): number {
    const partes = hora.split(':');
    const horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10) || 0;
    const segundos = parseInt(partes[2], 10) || 0;
    return horas + minutos / 60 + segundos / 3600;
  }

  decimalAHoraHHMM(horaDecimal: number): string {
    const horas = Math.floor(horaDecimal);
    const minutos = Math.round((horaDecimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  formatearHoras(horasDecimal: number): string {
    const horas = Math.floor(horasDecimal);
    const minutos = Math.floor((horasDecimal - horas) * 60);
    const segundos = Math.floor(((horasDecimal - horas) * 60 - minutos) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  calcularAnchoBarra(cantidad: number, max: number): string {
    if (max === 0) return '0%';
    return `${Math.round((cantidad / max) * 100)}%`;
  }

  getMejorPromedio(): TrabajadorStats | null {
    if (this.trabajadoresArray.length === 0) return null;
    return [...this.trabajadoresArray]
      .sort((a, b) => b.promedioDecimal - a.promedioDecimal)[0];
  }

  getMejorEntrada(): TrabajadorEntrada | null {
    if (this.trabajadoresEntradas.length === 0) return null;
    return [...this.trabajadoresEntradas]
      .sort((a, b) => a.horaPromedio - b.horaPromedio)[0];
  }
}