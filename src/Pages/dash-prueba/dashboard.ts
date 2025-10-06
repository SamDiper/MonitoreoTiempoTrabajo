import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RegistroProcessorService } from '../../Services/RegistroAgrupado';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: '../../output.css',
})
export class DashboardComponent implements OnInit {
  publicFunction = inject(RegistroProcessorService);
  // Rankings
  rankingEntradas: any[] = [];
  rankingSalidas: any[] = [];
  rankingHoras: any[] = [];
  
  // Toggles
  mostrarEntradasTemprano = true;
  mostrarSalidasTemprano = true;
  mostrarMasHoras = true;
  registro: any = [];
  // Estadísticas generales
  estadisticasGenerales: any = {};

  constructor(private registroService: RegistroProcessorService) {
     this.registro= localStorage.getItem('registros');
  }

  ngOnInit() {
    // this.cargarDatos();
    console.log(this.publicFunction.agruparPorFechaYUsuario(JSON.parse(this.registro) as any[]));
    
  }

  // cargarDatos() {
  //   this.actualizarRankingEntradas();
  //   this.actualizarRankingSalidas();
  //   this.actualizarRankingHoras();
  //   this.estadisticasGenerales = this.registroService.obtenerEstadisticasGenerales();

  // }

  // toggleEntradas() {
  //   this.mostrarEntradasTemprano = !this.mostrarEntradasTemprano;
  //   this.actualizarRankingEntradas();
  // }

  // toggleSalidas() {
  //   this.mostrarSalidasTemprano = !this.mostrarSalidasTemprano;
  //   this.actualizarRankingSalidas();
  // }

  // toggleHoras() {
  //   this.mostrarMasHoras = !this.mostrarMasHoras;
  //   this.actualizarRankingHoras();
  // }

  // private actualizarRankingEntradas() {
  //   this.rankingEntradas = this.registroService.obtenerRankingEntradas(this.mostrarEntradasTemprano);
  // }

  // private actualizarRankingSalidas() {
  //   this.rankingSalidas = this.registroService.obtenerRankingSalidas(this.mostrarSalidasTemprano);
  // }

  // private actualizarRankingHoras() {
  //   this.rankingHoras = this.registroService.obtenerRankingHorasTrabajadas(this.mostrarMasHoras);
  // }
}