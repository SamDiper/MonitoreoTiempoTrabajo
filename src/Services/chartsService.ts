// chart-generator.service.ts
import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, registerables, PointStyle } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

@Injectable({
  providedIn: 'root'
})
export class chartsService {

  async generarGraficoSemanal(semanas: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Validar datos
        if (!semanas || semanas.length === 0) {
          console.warn('No hay semanas para graficar');
          resolve('');
          return;
        }

        // Calcular promedio general
        const totalHoras = semanas.reduce((sum, s) => sum + s.horasTotales, 0);
        const promedio = semanas.length > 0 ? totalHoras / semanas.length : 0;

        // Preparar datos
        const labels = semanas.map(s => `Semana ${s.numero}`);
        const horasPorSemana = semanas.map(s => s.horasTotales);

        // ⭐ Pre-calcular estilos de los puntos (IGUAL QUE EL COMPONENTE)
        const coloresPuntos = horasPorSemana.map(h => 
          h >= promedio ? '#10b981' : '#ef4444'
        );

        const estilosPuntos = horasPorSemana.map(h => 
          h >= promedio ? 'circle' : 'triangle'
        ) as PointStyle[];

        const tamanosPuntos = horasPorSemana.map(h => {
          const dif = Math.abs(h - promedio);
          const pct = (dif / promedio) * 100;
          if (pct > 20) return 12;
          if (pct > 10) return 10;
          return 8;
        });

        // Crear canvas temporal
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          document.body.removeChild(canvas);
          reject('No se pudo obtener el contexto del canvas');
          return;
        }

