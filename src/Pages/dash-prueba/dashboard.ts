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
estadisticasGenerales: any = {};
  trabajadoresArray: any[] = [];
  promedioGeneral = '';
  
  // Rankings
  rankingMasHoras: any[] = [];
  rankingMenosHoras: any[] = [];
  rankingMasPromedio: any[] = [];
  
  // Toggles
  mostrarMasHoras = true;

  constructor(private registroService: RegistroProcessorService) {}

  ngOnInit() {
    this.cargarEstadisticas();
    console.log('horas: ',this.rankingMasHoras);
    console.log('promedio: ', this.rankingMasPromedio);
  }

  cargarEstadisticas() {
    const stats = this.registroService.calcularPromediosHorasTrabajadas();
    
    this.trabajadoresArray = Array.from(stats.porTrabajador.entries()).map(([nombre, datos]) => ({
      nombre,
      totalHoras: datos.totalHoras,
      dias: datos.dias,
      promedio: datos.promedio,
      promedioDecimal: this.registroService.horasHHMMSSADecimal(datos.promedio)
    }));
    
    this.promedioGeneral = stats.promedioGeneral;    
    this.actualizarRankings();
  }

  actualizarRankings() {
    // Ranking por total de horas
    this.rankingMasHoras = [...this.trabajadoresArray]
      .sort((a, b) => this.mostrarMasHoras ? 
        b.totalHoras - a.totalHoras : 
        a.totalHoras - b.totalHoras
      )
      .slice(0, 5);
    
    // Ranking por promedio diario
    this.rankingMasPromedio = [...this.trabajadoresArray]
      .sort((a, b) => b.promedioDecimal - a.promedioDecimal)
      .slice(0, 5);
  }

  toggleHoras() {
    this.mostrarMasHoras = !this.mostrarMasHoras;
    this.actualizarRankings();
  }

  // Helper para formatear
  formatearHoras(horasDecimal: number): string {
    return this.registroService.horasDecimalAHHMMSS(horasDecimal);
  }
}