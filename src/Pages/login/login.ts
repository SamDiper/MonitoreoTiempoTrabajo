import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Registro } from '../../Interfaces/registro';
import * as XLSX from 'xlsx';
import { RegistroProcessorService } from '../../Services/RegistroAgrupado';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: '../../output.css',
})
export class Login {
  currentYear = new Date().getFullYear();

  username = '';
  password = '';

  selectedFile?: File;
  fileError?: string;

  registros: Registro[] = [];

  constructor(private router: Router, private registrosService: RegistroProcessorService) {}

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
          User: (row.User || row.user || row.USER || '').toString().trim(),
          WorkId: (row.WorkId || row.workid || row.WORKID || '').toString().trim(),
          CardNo: (row.CardNo || row.cardno || row.CARDNO || '').toString().trim(),
          Date: (row.Date || row.date || row.DATE || '').toString().trim(),
          Time: (row.Time || row.time || row.TIME || '').toString().trim(),
          IN_OUT: (row['IN/OUT'] || row['in/out'] || row['In/Out'] || '').toString().trim(),
          EventCode: (row.EventCode || row.eventcode || row.EVENTCODE || '').toString().trim()
        }));

        this.registrosService.setRegistros(this.registros);

        if (this.registros.length === 0) {
          this.fileError = 'El archivo no contiene filas válidas';
          this.selectedFile = undefined;
        }
      } catch (err) {
        console.error('Error leyendo Excel:', err);
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

    const headers = lines[0].split(',').map(h => h.trim());

    this.registros = lines.slice(1).map((line, i) => {
      const cols = this.parseSpecialCSVLine(line);
      
      return {
        id: i + 1,
        User: this.cleanValue(cols[0] || ''),
        WorkId: this.cleanValue(cols[1] || ''),
        CardNo: this.cleanValue(cols[2] || ''),
        Date: this.cleanValue(cols[3] || ''),
        Time: this.cleanValue(cols[4] || ''),
        IN_OUT: this.cleanValue(cols[5] || ''),
        EventCode: this.cleanValue(cols[6] || '')
      } as Registro;
    });

    console.log('Registros procesados:', this.registros);
    this.registrosService.setRegistros(this.registros);
    
    if (this.registros.length === 0) {
      this.fileError = 'El archivo no contiene filas válidas';
      this.selectedFile = undefined;
    }
  } catch (e) {
    console.error('Error leyendo CSV:', e);
    this.fileError = 'No se pudo leer el CSV';
    this.selectedFile = undefined;
  }
}

// Parser especial para manejar el formato con comillas mal balanceadas
private parseSpecialCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    // Si encontramos una comilla al inicio
    if ((char === "'" || char === '"') && current.length === 0) {
      i++; // Saltar la comilla inicial
      // Buscar hasta la siguiente coma o fin de línea
      while (i < line.length && line[i] !== ',') {
        current += line[i];
        i++;
      }
      result.push(current);
      current = '';
      if (line[i] === ',') i++; // Saltar la coma
    }
    // Si es una coma y no estamos dentro de un valor
    else if (char === ',') {
      result.push(current);
      current = '';
      i++;
    }
    // Cualquier otro carácter
    else {
      current += char;
      i++;
    }
  }
  
  // Agregar el último valor si existe
  if (current.length > 0 || line[line.length - 1] === ',') {
    result.push(current);
  }
  
  // Asegurar que siempre tengamos 7 columnas
  while (result.length < 7) {
    result.push('');
  }
  
  return result;
}

// Función para limpiar valores
private cleanValue(value: string): string {
  if (!value) return '';
  
  // Remover comillas al inicio y final si existen
  value = value.replace(/^['"]|['"]$/g, '');
  
  // Remover espacios en blanco al inicio y final
  value = value.trim();
  
  // Si el valor es 'NULL' (string), convertir a vacío o mantenerlo según tu preferencia
  if (value.toUpperCase() === 'NULL') {
    return ''; // O puedes retornar 'NULL' si prefieres mantenerlo
  }
  
  return value;
}

  canSubmit(): boolean {
    return !!this.username && !!this.password && !!this.selectedFile && this.registros.length > 0;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      this.fileError = 'Complete usuario, contraseña y cargue un archivo válido';
      return;
    }

    if (this.username === 'monitoreo' && this.password === 'm0nitor3o.123') {
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