import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import 'chart.js/auto';
import type { ChartData, ChartOptions } from 'chart.js';
import { Registro } from '../../../Interfaces/registro';
import { RegistrosService } from '../../../Services/registrosService';
import { App } from '../../app';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './details.html',
  styleUrl: '../../../output.css'
})
export class Details {
  publicFuncion = inject(App);

  registrosTrabajadores: Registro[] = [];

  constructor(private registrosService: RegistrosService) {
    this.registrosTrabajadores = [...this.registrosService.registros];
  }

  inicialNombre="---";
  totalHorasTrabajadas: any ="-";
  porcentajeAsistencias: any ="-";
  promedioHoraEntrada = "---";
  promedioHoraSalida = "---";
  promedioHorasTrabajadas: any ="---";
  datosTrabajadorEntrada: any;
  datosTrabajador: any;


  mapInfoTrabajador(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.inicialNombre = selectElement.value.charAt(0).toUpperCase();
    this.datosTrabajadorEntrada = this.publicFuncion.calcularPromedioEntradaSalidaPorTrabajador(this.registrosTrabajadores).find((item) => item.nombre === selectElement.value);
    this.datosTrabajador = this.publicFuncion.procesarDatosPorTrabajador(this.registrosTrabajadores).find((item) => item.nombre === selectElement.value);
    
    this.promedioHoraEntrada = this.datosTrabajadorEntrada.promedioEntradaFormateado ?? "---";
    this.promedioHoraSalida = this.datosTrabajadorEntrada.promedioSalidaFormateado ?? "---";

    this.totalHorasTrabajadas = this.datosTrabajador.totalHorasTrabajadas != null ? (this.datosTrabajador.totalHorasTrabajadas / 3600) : 0;
    this.promedioHorasTrabajadas = this.totalHorasTrabajadas/this.datosTrabajador.registros.length;

  }


  current = signal(new Date());

  prevMonth() {
    const d = new Date(this.current());
    d.setMonth(d.getMonth() - 1);
    this.current.set(d);
  }
  nextMonth() {
    const d = new Date(this.current());
    d.setMonth(d.getMonth() + 1);
    this.current.set(d);
  }
  goToday() {
    this.current.set(new Date());
  }

  // Utilidades de fechas
  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private startOfWeek(d: Date, weekStartsOn: 0 | 1 = 1) {
    const x = this.startOfDay(d);
    const day = x.getDay(); // 0=Dom ... 6=Sáb
    const diff = (day - weekStartsOn + 7) % 7; // si weekStartsOn=1 → lunes
    x.setDate(x.getDate() - diff);
    return x;
  }
  private startOfMonthGrid(d: Date, weekStartsOn: 0 | 1 = 1) {
    return this.startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1), weekStartsOn);
  }
  private buildMonthGrid(d: Date, weekStartsOn: 0 | 1 = 1) {
    const start = this.startOfMonthGrid(d, weekStartsOn);
    return Array.from({ length: 42 }, (_, i) => this.addDays(start, i)); // 6 filas x 7 columnas
  }

  // Datos para la vista
  monthDays = computed(() => this.buildMonthGrid(this.current(), 1)); // 1 = semana empieza en Lunes

  // Helpers de estilo
  isSameMonth(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  isToday(d: Date) {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

    barData: ChartData<'bar'> = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Horas trabajadas',
        data: [8, 7, 9, 8, 6, 0, 0],
        backgroundColor: '#1e2838',
        borderRadius: 6
      }
    ]
  };

    barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    },
      plugins: {
      legend: { display: true, position: 'bottom' }
    }
  };
}
