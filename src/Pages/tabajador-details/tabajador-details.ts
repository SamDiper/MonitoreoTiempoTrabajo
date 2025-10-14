import { ActivatedRoute, RouterModule } from "@angular/router";
import { RegistroProcessorService } from "../../Services/RegistroAgrupado";
import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { FestivosService } from "../../Services/FestivosService";
import { PdfGeneratorService } from "../../Services/pdfService";
import { Charts } from "../charts/charts";

interface DiaCalendario {
  fecha: string;
  dia: number;
  estado: 'normal' | 'falta' | 'novedad' | 'vacio' | 'festivo' | 'finDeSemana' ;
  horasTrabajadas?: string;
  nombreFestivo?:string;
}

interface SemanaMes {
  numero: number;
  diasTrabajados: number;
  horasTotales: number;
  promedio: number;
  fechaInicio: string;
  fechaFin: string;
}

interface EstadisticasTrabajador {
  totalHoras: number; 
  totalHorasGeneral: number; 
  promedioDiario: number;
  promedioSemanal: number;
  promedioMensual: number; 
  porcentajeAsistencia: number;
  porcentajeInasistencia: number;
  porcentajeNovedades: number;
  frecuenciaEntrada: { rango: string; cantidad: number; porcentaje: number }[];
  frecuenciaSalida: { rango: string; cantidad: number; porcentaje: number }[];
  mesesTrabajados: number; 
}

interface RegistroTrabajador {
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  isNovedad: boolean;
  horasTrabajadas: string;
}

@Component({
  selector: 'app-trabajador-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Charts],
  templateUrl: './tabajador-details.html',
  styleUrl: '../../output.css',
  
})

export class TrabajadorDetailsComponent {

  pdfService = inject(PdfGeneratorService);
  service = inject(RegistroProcessorService);
  festivosService = inject(FestivosService);

  trabajadores: string[] = [];
  trabajadorSeleccionado = '';
  estadisticas: EstadisticasTrabajador | null = null;
  registrosTrabajador: RegistroTrabajador[] = [];
  // Calendario
  diasCalendario: DiaCalendario[] = [];

  mesActual: Date = new Date();
  mesSeleccionado: number = new Date().getMonth();
  anioSeleccionado: number = new Date().getFullYear();
  meses: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  anios: number[] = [];

  // Estadisticas semanales
  semanas: SemanaMes[] = [];

  // Contadores
  diasNormales = 0;
  diasFalta = 0;
  diasNovedad = 0;
  porcentajeAsistencias=0;
  porcentajeInasistencias=0;
  porcentajeNovedades=0;

  // ========== MODAL ==========
  mostrarModal = false;
  diaSeleccionado: {
    fecha: string;
    dia: number;
    estado: string;
    horaEntrada?: string;
    horaSalida?: string;
    horasTrabajadas?: string;
    isNovedad?: boolean;
  } | null = null;

  promedioGlobal: number = 0;


  // Método para abrir el modal
  abrirModalDia(dia: DiaCalendario) {
    // Solo abrir modal si es un día con datos
    if (dia.dia === 0 || dia.estado === 'vacio') {
      return;
    }

    // Buscar el registro del día
    const registro = this.registrosTrabajador.find(r => r.fecha === dia.fecha);

    // Formatear la fecha
    const fecha = new Date(dia.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });

    this.diaSeleccionado = {
      fecha: fechaFormateada,
      dia: dia.dia,
      estado: this.getEstadoTexto(dia.estado),
      horaEntrada: registro?.hora_entrada,
      horaSalida: registro?.hora_salida,
      horasTrabajadas: registro?.horasTrabajadas,
      isNovedad: registro?.isNovedad
    };

