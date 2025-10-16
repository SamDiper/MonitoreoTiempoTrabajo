// calendar-generator.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class calendarioService {

  async generarCalendarioImagen(diasCalendario: any[], mes: string, anio: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!diasCalendario || diasCalendario.length === 0) {
          console.warn('No hay días para generar el calendario');
          resolve('');
          return;
        }

        // Crear canvas temporal
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 700;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          document.body.removeChild(canvas);
          reject('No se pudo obtener el contexto del canvas');
          return;
        }

        // Configuración
        const cellSize = 100;
        const headerHeight = 80;
        const titleHeight = 60;
        const padding = 20;
        const startX = padding;
        const startY = titleHeight + padding;

        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Título
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${mes} ${anio}`, canvas.width / 2, 40);

        // Encabezados de días
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#4b5563';
        
        diasSemana.forEach((dia, index) => {
          const x = startX + (index * cellSize) + (cellSize / 2);
          const y = startY + 25;
          ctx.textAlign = 'center';
          ctx.fillText(dia, x, y);
        });

        // Dibujar días del calendario
        let currentRow = 0;
        let currentCol = 0;

        diasCalendario.forEach((diaInfo, index) => {
          currentCol = index % 7;
          currentRow = Math.floor(index / 7);

          const x = startX + (currentCol * cellSize);
          const y = startY + headerHeight + (currentRow * cellSize);

          // Determinar color de fondo según el estado
          let bgColor = '#f3f4f6'; 
          let textColor = '#9ca3af';

          if (diaInfo.dia > 0) {
            switch (diaInfo.estado) {
              case 'normal':
                bgColor = '#22c55e'; // verde
                textColor = '#ffffff';
                break;
              case 'falta':
                bgColor = '#ef4444'; // rojo
                textColor = '#ffffff';
                break;
              case 'novedad':
                bgColor = '#fbbf24'; // amarillo
                textColor = '#1f2937';
                break;
              case 'finDeSemana':
              case 'festivo':
              case 'vacio':
                bgColor = '#f3f4f6'; // gris
                textColor = '#9ca3af';
                break;
            }
          }

          // Dibujar celda con borde redondeado
          this.dibujarCeldaRedondeada(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 8, bgColor);

          // Dibujar número del día
          if (diaInfo.dia > 0) {
            ctx.fillStyle = textColor;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(diaInfo.dia.toString(), x + cellSize / 2, y + cellSize / 2);
          }
        });

        // Esperar a que se renderice
        setTimeout(() => {
          try {
            const imageBase64 = canvas.toDataURL('image/png', 1.0);
            
            if (!imageBase64 || imageBase64 === 'data:,') {
              console.error('Imagen del calendario vacía');
              reject('Error al generar imagen del calendario');
            } else {
              ('✅ Calendario generado correctamente');
              document.body.removeChild(canvas);
              resolve(imageBase64);
            }
          } catch (error) {
            console.error('Error al convertir calendario a imagen:', error);
            document.body.removeChild(canvas);
            reject(error);
          }
        }, 500);

      } catch (error) {
        console.error('Error en generarCalendarioImagen:', error);
        reject(error);
      }
    });
  }

  private dibujarCeldaRedondeada(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor: string
  ) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

}