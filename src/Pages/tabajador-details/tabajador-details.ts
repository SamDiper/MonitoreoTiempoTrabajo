import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { RegistroProcessorService } from '../../Services/RegistroAgrupado';

interface DiaCalendario {
  fecha: string;
  dia: number;
  estado: 'normal' | 'falta' | 'novedad' | 'vacio' | 'festivo' | 'finDeSemana';
  horasTrabajadas?: number;
}

@Component({
  selector: 'app-trabajador-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tabajador-details.html',
  styleUrl: '../../output.css',
})
export class TrabajadorDetailsComponent implements OnInit {
  trabajadores: string[] = [];
  trabajadorSeleccionado = '';
  // estadisticas: EstadisticasTrabajador | null = null;
  registrosTrabajador: any[] = [];
  
  // Calendario
  mesActual: Date = new Date();
  diasCalendario: DiaCalendario[] = [];
  
  // Contadores
  diasNormales = 0;
  diasFalta = 0;
  diasNovedad = 0;

  constructor(
    private registroService: RegistroProcessorService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.trabajadores = this.registroService.obtenerTodosTrabajadores();
    
    // Verificar si viene un trabajador en la ruta
    this.route.params.subscribe(params => {
      if (params['nombre']) {
        this.trabajadorSeleccionado = params['nombre'];
        this.cargarDatosTrabajador();
      }
    });
  }

  onTrabajadorChange() {
    if (this.trabajadorSeleccionado) {
      this.cargarDatosTrabajador();
    }
  }

  cargarDatosTrabajador() {
    // this.estadisticas = this.registroService.obtenerEstadisticasTrabajador(this.trabajadorSeleccionado);
    this.registrosTrabajador = this.registroService.obtenerRegistrosTrabajador(this.trabajadorSeleccionado);
    this.generarCalendario();
    this.calcularContadores();
  }

  generarCalendario() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    
    this.diasCalendario = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDia.getDay(); i++) {
      this.diasCalendario.push({
        fecha: '',
        dia: 0,
        estado: 'vacio'
      });
    }
    
    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(año, mes, dia);
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaSemana = fecha.getDay();
      
      let estado: DiaCalendario['estado'] = 'falta';
      let horasTrabajadas = 0;
      
      // Verificar fin de semana
      if (diaSemana === 0 || diaSemana === 6) {
        estado = 'finDeSemana';
      }
      // Verificar festivo
      else if (this.esFestivo(fechaStr)) {
        estado = 'festivo';
      }
      // Verificar si trabajó
      else {
        const registro = this.registrosTrabajador.find(r => r.fecha === fechaStr);
        if (registro) {
          estado = registro.isNovedad ? 'novedad' : 'normal';
          horasTrabajadas = registro.horasTrabajadas;
        }
      }
      
      this.diasCalendario.push({
        fecha: fechaStr,
        dia,
        estado,
        horasTrabajadas
      });
    }
  }

  cambiarMes(direccion: number) {
    this.mesActual.setMonth(this.mesActual.getMonth() + direccion);
    this.mesActual = new Date(this.mesActual);
    this.generarCalendario();
  }

  calcularContadores() {
    this.diasNormales = this.registrosTrabajador.filter(r => !r.isNovedad).length;
    this.diasNovedad = this.registrosTrabajador.filter(r => r.isNovedad).length;
    // this.diasFalta = this.estadisticas?.diasFalta || 0;
  }

  getInitial(): string {
    return this.trabajadorSeleccionado ? this.trabajadorSeleccionado.charAt(0).toUpperCase() : '?';
  }

  // getPorcentajeAsistencia(): number {
  //   if (!this.estadisticas) return 0;
  //   const diasLaborables = this.estadisticas.diasTrabajados + this.estadisticas.diasFalta;
  //   return diasLaborables > 0 ? Math.round((this.estadisticas.diasTrabajados / diasLaborables) * 100) : 0;
  // }

  private esFestivo(fecha: string): boolean {
    const festivos = [
      '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
      '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
      '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
      '2024-11-11', '2024-12-25'
    ];
    return festivos.includes(fecha);
  }
}