        const config: ChartConfiguration = {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Horas Trabajadas',
                data: horasPorSemana,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0, // Líneas rectas
                
                pointBackgroundColor: coloresPuntos,
                pointStyle: estilosPuntos,
                pointRadius: tamanosPuntos,
                
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 10
              },
              {
                label: 'Promedio',
                data: Array(semanas.length).fill(promedio),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [10, 5],
                pointRadius: 0,
                fill: false,
                tension: 0
              }
            ]
          },
          options: {
            responsive: false, // Tamaño fijo para PDF
            animation: false, // Sin animación para renderizado inmediato
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: { size: 14, weight: 'bold' },
                  usePointStyle: true,
                  padding: 20
                }
              },
              title: {
                display: true,
                text: 'Horas Trabajadas por Semana vs Promedio',
                font: { size: 18, weight: 'bold' },
                padding: { top: 10, bottom: 30 }
              },
              tooltip: {
                enabled: true, // Aunque no se use en PDF, mantener coherencia
                callbacks: {
                  label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    
                    if (label === 'Promedio') {
                      return `${label}: ${this.horasDecimalAHHMMSS(Number(value))}`;
                    }
                    
                    const diferencia = Number(value) - promedio;
                    const porcentaje = ((diferencia / promedio) * 100).toFixed(1);
                    
                    return [
                      `${label}: ${this.horasDecimalAHHMMSS(Number(value))}`,
                      `Diferencia: ${diferencia >= 0 ? '+' : ''}${this.horasDecimalAHHMMSS(Math.abs(diferencia))}`,
                      `${diferencia >= 0 ? '↑' : '↓'} ${Math.abs(Number(porcentaje))}% del promedio`
                    ];
                  }
                }
              },
              annotation: {
                annotations: {
                  promedioLine: {
                    type: 'line',
                    yMin: promedio,
                    yMax: promedio,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    label: {
                      display: true,
                      content: `Promedio: ${this.horasDecimalAHHMMSS(promedio)}`,
                      position: 'end',
                      backgroundColor: '#10b981',
                      color: 'white',
                      font: { size: 12, weight: 'bold' },
                      padding: 6,
                      borderRadius: 4
                    }
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Horas Totales',
                  font: { size: 14, weight: 'bold' }
                },
                ticks: {
                  callback: (value) => this.horasDecimalAHHMMSS(Number(value)),
                  font: { size: 12 }
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Semanas del Mes',
                  font: { size: 14, weight: 'bold' }
                },
                ticks: {
                  font: { size: 12 }
                },
                grid: {
                  display: false
                }
              }
            }
          }
        };

        // Crear el gráfico
        const chart = new Chart(ctx, config);

        // ⭐ Esperar a que el gráfico se renderice completamente
        setTimeout(() => {
          try {
            const imageBase64 = canvas.toDataURL('image/png', 1.0);
            
            // Validar imagen
            if (!imageBase64 || imageBase64 === 'data:,' || imageBase64.length < 100) {
              console.error('La imagen generada está vacía o inválida');
              reject('Error al generar la imagen del gráfico');
            } else {
              console.log('✅ Imagen generada correctamente:', imageBase64.substring(0, 50) + '...');
              
              // Limpiar
              chart.destroy();
              document.body.removeChild(canvas);
              
              resolve(imageBase64);
            }
          } catch (error) {
            console.error('Error al convertir canvas a imagen:', error);
            
            // Limpiar en caso de error
            try {
              chart.destroy();
              if (document.body.contains(canvas)) {
                document.body.removeChild(canvas);
              }
            } catch (cleanupError) {
              console.error('Error al limpiar recursos:', cleanupError);
            }
            
            reject(error);
          }
        }, 500); // Medio segundo para asegurar renderizado completo

      } catch (error) {
        console.error('Error en generarGraficoSemanal:', error);
        reject(error);
      }
    });
  }

  /**
   * Convierte horas decimales a formato legible
   */
  private horasDecimalAHHMMSS(horas: number): string {
    const h = Math.floor(horas);
    const m = Math.floor((horas - h) * 60);
    return `${h}h ${m}m`;
  }

  /**
   * Método alternativo con dimensiones personalizadas
   */
  async generarGraficoSemanalCustom(
    semanas: any[], 
    width: number = 1200, 
    height: number = 600
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!semanas || semanas.length === 0) {
          console.warn('No hay semanas para graficar');
          resolve('');
          return;
        }

        const totalHoras = semanas.reduce((sum, s) => sum + s.horasTotales, 0);
        const promedio = semanas.length > 0 ? totalHoras / semanas.length : 0;
        const labels = semanas.map(s => `Semana ${s.numero}`);
        const horasPorSemana = semanas.map(s => s.horasTotales);

        const coloresPuntos = horasPorSemana.map(h => 
          h >= promedio ? '#10b981' : '#ef4444'
        );

        const estilosPuntos = horasPorSemana.map(h => 
          h >= promedio ? 'circle' : 'triangle'
        ) as PointStyle[];

        const tamanosPuntos = horasPorSemana.map(h => {
          const dif = Math.abs(h - promedio);
          const pct = (dif / promedio) * 100;
          if (pct > 20) return 16; // Tamaños más grandes para imágenes grandes
          if (pct > 10) return 14;
          return 12;
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          document.body.removeChild(canvas);
          reject('No se pudo obtener el contexto del canvas');
          return;
        }

        const config: ChartConfiguration = {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Horas Trabajadas',
                data: horasPorSemana,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0,
                pointBackgroundColor: coloresPuntos,
                pointStyle: estilosPuntos,
                pointRadius: tamanosPuntos,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 10
              },
              {
                label: 'Promedio',
                data: Array(semanas.length).fill(promedio),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [10, 5],
                pointRadius: 0,
                fill: false,
                tension: 0
              }
            ]
          },
          options: {
            responsive: false,
            animation: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: { size: 16, weight: 'bold' },
                  usePointStyle: true,
                  padding: 20
                }
              },
              title: {
                display: true,
                text: 'Horas Trabajadas por Semana vs Promedio',
                font: { size: 20, weight: 'bold' },
                padding: { top: 15, bottom: 35 }
              },
              annotation: {
                annotations: {
                  promedioLine: {
                    type: 'line',
                    yMin: promedio,
                    yMax: promedio,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    label: {
                      display: true,
                      content: `Promedio: ${this.horasDecimalAHHMMSS(promedio)}`,
                      position: 'end',
                      backgroundColor: '#10b981',
                      color: 'white',
                      font: { size: 14, weight: 'bold' },
                      padding: 8,
                      borderRadius: 4
                    }
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Horas Totales',
                  font: { size: 16, weight: 'bold' }
                },
                ticks: {
                  callback: (value) => this.horasDecimalAHHMMSS(Number(value)),
                  font: { size: 14 }
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Semanas del Mes',
                  font: { size: 16, weight: 'bold' }
                },
                ticks: {
                  font: { size: 14 }
                },
                grid: {
                  display: false
                }
              }
            }
          }
        };

        const chart = new Chart(ctx, config);

        setTimeout(() => {
          try {
            const imageBase64 = canvas.toDataURL('image/png', 1.0);
            
            if (!imageBase64 || imageBase64 === 'data:,' || imageBase64.length < 100) {
              console.error('La imagen generada está vacía o inválida');
              reject('Error al generar la imagen del gráfico');
            } else {
              console.log('✅ Imagen custom generada correctamente');
              chart.destroy();
              document.body.removeChild(canvas);
              resolve(imageBase64);
            }
          } catch (error) {
            console.error('Error al convertir canvas a imagen:', error);
            try {
              chart.destroy();
              if (document.body.contains(canvas)) {
                document.body.removeChild(canvas);
              }
            } catch (cleanupError) {
              console.error('Error al limpiar recursos:', cleanupError);
            }
            reject(error);
          }
        }, 500);

      } catch (error) {
        console.error('Error en generarGraficoSemanalCustom:', error);
        reject(error);
      }
    });
  }
}