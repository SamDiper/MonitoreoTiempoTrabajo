import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, annotationPlugin, ChartDataLabels);

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  // 🎯 Valores especiales para identificar tipo de día
  private readonly VALOR_FESTIVO = -1;
  private readonly VALOR_FALTA = -2;

  async generarGraficoSemanal(
    semanas: any[], 
    registrosTrabajador: any[],
    mes: number,
    anio: number,
    festivosPorFecha?: Map<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!semanas || semanas.length === 0) {
          alert('⚠️ No hay semanas para graficar');
          resolve('');
          return;
        }

        if (!registrosTrabajador || registrosTrabajador.length === 0) {
          alert('⚠️ No hay registros para graficar');
          resolve('');
          return;
        }

        // Crear canvas temporal
        const canvas = document.createElement('canvas');
        canvas.width = 1400;
        canvas.height = 700;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          document.body.removeChild(canvas);
          reject('No se pudo obtener el contexto del canvas');
          return;
        }

        // Preparar datos para barras agrupadas
        const { labels, datasets } = this.prepararDatosBarrasAgrupadas(
          ctx, 
          semanas, 
          registrosTrabajador, 
          mes, 
          anio,
          festivosPorFecha
        );
        
        const promedioDiario = this.calcularPromedioDiario(semanas);
        const anotacionesDivisorias = this.crearLineasDivisorias(semanas);
        const rangoEjeY = this.calcularRangoEjeY(datasets, promedioDiario);

        const config: ChartConfiguration = {
          type: 'bar',
          data: {
            labels: labels,
            datasets: datasets
          },
          options: {
            responsive: false,
            animation: false, // Sin animaciones para PDF
            plugins: {
              // 🏷️ Plugin para etiquetas en las barras
              datalabels: {
                anchor: 'center',
                align: 'center',
                rotation: -90,
                font: {
                  size: 11,
                  weight: 'bold'
                },
                color: (context) => {
                  const value = context.dataset.data[context.dataIndex] as number;
                  if (value === this.VALOR_FESTIVO) return '#374151'; // Texto oscuro para festivo
                  if (value === this.VALOR_FALTA) return '#FFFFFF'; // Texto blanco para falta
                  return 'transparent'; // No mostrar en barras normales
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
                  font: { size: 14, weight: 'bold' },
                  padding: 15,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              title: {
                display: true,
                text: 'Horas Trabajadas por Día y Semana',
                font: { size: 20, weight: 'bold' },
                padding: { top: 10, bottom: 30 }
              },
              tooltip: {
                enabled: false // Desactivado para PDF
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
                      font: { size: 14, weight: 'bold' },
                      padding: 8,
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
                  font: { size: 16, weight: 'bold' }
                },
                ticks: {
                  stepSize: 1,
                  callback: (value) => {
                    // No mostrar valores negativos en el eje
                    if (Number(value) < 0) return '';
                    return this.horasDecimalAHHMMSS(Number(value));
                  },
                  font: { size: 13 }
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
                  font: { size: 16, weight: 'bold' }
                },
                ticks: {
                  font: { size: 12, weight: 600 },
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

        const chart = new Chart(ctx, config);

        // Esperar renderizado completo
        setTimeout(() => {
          try {
            const imageBase64 = canvas.toDataURL('image/png', 1.0);
            
            if (!imageBase64 || imageBase64 === 'data:,' || imageBase64 === 'data:image/png;base64,') {
              chart.destroy();
              document.body.removeChild(canvas);
              reject('Error al generar la imagen del gráfico');
            } else {
              chart.destroy();
              document.body.removeChild(canvas);
              resolve(imageBase64);
            }
          } catch (error) {
            chart.destroy();
            document.body.removeChild(canvas);
            reject(error);
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
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

  // 🎯 CREAR LÍNEAS DIVISORIAS ENTRE SEMANAS
  private crearLineasDivisorias(semanas: any[]): any {
    const anotaciones: any = {};
    const diasPorSemana = 5;
    
    for (let i = 1; i < semanas.length; i++) {
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

  // 🔍 Determinar tipo de día
  private determinarTipoDia(fecha: Date, festivosPorFecha?: Map<string, string>): 'festivo' | 'falta' | 'normal' {
    if (!festivosPorFecha) {
      return 'falta';
    }
    
    // Formato: YYYY-MM-DD
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`;
    
    
    // Verificar si es festivo
    if (festivosPorFecha.has(fechaStr)) {
      const nombreFestivo = festivosPorFecha.get(fechaStr);
      return 'festivo';
    }
    
    // Si no hay registro y no es festivo, es falta
    return 'falta';
  }

  // ⭐ PREPARAR DATOS CON FESTIVOS Y FALTAS
  private prepararDatosBarrasAgrupadas(
    ctx: CanvasRenderingContext2D,
    semanas: any[],
    registrosTrabajador: any[],
    mes: number,
    anio: number,
    festivosPorFecha?: Map<string, string>
  ): { labels: string[], datasets: any[] } {
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const coloresDias = {
      'Lun': '#3b82f6',
      'Mar': '#8b5cf6',
      'Mié': '#ec4899',
      'Jue': '#f59e0b',
      'Vie': '#10b981' 
    };

    // Crear labels para el eje X
    const labels: string[] = [];
    semanas.forEach(semana => {
      diasSemana.forEach(dia => {
        labels.push(`S${semana.numero}-${dia}`);
      });
    });

    // Crear datasets (uno por cada día de la semana)
    const datasets: any[] = [];
    
    diasSemana.forEach((dia, diaIndex) => {
      const dataAjustada: (number | null)[] = [];
      
      semanas.forEach((semana) => {
        const registrosSemana = this.obtenerRegistrosDeSemana(semana, registrosTrabajador, mes, anio);
        const horasPorDia = this.organizarHorasPorDia(registrosSemana, semana, mes, anio, festivosPorFecha);
        
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
          
          // 🎨 FESTIVO: Gris transparente
          if (value === this.VALOR_FESTIVO) {
            return 'rgba(156, 163, 175, 0.4)'; // Gray-400 con transparencia
          }
          
          // 🔴 FALTA: Rojo transparente
          if (value === this.VALOR_FALTA) {
            return 'rgba(239, 68, 68, 0.5)'; // Red-500 con transparencia
          }
          
          // ⚪ Sin registro: Patrón dashed
          if (value === 0) {
            return this.crearPatronDashed(ctx, '#94a3b8');
          }
          
          return color;
        },
        borderColor: (context: any) => {
          const value = context.parsed?.y;
          
          if (value === this.VALOR_FESTIVO) {
            return '#6b7280'; // Gray-500
          }
          if (value === this.VALOR_FALTA) {
            return '#dc2626'; // Red-600
          }
          if (value === 0) {
            return '#64748b';
          }
          return color;
        },
        borderWidth: 2,
        barPercentage: 3,
        categoryPercentage: 0.5
      });
    });

    return { labels, datasets };
  }

  private obtenerRegistrosDeSemana(
    semana: any, 
    registrosTrabajador: any[],
    mes: number,
    anio: number
  ): any[] {
    const parsearFecha = (fechaStr: string) => {
      if (fechaStr.includes('/')) {
        return parseInt(fechaStr.split('/')[0]);
      }
      return parseInt(fechaStr);
    };

    const diaInicio = parsearFecha(semana.fechaInicio);
    const diaFin = parsearFecha(semana.fechaFin);
    
    const inicioSemana = new Date(anio, mes, diaInicio);
    const finSemana = new Date(anio, mes, diaFin);
    
    return registrosTrabajador.filter(r => {
      const fechaRegistro = new Date(r.fecha + 'T00:00:00');
      return fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
    });
  }

  private organizarHorasPorDia(
    registros: any[], 
    semana: any,
    mes: number,
    anio: number,
    festivosPorFecha?: Map<string, string>
  ): (number | null)[] {
    const horasPorDia: (number | null)[] = [null, null, null, null, null];
    
    const primerDiaMes = new Date(anio, mes, 1);
    const ultimoDiaMes = new Date(anio, mes + 1, 0);
    
    const parsearFecha = (fechaStr: string) => {
      if (fechaStr.includes('/')) {
        return parseInt(fechaStr.split('/')[0]);
      }
      return parseInt(fechaStr);
    };
    
    const diaInicio = parsearFecha(semana.fechaInicio);
    const diaFin = parsearFecha(semana.fechaFin);
    
    for (let dia = diaInicio; dia <= diaFin; dia++) {
      const fechaDia = new Date(anio, mes, dia);
      const diaSemana = fechaDia.getDay();
      
      if (diaSemana >= 1 && diaSemana <= 5) {
        const indice = diaSemana - 1;
        
        if (fechaDia >= primerDiaMes && fechaDia <= ultimoDiaMes) {
          const registro = registros.find(r => {
            const fechaRegistro = new Date(r.fecha + 'T00:00:00');
            return fechaRegistro.getDate() === dia && 
                   fechaRegistro.getMonth() === mes && 
                   fechaRegistro.getFullYear() === anio;
          });
          
          if (registro) {
            const horas = this.parseHorasTrabajadas(registro.horasTrabajadas);
            horasPorDia[indice] = horas;
          } else {
            // 🎯 Determinar si es festivo o falta
            const tipoDia = this.determinarTipoDia(fechaDia, festivosPorFecha);
            
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

  private calcularPromedioDiario(semanas: any[]): number {
    let totalHoras = 0;
    let totalDias = 0;
    
    semanas.forEach(semana => {
      totalHoras += semana.horasTotales;
      totalDias += semana.diasTrabajados;
    });
    
    return totalDias > 0 ? totalHoras / totalDias : 0;
  }

  private calcularRangoEjeY(datasets: any[], promedioDiario: number): { min: number, max: number } {
    let maxHoras = -Infinity;

    datasets.forEach(dataset => {
      dataset.data.forEach((horas: any) => {
        // Solo contar valores positivos para el rango
        if (horas !== null && horas !== undefined && horas > 0) {
          maxHoras = Math.max(maxHoras, horas);
        }
      });
    });

    if (maxHoras === -Infinity) {
      return { min: -2.5, max: 10 }; // Espacio para FESTIVO y FALTA
    }

    maxHoras = Math.max(maxHoras, promedioDiario);
    const padding = maxHoras * 0.15;

    return {
      min: -2.5, 
      max: maxHoras + padding
    };
  }

  private horasDecimalAHHMMSS(horas: number): string {
    const h = Math.floor(Math.abs(horas));
    const m = Math.floor((Math.abs(horas) - h) * 60);
    const signo = horas < 0 ? '-' : '';
    return `${signo}${h}h ${m}m`;
  }
}