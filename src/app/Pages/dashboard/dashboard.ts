import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Registro } from '../../../Interfaces/registro';
import { RegistrosService } from '../../../Services/registrosService';
import { PromedioEntradaSalida, ResumenTrabajador } from '../../../Interfaces/registrosIndividuales';
import { App } from '../../app';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: '../../../output.css'
})
export class Dashboard {
  toggleFlagLlegada = true;
  toggleFlagTrabajadas = true;
  publicFuncion = inject(App);
  toggle(opc:string): void {
    if(opc=='T')
    {
      (this.toggleFlagLlegada ? this.toggleSortUp(opc) : this.toggleSortDown(opc));
    }
    else{(this.toggleFlagTrabajadas ? this.toggleSortUp(opc) : this.toggleSortDown(opc));}
  }
  
  registrosHoraLLegada: Registro[] = [];
  registrosHorasTrabajadas: Registro[] = [];

  constructor(private registrosService: RegistrosService) {
    this.registrosHoraLLegada = [...this.registrosService.registros];
    this.registrosHorasTrabajadas = [...this.registrosService.registros];
  }
  
  ngOnInit(): void {
    this.registrosService.registros$.subscribe(data => {
      this.registrosHoraLLegada = data;
      console.log('Registros actualizados:', this.registrosHoraLLegada);
    });
    this.averageHorasTrabajadasAll();
    this.averageHoraSalida();
    this.averageHoraEntrada();
    this.toggleSortUp('T');
    this.toggleSortUp('L');
  }

  toggleSortUp(opc:string): void {
    if(opc==='T'){
      this.registrosHoraLLegada.sort((a, b) => this.publicFuncion.parseTime24(a.hora_inicio) - this.publicFuncion.parseTime24(b.hora_inicio));
      this.toggleFlagLlegada = false;
    }
    else{
      this.registrosHorasTrabajadas.sort((a, b) => this.publicFuncion.tiempoTrabajado24(a.hora_inicio, a.hora_salida) - this.publicFuncion.tiempoTrabajado24(b.hora_inicio, b.hora_salida));
      this.toggleFlagTrabajadas = false;
    }
  }

  toggleSortDown(opc:string): void {
    if(opc==='T'){
      this.registrosHoraLLegada.sort((a, b) => this.publicFuncion.parseTime24(b.hora_inicio) - this.publicFuncion.parseTime24(a.hora_inicio));
      this.toggleFlagLlegada = true;
    }
    else{
      this.registrosHorasTrabajadas.sort((a, b) => this.publicFuncion.tiempoTrabajado24(b.hora_inicio, b.hora_salida) - this.publicFuncion.tiempoTrabajado24(a.hora_inicio, a.hora_salida));
      this.toggleFlagTrabajadas = true;
    }
  }

  averageHoraEntrada(): string {
    if (this.registrosHoraLLegada.length === 0) return '00:00:00';

    var horaEntrada = 0;
    this.registrosHoraLLegada.forEach(element => {
      horaEntrada += this.publicFuncion.parseTime24(element.hora_inicio);      
    });
    
    return this.publicFuncion.segundosToHora24(horaEntrada / this.registrosHoraLLegada.length);
  }

  averageHoraSalida(): string {
    if (this.registrosHoraLLegada.length === 0) return '00:00:00';

    var horaSalida=0;
    this.registrosHoraLLegada.forEach(element => {
      horaSalida += this.publicFuncion.parseTime24(element.hora_salida);      
    });

    return this.publicFuncion.segundosToHora24(horaSalida / this.registrosHoraLLegada.length);
  }

  averageHorasTrabajadasAll(): string {
    if (this.registrosHoraLLegada.length === 0) return '0h 0m';
    var horasTrabajadas = 0;

    this.registrosHoraLLegada.forEach(element => {
      horasTrabajadas += this.publicFuncion.tiempoTrabajado24(element.hora_inicio, element.hora_salida);      
    });
    
    const avg = horasTrabajadas / this.registrosHoraLLegada.length;
    const h = Math.floor(avg / 3600);
    const m = Math.floor((avg % 3600) / 60);
    return `${h}h ${m}min`;
  }


}
