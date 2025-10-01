export interface Registro {
    id: number;
    nombre: string;
    hora_inicio: string;
    hora_salida: string;
    fecha: string;
}

export interface ResumenTrabajador {
    nombre: string;
    totalHorasTrabajadas: number;
    registros: Registro[];
}

export interface PromedioEntradaSalida {
    nombre: string;
    promedioEntradaSegundos: number; 
    promedioEntradaFormateado: string; 
    promedioSalidaSegundos: number;
    promedioSalidaFormateado: string;
}