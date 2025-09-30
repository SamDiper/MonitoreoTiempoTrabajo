import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Registro } from '../../../Interfaces/registro';
import { RegistrosService } from '../../../Services/registrosService';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: '../../../output.css'
})
export class Dashboard {
  
  registros: Registro[] = [];
  constructor(private registrosService: RegistrosService) {
    this.registros = this.registrosService.registros; 
  }

  ngOnInit(): void {
    this.registrosService.registros$.subscribe(data => {
      this.registros = data;
      console.log('Registros actualizados:', this.registros);
    });
  }
}
