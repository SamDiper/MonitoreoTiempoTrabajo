import { Component, Input, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables, PointStyle } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

@Component({
  selector: 'charts',
  templateUrl: './charts.html',
  styleUrl: '../../output.css',
})
export class Charts implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() semanas: any[] = [];
  
  private chart: Chart | null = null;
  private promedio: number = 0;

  ngOnInit() {
    this.crearGrafico();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['semanas'] && !changes['semanas'].firstChange) {
      this.actualizarGrafico();
    }
  }

  crearGrafico() {
    if (this.semanas.length === 0) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Calcular promedio general
    const totalHoras = this.semanas.reduce((sum, s) => sum + s.horasTotales, 0);
    this.promedio = this.semanas.length > 0 ? totalHoras / this.semanas.length : 0;

    // Preparar datos
    const labels = this.semanas.map(s => `Semana ${s.numero}`);
    const horasPorSemana = this.semanas.map(s => s.horasTotales);

    // ⭐ Pre-calcular estilos de los puntos
    const coloresPuntos = horasPorSemana.map(h => 
      h >= this.promedio ? '#10b981' : '#ef4444'
    );

    const estilosPuntos = horasPorSemana.map(h => 
      h >= this.promedio ? 'circle' : 'triangle'
    ) as PointStyle[];

    const tamanosPuntos = horasPorSemana.map(h => {
      const dif = Math.abs(h - this.promedio);
      const pct = (dif / this.promedio) * 100;
      if (pct > 20) return 12;
      if (pct > 10) return 10;
      return 8;
    });

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
            tension: 0, // ⭐ Líneas rectas (cambió de 0.4 a 0)
            
            // ⭐ Estilos dinámicos
            pointBackgroundColor: coloresPuntos,
            pointStyle: estilosPuntos,
            pointRadius: tamanosPuntos,
            
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 10
          },
          {
            label: 'Promedio',
            data: Array(this.semanas.length).fill(this.promedio),
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
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 750 // Reducir animación para renderizado más rápido
        },
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
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                
                if (label === 'Promedio') {
                  return `${label}: ${this.horasDecimalAHHMMSS(Number(value))}`;
                }
                
                const diferencia = Number(value) - this.promedio;
                const porcentaje = ((diferencia / this.promedio) * 100).toFixed(1);
                
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
                yMin: this.promedio,
                yMax: this.promedio,
                borderColor: '#10b981',
                borderWidth: 2,
                borderDash: [10, 5],
                label: {
                  display: true,
                  content: `Promedio: ${this.horasDecimalAHHMMSS(this.promedio)}`,
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

    this.chart = new Chart(ctx, config);
  }

  actualizarGrafico() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.crearGrafico();
  }

  private horasDecimalAHHMMSS(horas: number): string {
    const h = Math.floor(horas);
    const m = Math.floor((horas - h) * 60);
    return `${h}h ${m}m`;
  }

  // ⭐ Método SINCRÓNICO (simple, para uso inmediato)
  public getChartImage(): string {
    if (this.chart) {
      try {
        const image = this.chart.toBase64Image('image/png', 1.0);
        
        // Validar que la imagen no esté vacía
        if (!image || image === 'data:,' || image.length < 100) {
          console.error('Imagen del gráfico vacía o inválida');
          return '';
        }
        
        console.log('✅ Imagen generada correctamente:', image.substring(0, 50) + '...');
        return image;
      } catch (error) {
        console.error('Error al generar imagen del gráfico:', error);
        return '';
      }
    }
    console.warn('No hay gráfico disponible para convertir a imagen');
    return '';
  }

  // ⭐ Método ASÍNCRONO (mejor para PDF, espera renderizado completo)
  public async getChartImageAsync(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.chart) {
        console.warn('No hay gráfico disponible');
        resolve('');
        return;
      }

      // Esperar a que el gráfico termine de renderizarse
      setTimeout(() => {
        try {
          const image = this.chart!.toBase64Image('image/png', 1.0);
          
          // Validar imagen
          if (!image || image === 'data:,' || image.length < 100) {
            console.error('Imagen del gráfico vacía o inválida');
            resolve('');
            return;
          }
          
          console.log('✅ Imagen async generada correctamente:', image.substring(0, 50) + '...');
          resolve(image);
        } catch (error) {
          console.error('Error al generar imagen del gráfico:', error);
          resolve('');
        }
      }, 500); // Esperar medio segundo para asegurar renderizado completo
    });
  }

  // ⭐ Método para forzar renderizado sin animación (ideal para PDF)
  public async getChartImageForPDF(): Promise<string> {
    if (!this.chart) {
      console.warn('No hay gráfico disponible');
      return '';
    }

    return new Promise((resolve) => {
      // Deshabilitar animaciones temporalmente
      const wasAnimated = this.chart!.options.animation;
      if (this.chart!.options.animation) {
        this.chart!.options.animation = false;
      }

      // Forzar actualización
      this.chart!.update('none');

      // Esperar un tick
      setTimeout(() => {
        try {
          const image = this.chart!.toBase64Image('image/png', 1.0);
          
          // Restaurar animaciones
          if (wasAnimated) {
            this.chart!.options.animation = wasAnimated;
          }

          // Validar imagen
          if (!image || image === 'data:,' || image.length < 100) {
            console.error('Imagen del gráfico vacía o inválida');
            resolve('');
            return;
          }
          
          console.log('✅ Imagen PDF generada:', image.substring(0, 50) + '...');
          resolve(image);
        } catch (error) {
          console.error('Error al generar imagen para PDF:', error);
          
          // Restaurar animaciones en caso de error
          if (wasAnimated) {
            this.chart!.options.animation = wasAnimated;
          }
          
          resolve('');
        }
      }, 100);
    });
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}