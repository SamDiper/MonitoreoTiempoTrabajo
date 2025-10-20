import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, annotationPlugin, ChartDataLabels);

@Component({
  selector: 'charts',
  templateUrl: './charts.html',
  styleUrl: '../../output.css',
})
export class Charts implements OnChanges, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() semanas: any[] = [];
  @Input() registrosTrabajador: any[] = [];
  @Input() mes: number = 0;
  @Input() anio: number = 0;
  @Input() festivosPorFecha: Map<string, string> = new Map();
  
  private chart: Chart | null = null;
  private chartPendiente = false;

  private readonly VALOR_FESTIVO = -1;
  private readonly VALOR_FALTA = -2;

  ngAfterViewInit() {
    if (this.semanas.length > 0 && this.registrosTrabajador.length > 0) {
      setTimeout(() => {
        this.crearGrafico();
      }, 0);
    } else {
      this.chartPendiente = true;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    
    if (changes['semanas'] || changes['registrosTrabajador']) {
      if (this.chartCanvas) {
        this.actualizarGrafico();
      } else {
        this.chartPendiente = true;
      }
    }
  }

  crearGrafico() {

    if (!this.chartCanvas) {
      alert('❌ Canvas no disponible todavía');
      return;
    }

    if (!this.semanas || this.semanas.length === 0) {
      alert('⚠️ No hay semanas');
      return;
    }

    if (!this.registrosTrabajador || this.registrosTrabajador.length === 0) {
      alert('⚠️ No hay registros del trabajador');
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      alert('❌ No se pudo obtener el contexto del canvas');
      return;
    }

    const { labels, datasets } = this.prepararDatosBarrasAgrupadas(ctx);
    const promedioDiario = this.calcularPromedioDiario();
    const anotacionesDivisorias = this.crearLineasDivisorias();
    const rangoEjeY = this.calcularRangoEjeY(datasets, promedioDiario);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        plugins: {
          datalabels: {
            anchor: 'center',
            align: 'center',
            rotation: -90,
            font: {
              size: 10,
              weight: 'bold'
            },
            color: (context) => {
              const value = context.dataset.data[context.dataIndex] as number;
              if (value === this.VALOR_FESTIVO) return '#374151'; 
              if (value === this.VALOR_FALTA) return '#FFFFFF';
              return 'transparent';
            },
            formatter: (value) => {
              if (value === this.VALOR_FESTIVO) return 'FESTIVO';
              if (value === this.VALOR_FALTA) return 'FALTA';
              return '';
            }
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 13, weight: 'bold' },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          title: {
            display: true,
            text: 'Horas Trabajadas por Día y Semana',
            font: { size: 18, weight: 'bold' },
            padding: { top: 10, bottom: 30 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                
                if (value === this.VALOR_FESTIVO) {
                  return `${context.dataset.label}: DÍA FESTIVO`;
                }
                if (value === this.VALOR_FALTA) {
                  return `${context.dataset.label}: FALTA`;
                }
                if (value === 0) {
                  return `${context.dataset.label}: Sin registro (0h)`;
                }
                return `${context.dataset.label}: ${this.horasDecimalAHHMMSS(Number(value))}`;
              },
              afterLabel: (context) => {
                const value = context.parsed.y;
                if (value === this.VALOR_FESTIVO || value === this.VALOR_FALTA || value === 0) {
                  return '';
                }
                if (value == null) {
                  return '';
                }
                const diferencia = value - promedioDiario;
                const signo = diferencia >= 0 ? '+' : '';
                return `Vs Promedio: ${signo}${this.horasDecimalAHHMMSS(diferencia)}`;
              }
            }
          },
          annotation: {
            annotations: {
              promedioLine: {
                type: 'line',
                yMin: promedioDiario,
                yMax: promedioDiario,
                borderColor: '#d97706',
                borderWidth: 3,
                borderDash: [10, 5],
                label: {
                  display: true,
                  content: `Promedio: ${this.horasDecimalAHHMMSS(promedioDiario)}`,
                  position: 'end',
                  backgroundColor: '#d97706',
                  color: 'white',
                  font: { size: 12, weight: 'bold' },
                  padding: 6,
                  borderRadius: 4
                }
              },
              ...anotacionesDivisorias
            }
          }
        },
        scales: {
          y: {
            min: rangoEjeY.min,
            max: rangoEjeY.max,
            title: {
              display: true,
              text: 'Horas Trabajadas',
              font: { size: 14, weight: 'bold' }
            },
            ticks: {
              stepSize: 1,
              callback: (value) => {
                if (Number(value) < 0) return '';
                return this.horasDecimalAHHMMSS(Number(value));
              },
              font: { size: 11 }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.08)',
              lineWidth: 1
            }
          },
          x: {
            title: {
              display: true,
              text: 'Días de la Semana por Semana del Mes',
              font: { size: 14, weight: 'bold' }
            },
            ticks: {
              font: { size: 11, weight: 600 },
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    try {
      this.chart = new Chart(ctx, config);
    } catch (error) {
      alert('❌ Error al crear el gráfico:', error);
    }
  }

  private crearLineasDivisorias(): any {
    const anotaciones: any = {};
    const diasPorSemana = 5;
    
    for (let i = 1; i < this.semanas.length; i++) {
      const posicion = i * diasPorSemana - 0.5;
      
      anotaciones[`divisoria_semana_${i}`] = {
        type: 'line',
        xMin: posicion,
        xMax: posicion,
        borderColor: '#94a3b8',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: false
        }
      };
    }
    
    return anotaciones;
  }

  private prepararDatosBarrasAgrupadas(ctx: CanvasRenderingContext2D): { labels: string[], datasets: any[] } {
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const coloresDias = {
      'Lun': '#3b82f6',
      'Mar': '#8b5cf6',
      'Mié': '#ec4899',
      'Jue': '#f59e0b',
      'Vie': '#10b981' 
    };

    const labels: string[] = [];
    this.semanas.forEach(semana => {
      diasSemana.forEach(dia => {
        labels.push(`S${semana.numero}-${dia}`);
      });
    });

    const datasets: any[] = [];
    
    diasSemana.forEach((dia, diaIndex) => {
      const dataAjustada: (number | null)[] = [];
      
      this.semanas.forEach((semana) => {
        const registrosSemana = this.obtenerRegistrosDeSemana(semana);
        const horasPorDia = this.organizarHorasPorDia(registrosSemana, semana);
        
        diasSemana.forEach((d, i) => {
          if (i === diaIndex) {
            const valor = horasPorDia[i];
            dataAjustada.push(valor === null ? null : valor);
          } else {
            dataAjustada.push(null);
          }
        });
      });

      const color = coloresDias[dia as keyof typeof coloresDias];

      datasets.push({
        label: dia,
        data: dataAjustada,
        backgroundColor: (context: any) => {
          const value = context.parsed?.y;
          
          if (value === this.VALOR_FESTIVO) {
            return 'rgba(156, 163, 175, 0.4)'; 
          }
          
          if (value === this.VALOR_FALTA) {
            return 'rgba(239, 68, 68, 0.5)'; 
          }
          
          if (value === 0) {
            return this.crearPatronDashed(ctx, '#94a3b8');
          }
          
          return color;
        },
        borderColor: (context: any) => {
          const value = context.parsed?.y;
          
          if (value === this.VALOR_FESTIVO) {
            return '#6b7280'; 
          }
          if (value === this.VALOR_FALTA) {
            return '#dc2626';
          }
          if (value === 0) {
            return '#64748b';
          }
          return color;
        },
        borderWidth: 2,
        barPercentage: 3,
        categoryPercentage: 0.65
      });
    });

    return { labels, datasets };
  }

  private crearPatronDashed(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | string {
    const patternCanvas = document.createElement('canvas');
    const patternContext = patternCanvas.getContext('2d');
    
    if (!patternContext) return color;
    
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    
    patternContext.strokeStyle = color;
    patternContext.lineWidth = 2;
    patternContext.beginPath();
    patternContext.moveTo(0, 10);
    patternContext.lineTo(10, 0);
    patternContext.stroke();
    
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    return pattern || color;
  }

  private determinarTipoDia(fecha: Date): 'festivo' | 'falta' | 'normal' {
    const fechaStr = fecha.toISOString().split('T')[0];
    
    if (this.festivosPorFecha.has(fechaStr)) {
      return 'festivo';
    }
    
    return 'falta';
  }

  private obtenerRegistrosDeSemana(semana: any): any[] {
    const parsearFecha = (fechaStr: string) => {
      if (fechaStr.includes('/')) {
        return parseInt(fechaStr.split('/')[0]);
      }
      return parseInt(fechaStr);
    };

    const diaInicio = parsearFecha(semana.fechaInicio);
    const diaFin = parsearFecha(semana.fechaFin);
    
    const inicioSemana = new Date(this.anio, this.mes, diaInicio);
    const finSemana = new Date(this.anio, this.mes, diaFin);
    
    return this.registrosTrabajador.filter(r => {
      const fechaRegistro = new Date(r.fecha + 'T00:00:00');
      return fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
    });
  }

  private organizarHorasPorDia(registros: any[], semana: any): (number | null)[] {
    const horasPorDia: (number | null)[] = [null, null, null, null, null];
    
    const primerDiaMes = new Date(this.anio, this.mes, 1);
    const ultimoDiaMes = new Date(this.anio, this.mes + 1, 0);
    
    const parsearFecha = (fechaStr: string) => {
      if (fechaStr.includes('/')) {
        return parseInt(fechaStr.split('/')[0]);
      }
      return parseInt(fechaStr);
    };
    
    const diaInicio = parsearFecha(semana.fechaInicio);
    const diaFin = parsearFecha(semana.fechaFin);
    
    for (let dia = diaInicio; dia <= diaFin; dia++) {
      const fechaDia = new Date(this.anio, this.mes, dia);
      const diaSemana = fechaDia.getDay();
      
      if (diaSemana >= 1 && diaSemana <= 5) {
        const indice = diaSemana - 1;
        
        if (fechaDia >= primerDiaMes && fechaDia <= ultimoDiaMes) {
          const registro = registros.find(r => {
            const fechaRegistro = new Date(r.fecha + 'T00:00:00');
            return fechaRegistro.getDate() === dia && 
                   fechaRegistro.getMonth() === this.mes && 
                   fechaRegistro.getFullYear() === this.anio;
          });
          
          if (registro) {
            const horas = this.parseHorasTrabajadas(registro.horasTrabajadas);
            horasPorDia[indice] = horas;
          } else {
            const tipoDia = this.determinarTipoDia(fechaDia);
            
            if (tipoDia === 'festivo') {
              horasPorDia[indice] = this.VALOR_FESTIVO;
            } else if (tipoDia === 'falta') {
              horasPorDia[indice] = this.VALOR_FALTA;
            } else {
              horasPorDia[indice] = 0;
            }
          }
        }
      }
    }
    
    return horasPorDia;
  }

  private parseHorasTrabajadas(horasStr: string): number {
    const match = horasStr.match(/(\d+)h\s*:\s*(\d+)min\s*:\s*(\d+)seg/);
    
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = parseInt(match[2]);
      const segundos = parseInt(match[3]);
      return horas + (minutos / 60) + (segundos / 3600);
    }
    
    return 0;
  }

  private calcularPromedioDiario(): number {
    return 8.5;
  }

  private calcularRangoEjeY(datasets: any[], promedioDiario: number): { min: number, max: number } {
    let maxHoras = -Infinity;

    datasets.forEach(dataset => {
      dataset.data.forEach((horas: any) => {
        if (horas !== null && horas !== undefined && horas > 0) {
          maxHoras = Math.max(maxHoras, horas);
        }
      });
    });

    if (maxHoras === -Infinity) {
      return { min: -2.5, max: 10 }; 
    }

    maxHoras = Math.max(maxHoras, promedioDiario);
    const padding = maxHoras * 0.15;

    return {
      min: -2.5,
      max: maxHoras + padding
    };
  }

  actualizarGrafico() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.crearGrafico();
  }

  private horasDecimalAHHMMSS(horas: number): string {
    const h = Math.floor(Math.abs(horas));
    const m = Math.floor((Math.abs(horas) - h) * 60);
    const signo = horas < 0 ? '-' : '';
    return `${signo}${h}h ${m}m`;
  }

  public async getChartImageForPDF(): Promise<string> {
    if (!this.chart) {
      alert('⚠️ Chart no disponible para PDF');
      return '';
    }

    return new Promise((resolve) => {
      const wasAnimated = this.chart!.options.animation;
      
      if (this.chart!.options.animation) {
        this.chart!.options.animation = false;
      }

      this.chart!.update('none');

      setTimeout(() => {
        try {
          const image = this.chart!.toBase64Image('image/png', 1.0);
          
          if (wasAnimated) {
            this.chart!.options.animation = wasAnimated;
          }

          if (!image || image === 'data:,' || image.length < 100) {
            alert('❌ Imagen PDF vacía o inválida');
            resolve('');
            return;
          }
          
          resolve(image);
        } catch (error) {
            alert(`❌ Error al generar imagen para PDF: ${error}`);
          if (wasAnimated) {
            this.chart!.options.animation = wasAnimated;
          }
          resolve('');
        }
      }, 500);
    });
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}