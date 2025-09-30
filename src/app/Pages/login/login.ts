import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Registro } from '../../../Interfaces/registro';
import { RegistrosService } from '../../../Services/registrosService';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['../../../output.css']
})
export class Login {
  currentYear = new Date().getFullYear();

  username = '';
  password = '';

  selectedFile?: File;
  fileError?: string;

  registros: Registro[] = [];

  constructor(private router: Router, private registrosService: RegistrosService) {}

  ngOnInit(): void {
    try { localStorage.clear(); } catch {}
  }

  onFileSelected(event: Event): void {
    this.fileError = undefined;
    this.registros = [];

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.selectedFile = undefined;
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['csv', 'xls', 'xlsx'];

    if (!ext || !allowed.includes(ext)) {
      this.fileError = 'Solo se permiten archivos .csv, .xls o .xlsx';
      this.selectedFile = undefined;
      input.value = '';
      return;
    }

    this.selectedFile = file;

    if (ext === 'csv') {
      this.readCsv(file);
    } else {
      this.readExcel(file);
    }
  }

  private readExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,            
          dateNF: 'dd/mm/yyyy'
        });

        this.registros = rows.map((row: any, idx: number) => ({
          id: idx + 1,
          nombre: (row.nombre ?? row.Nombre ?? row.NOMBRE ?? '').toString(),
          hora_inicio: (row.hora_inicio ?? row['hora inicio'] ?? row.HORA_INICIO ?? '').toString(),
          hora_salida: (row.hora_salida ?? row['hora salida'] ?? row.HORA_SALIDA ?? '').toString(),
          fecha: (row.fecha ?? row.Fecha ?? row.FECHA ?? '').toString(),
        }));

        this.registrosService.setRegistros(this.registros);

        if (this.registros.length === 0) {
          this.fileError = 'El archivo no contiene filas válidas';
          this.selectedFile = undefined;
        }
      } catch (err) {
        console.error(err);
        this.fileError = 'No se pudo leer el archivo Excel';
        this.selectedFile = undefined;
      }
    };
    reader.onerror = () => {
      this.fileError = 'Error leyendo el archivo';
      this.selectedFile = undefined;
    };
    reader.readAsArrayBuffer(file);
  }

  private async readCsv(file: File): Promise<void> {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) {
        this.fileError = 'CSV vacío';
        this.selectedFile = undefined;
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idxNombre = headers.indexOf('nombre');
      const idxInicio = headers.indexOf('hora_inicio');
      const idxSalida = headers.indexOf('hora_salida');
      const idxFecha  = headers.indexOf('fecha');

      this.registros = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.trim());
        return {
          id: i + 1,
          nombre: (idxNombre >= 0 ? cols[idxNombre] : cols[0]) || '',
          hora_inicio: (idxInicio >= 0 ? cols[idxInicio] : '') || '',
          hora_salida: (idxSalida >= 0 ? cols[idxSalida] : '') || '',
          fecha: (idxFecha >= 0 ? cols[idxFecha] : '') || '',
        } as Registro;
        
      });
      
      if (this.registros.length === 0) {
        this.fileError = 'El archivo no contiene filas válidas';
        this.selectedFile = undefined;
      }
    } catch (e) {
      console.error(e);
      this.fileError = 'No se pudo leer el CSV';
      this.selectedFile = undefined;
    }
  }

  canSubmit(): boolean {
    return !!this.username && !!this.password && !!this.selectedFile && this.registros.length > 0;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      this.fileError = 'Complete usuario, contraseña y cargue un archivo válido';
      return;
    }

    if (this.username === 'monitoreo' && this.password === '.') {
      try { 
          localStorage.setItem('session', 'active');
          localStorage.setItem('token','ey213mnbkjasnd2131naskjdn2131');
       } catch {}
      this.router.navigate(['dashboard']);
    } else {
      this.fileError = 'Usuario o contraseña incorrectos';
    }
  }
}