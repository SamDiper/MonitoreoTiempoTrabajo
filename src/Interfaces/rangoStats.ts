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