    this.mostrarModal = true;
  }

  // Método para cerrar el modal
  cerrarModal() {
    this.mostrarModal = false;
    this.diaSeleccionado = null;
  }

  // Método auxiliar para obtener el texto del estado
  private getEstadoTexto(estado: DiaCalendario['estado']): string {
    const estados: Record<DiaCalendario['estado'], string> = {
      'normal': 'Día trabajado',
      'falta': 'Falta',
      'novedad': 'Día con novedad',
      'vacio': 'Sin datos',
      'festivo': 'Día festivo',
      'finDeSemana': 'Fin de semana'
    };
    return estados[estado] || 'Desconocido';
  }

  // Método para obtener el color del badge del estado
  getEstadoColor(estado: string): string {
    if (estado.includes('trabajado')) return 'bg-green-100 text-green-800';
    if (estado.includes('Falta')) return 'bg-red-100 text-red-800';
    if (estado.includes('novedad')) return 'bg-amber-100 text-amber-800';
    if (estado.includes('festivo')) return 'bg-blue-100 text-blue-800';
    if (estado.includes('semana')) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  }
  
  constructor(
    private registroService: RegistroProcessorService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.generarAnios();
    
    this.trabajadores = this.registroService.obtenerTodosTrabajadores();
    
    this.route.params.subscribe(params => {
      if (params['nombre']) {
        this.trabajadorSeleccionado = params['nombre'];
        this.cargarDatosTrabajador();
      }
    });

  }

  generarAnios() {
    const anioActual = new Date().getFullYear();
    const rangoAnios = 10;
    
    for (let i = anioActual - rangoAnios; i <= anioActual + rangoAnios; i++) {
      this.anios.push(i);
    }
  }

  onTrabajadorChange() {
    if (this.trabajadorSeleccionado) {
      const hoy = new Date();
      this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.mesSeleccionado = hoy.getMonth();
      this.anioSeleccionado = hoy.getFullYear();
      
      this.cargarDatosTrabajador();
    }
  }

  cargarDatosTrabajador() {
    this.registrosTrabajador = this.registroService.obtenerRegistrosTrabajador(this.trabajadorSeleccionado);
    this.calcularEstadisticas();
    this.generarCalendario();
    this.calcularContadores();
    console.log('registros trabajador',this.registrosTrabajador);
    
    
  }

  // ============= MÉTODOS DE CÁLCULO DE ESTADÍSTICAS =============

  calcularEstadisticas() {
    if (!this.registrosTrabajador || this.registrosTrabajador.length === 0) {
      this.estadisticas = null;      
      return;
    }

    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    
    // Filtrar registros del mes actual
    const registrosDelMes = this.registrosTrabajador.filter(r => {
      const fechaRegistro = new Date(r.fecha);
      return fechaRegistro.getFullYear() === año && fechaRegistro.getMonth() === mes;
    });

    // ======== NUEVOS CÁLCULOS GENERALES ========
    
    // Calcular total de horas GENERALES (todos los registros)
    const totalHorasGeneral = this.calcularTotalHoras(this.registrosTrabajador);
    
    // Calcular meses trabajados
    const mesesTrabajados = this.calcularMesesTrabajados(this.registrosTrabajador);
    
    // Calcular promedio mensual real
    const promedioMensualReal = mesesTrabajados > 0 ? totalHorasGeneral / mesesTrabajados : 0;

    // ======== CÁLCULOS DEL MES ACTUAL ========
    
    const totalHorasMesActual = this.calcularTotalHoras(registrosDelMes);
    
    const diasLaborables = this.calcularDiasLaborables(año, mes);
    
    // Calcular asistencias
    const diasTrabajados = registrosDelMes.length;
    const diasFaltados = diasLaborables - diasTrabajados;
    const diasConNovedad = registrosDelMes.filter(r => r.isNovedad).length;

    this.estadisticas = {
      totalHoras: totalHorasMesActual,
      totalHorasGeneral: totalHorasGeneral,
      promedioDiario: diasTrabajados > 0 ? totalHorasMesActual / diasTrabajados : 0,
      promedioSemanal: this.promedioGlobal,
      promedioMensual: promedioMensualReal, 
      porcentajeAsistencia: this.porcentajeAsistencias,
      porcentajeInasistencia: this.porcentajeInasistencias,
      porcentajeNovedades: this.porcentajeNovedades,
      frecuenciaEntrada: this.calcularFrecuenciaHoraria(registrosDelMes, 'entrada'),
      frecuenciaSalida: this.calcularFrecuenciaHoraria(registrosDelMes, 'salida'),
      mesesTrabajados: mesesTrabajados
    };

    console.log('estadistica ', this.estadisticas);
  }

  private calcularMesesTrabajados(registros: RegistroTrabajador[]): number {
    const mesesUnicos = new Set<string>();
    
    registros.forEach(registro => {
      const fecha = new Date(registro.fecha);
      const mesAño = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      mesesUnicos.add(mesAño);
    });

    this.calcularPromediosSemanales();
    return mesesUnicos.size;
  }

  private calcularTotalHoras(registros: RegistroTrabajador[]): number {
    let totalMinutos = 0;
    
    registros.forEach(registro => {
      const minutos = this.parseHorasTrabajadas(registro.horasTrabajadas);
      totalMinutos += minutos;
    });
    
    return totalMinutos / 60; // Convertir a horas
  }

  private parseHorasTrabajadas(horasStr: string): number {
    // Parsear formato: "07h : 16min : 25seg" a minutos totales
    const match = horasStr.match(/(\d+)h\s*:\s*(\d+)min\s*:\s*(\d+)seg/);
    
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = parseInt(match[2]);
      const segundos = parseInt(match[3]);
      
      return (horas * 60) + minutos + (segundos / 60);
    }
    
    return 0;
  }

  private calcularDiasLaborables(año: number, mes: number): number {
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    let diasLaborables = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(año, mes, dia);
      fecha.setHours(0, 0, 0, 0);
      
      // Solo contar días pasados o el día actual
      if (fecha > hoy) {
        break;
      }
      
      const diaSemana = fecha.getDay();
      const fechaStr = fecha.toISOString().split('T')[0];
      
    }
    
    return diasLaborables;
  }

  private calcularFrecuenciaHoraria(
    registros: RegistroTrabajador[], 
    tipo: 'entrada' | 'salida'
  ): { rango: string; cantidad: number; porcentaje: number }[] {
    const rangos = new Map<string, number>();
    const horaKey = tipo === 'entrada' ? 'hora_entrada' : 'hora_salida';
    
    registros.forEach(registro => {
      const hora = registro[horaKey];
      const rango = this.obtenerRangoHorario(hora);
      rangos.set(rango, (rangos.get(rango) || 0) + 1);
    });
    
    const total = registros.length;
    const frecuencias = Array.from(rangos.entries())
      .map(([rango, cantidad]) => ({
        rango,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100)
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
    
    return frecuencias;
  }

  private obtenerRangoHorario(hora: string): string {
    const [horaNum, minutos] = hora.split(':').map(Number);
    
    let rangoInicio: string;
    let rangoFin: string;
    
    if (minutos < 15) {
      rangoInicio = `${horaNum.toString().padStart(2, '0')}:00`;
      rangoFin = `${horaNum.toString().padStart(2, '0')}:15`;
    } else if (minutos < 30) {
      rangoInicio = `${horaNum.toString().padStart(2, '0')}:15`;
      rangoFin = `${horaNum.toString().padStart(2, '0')}:30`;
    } else if (minutos < 45) {
      rangoInicio = `${horaNum.toString().padStart(2, '0')}:30`;
      rangoFin = `${horaNum.toString().padStart(2, '0')}:45`;
    } else {
      rangoInicio = `${horaNum.toString().padStart(2, '0')}:45`;
      rangoFin = `${horaNum.toString().padStart(2, '0')}:59`;
    }
    
    return `${rangoInicio} - ${rangoFin}`;
  }


  cambiarFecha() {
    this.mesActual = new Date(this.anioSeleccionado, this.mesSeleccionado, 1);
    this.cargarFestivosAño(this.anioSeleccionado);
    if (this.trabajadorSeleccionado) {
      this.calcularEstadisticas();
      this.generarCalendario();
      this.calcularContadores();
    }

    
  }

  cambiarMes(direccion: number) {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + direccion, 1);
    this.mesSeleccionado = this.mesActual.getMonth();
    this.anioSeleccionado = this.mesActual.getFullYear();
    this.cargarFestivosAño(this.anioSeleccionado); 
    if (this.trabajadorSeleccionado) {
      this.calcularEstadisticas();
      this.generarCalendario();
      this.calcularContadores();
    }
    
  }

  irAHoy() {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.mesSeleccionado = hoy.getMonth();
    this.anioSeleccionado = hoy.getFullYear();
    if (this.trabajadorSeleccionado) {
      this.calcularEstadisticas();
      this.generarCalendario();
      this.calcularContadores();
    }
  }

  generarCalendario() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    this.diasCalendario = [];

    // Días vacíos al inicio
    for (let i = 0; i < primerDia.getDay(); i++) {
      this.diasCalendario.push({ fecha: '', dia: 0, estado: 'vacio' });
    }

    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(año, mes, dia);
      // IMPORTANTE: formar el string sin toISOString para evitar desfase
      const fechaStr = `${año}-${String(mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
      const diaSemana = fecha.getDay();

      let estado: DiaCalendario['estado'] = 'falta';
      let horasTrabajadas = '';
      let nombreFestivo: string | undefined;

      // Festivo
      if (this.esFestivo(fechaStr)) {
        estado = 'festivo';
        nombreFestivo = this.getNombreFestivo(fechaStr);
      }
      // Fin de semana
      else if (diaSemana === 0 || diaSemana === 6) {

        const registro = this.registrosTrabajador.find(r => r.fecha === fechaStr);
        if (registro) {
          estado = registro.isNovedad ? 'novedad' : 'normal';
          horasTrabajadas = this.service.horasDecimalAHHMMSS(this.parseHorasTrabajadas(registro.horasTrabajadas) / 60);
        } else {
          estado = 'finDeSemana';
        }
      }
      // 3) Día Laboral
      else {
        const registro = this.registrosTrabajador.find(r => r.fecha === fechaStr);
        if (registro) {
          estado = registro.isNovedad ? 'novedad' : 'normal';
          horasTrabajadas = this.service.horasDecimalAHHMMSS(this.parseHorasTrabajadas(registro.horasTrabajadas) / 60);
        } else {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fecha.setHours(0, 0, 0, 0);
          estado = fecha > hoy ? 'vacio' : 'falta';
        }
      }

      this.diasCalendario.push({
        fecha: fechaStr,
        dia,
        estado,
        horasTrabajadas,
        nombreFestivo // opcional, útil para el modal y title
      });
    }
  }

  calcularContadores() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    
    const mesStr = String(mes + 1).padStart(2, '0'); // mes + 1 porque getMonth() es 0-based
    const añoMesStr = `${año}-${mesStr}`;
    
    const registrosDelMes = this.registrosTrabajador.filter(r => {
      return r.fecha.startsWith(añoMesStr);
    });
    
    this.diasFalta=0;
    this.diasNormales=0;
    this.diasNovedad=0;
    console.log('registros del mes',registrosDelMes);
    
    registrosDelMes.forEach(element => {
      if(element.isNovedad==true){        
          this.diasNovedad++;
      }
      else{
        this.diasNormales++;
      }
    });

    this.diasFalta = this.diasCalendario.filter(d => d.estado === 'falta').length;
    
    var diasTrabajados=this.diasFalta+this.diasNormales+this.diasNovedad;
    this.porcentajeAsistencias=((diasTrabajados)>0 ? ((this.diasNormales+this.diasNovedad)/diasTrabajados)*100 : 0);
    this.porcentajeInasistencias=((diasTrabajados)>0 ? (this.diasFalta/diasTrabajados)*100 : 0);
    this.porcentajeNovedades=((diasTrabajados)>0 ? (this.diasNovedad/diasTrabajados)*100 : 0);

  }

  getInitial(): string {
    return this.trabajadorSeleccionado ? this.trabajadorSeleccionado.charAt(0).toUpperCase() : '?';
  }

  getPorcentajeAsistencia(): number {
    return Math.round(this.porcentajeAsistencias);
  }

private cargarFestivosAño(año: number) {

  if (this.añosFestivosCargados.has(año)) return;

  this.festivosService.obtenerFestivos(año).subscribe(festivos => {
    festivos.forEach(f => {
      this.festivosPorFecha.set(f.date, f.localName || f.name);
    });
    this.añosFestivosCargados.add(año);

    if (this.mesActual.getFullYear() === año) {
      this.generarCalendario();
    }
  });

}

  private festivosPorFecha = new Map<string, string>();
  private añosFestivosCargados = new Set<number>();

  private esFestivo(fecha: string): boolean {
    return this.festivosPorFecha.has(fecha);
  }

  private getNombreFestivo(fecha: string): string | undefined {
    return this.festivosPorFecha.get(fecha);
  }

  private calcularPromediosSemanales() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    
    // Obtener primer y último día del mes
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    
    this.semanas = [];
    let numeroSemana = 1;
    let totalHorasTodasLasSemanas = 0;
    
    // Empezar desde el primer día del mes
    let fechaActual = new Date(primerDia);
    
    while (fechaActual <= ultimoDia) {
      // Calcular inicio de la semana (puede ser el día actual o el lunes de esa semana)
      let inicioSemana = new Date(fechaActual);
      
      // Si no es lunes (1) y no es la primera semana, retroceder al lunes
      if (fechaActual.getDay() !== 1 && numeroSemana > 1) {
        // Retroceder al lunes de esta semana
        const diasHastaLunes = fechaActual.getDay() === 0 ? 6 : fechaActual.getDay() - 1;
        inicioSemana = new Date(fechaActual);
        inicioSemana.setDate(fechaActual.getDate() - diasHastaLunes);
      }
      
      // Si el inicio calculado es antes del primer día del mes, ajustar
      if (inicioSemana < primerDia) {
        inicioSemana = new Date(primerDia);
      }
      
      // Calcular fin de la semana (domingo o último día del mes)
      let finSemana = new Date(inicioSemana);
      const diasHastaDomingo = inicioSemana.getDay() === 0 ? 0 : 7 - inicioSemana.getDay();
      finSemana.setDate(inicioSemana.getDate() + diasHastaDomingo);
      
      // Si el fin es después del último día del mes, ajustar
      if (finSemana > ultimoDia) {
        finSemana = new Date(ultimoDia);
      }
      
      // Obtener registros de esta semana
      const registrosSemana = this.registrosTrabajador.filter(r => {
        const fechaRegistro = new Date(r.fecha + 'T00:00:00');
        return fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
      });
      
      // Calcular estadísticas de la semana
      const diasTrabajados = registrosSemana.length;
      const horasTotales = this.calcularTotalHoras(registrosSemana);
      totalHorasTodasLasSemanas += horasTotales;
      const promedio = diasTrabajados > 0 ? horasTotales / diasTrabajados : 0;
      
      // Formatear fechas para mostrar
      const diaInicio = inicioSemana.getDate();
      const diaFin = finSemana.getDate();
      const mesInicio = inicioSemana.getMonth();
      const mesFin = finSemana.getMonth();
      
      // Si cruza meses, mostrar el mes también
      let fechaInicioStr = `${diaInicio}`;
      let fechaFinStr = `${diaFin}`;
      
      if (mesInicio !== mes) {
        fechaInicioStr = `${diaInicio}/${mesInicio + 1}`;
      }
      if (mesFin !== mes) {
        fechaFinStr = `${diaFin}/${mesFin + 1}`;
      }
      
      this.semanas.push({
        numero: numeroSemana,
        diasTrabajados,
        horasTotales,
        promedio,
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
      });
      
      numeroSemana++;
      
      // Avanzar al día siguiente después del fin de esta semana
      fechaActual = new Date(finSemana);
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    this.promedioGlobal = this.semanas.length > 0 ? 
      totalHorasTodasLasSemanas / this.semanas.length : 0;
    
    console.log('Semanas calculadas:', this.semanas);
  }

    descargarPDF() {
    this.pdfService.generarReporteTrabajador({
      trabajador: this.trabajadorSeleccionado,
      mes: this.meses[this.mesSeleccionado],
      anio: this.anioSeleccionado,
      estadisticas: this.estadisticas,
      diasCalendario: this.diasCalendario,
      semanas: this.semanas,
      diasNormales: this.diasNormales,
      diasFalta: this.diasFalta,
      diasNovedad: this.diasNovedad
    });


  }
  
}