// pdf-generator.service.ts
import { inject, Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { chartsService } from './chartsService';
import { RegistroProcessorService } from './RegistroAgrupado';

pdfMake.vfs = pdfFonts.vfs;

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  service=inject(RegistroProcessorService)
  constructor(private chartService: chartsService) {}

  async generarReporteTrabajador(data: {
    trabajador: string;
    mes: string;
    anio: number;
    estadisticas: any;
    diasCalendario: any[];
    semanas: any[];
    diasNormales: number;
    diasFalta: number;
    diasNovedad: number;
  }) {
    
    // Generar gráfico
    const graficoBase64 = await this.chartService.generarGraficoSemanal(data.semanas);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      
      header: {
        margin: [40, 20],
        columns: [
          { text: 'Reporte de Asistencia', style: 'header' },
          { text: `${data.mes} ${data.anio}`, style: 'headerRight', alignment: 'right' }
        ]
      },

      content: [
        // Título y datos del trabajador
        { text: data.trabajador, style: 'title' },
        { text: `Mes de ${data.mes} ${data.anio}`, style: 'subtitle' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 20] },

        // Resumen de horas
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Total Horas Trabajadas', style: 'label' },
                { text: this.service.horasDecimalAHHMMSS(data.estadisticas.totalHoras), style: 'value' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Promedio Diario', style: 'label' },
                { text: this.service.horasDecimalAHHMMSS(data.estadisticas.promedioDiario), style: 'value' }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // Estadísticas en grid
        {
          style: 'tableExample',
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Entrada Frecuente', style: 'tableHeader' },
                { text: 'Salida Frecuente', style: 'tableHeader' },
                { text: 'Total Horas General', style: 'tableHeader' }
              ],
              [
                { text: data.estadisticas.frecuenciaEntrada[0]?.rango || 'N/A', style: 'tableCell' },
                { text: data.estadisticas.frecuenciaSalida[0]?.rango || 'N/A', style: 'tableCell' },
                { text: this.service.horasDecimalAHHMMSS(data.estadisticas.totalHorasGeneral), style: 'tableCell' }
              ],
              [
                { text: `${data.estadisticas.frecuenciaEntrada[0]?.porcentaje || 0}% de las veces`, style: 'tableCellSmall' },
                { text: `${data.estadisticas.frecuenciaSalida[0]?.porcentaje || 0}% de las veces`, style: 'tableCellSmall' },
                { text: 'Acumulado total', style: 'tableCellSmall' }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // Asistencias
        { text: 'Resumen de Asistencias', style: 'sectionTitle', margin: [0, 20, 0, 10] },
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [
              [
                { text: 'Días Aprobados', style: 'tableHeader', fillColor: '#22c55e', color: 'white' },
                { text: 'Faltas', style: 'tableHeader', fillColor: '#ef4444', color: 'white' },
                { text: 'Novedades', style: 'tableHeader', fillColor: '#fbbf24', color: 'white' },
                { text: 'Total Trabajados', style: 'tableHeader', fillColor: '#1f2937', color: 'white' }
              ],
              [
                { text: `${data.diasNormales} (${this.calcularPorcentaje(data.diasNormales, data.diasNormales + data.diasFalta + data.diasNovedad)}%)`, style: 'tableCell' },
                { text: `${data.diasFalta} (${this.calcularPorcentaje(data.diasFalta, data.diasNormales + data.diasFalta + data.diasNovedad)}%)`, style: 'tableCell' },
                { text: `${data.diasNovedad} (${this.calcularPorcentaje(data.diasNovedad, data.diasNormales + data.diasFalta + data.diasNovedad)}%)`, style: 'tableCell' },
                { text: data.diasNormales + data.diasNovedad, style: 'tableCell', bold: true }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // GRÁFICO DE SEMANAS
        { text: 'Evolución Semanal', style: 'sectionTitle', margin: [0, 20, 0, 10] },
        {
          image: graficoBase64,
          width: 500,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },

        // Promedios por semana (tabla detallada)
        { text: 'Detalle por Semana', style: 'sectionTitle', margin: [0, 20, 0, 10], pageBreak: 'before' },
        ...this.generarTablaSemanas(data.semanas)
      ],

      styles: {
        header: { fontSize: 14, bold: true, color: '#1f2937' },
        headerRight: { fontSize: 10, color: '#6b7280' },
        title: { fontSize: 22, bold: true, color: '#1f2937', margin: [0, 0, 0, 5] },
        subtitle: { fontSize: 12, color: '#6b7280', margin: [0, 0, 0, 10] },
        sectionTitle: { fontSize: 16, bold: true, color: '#2563eb', margin: [0, 10, 0, 5] },
        label: { fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 3] },
        value: { fontSize: 18, bold: true, color: '#1f2937' },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f3f4f6', color: '#374151', margin: 5 },
        tableCell: { fontSize: 11, margin: 5 },
        tableCellSmall: { fontSize: 8, color: '#6b7280', margin: 5 }
      }
    };

    pdfMake.createPdf(docDefinition).download(`reporte_${data.trabajador}_${data.mes}_${data.anio}.pdf`);
  }

  private generarTablaSemanas(semanas: any[]) {
    const rows = semanas.map(semana => [
      { text: `Semana ${semana.numero}`, bold: true },
      { text: `${semana.fechaInicio} - ${semana.fechaFin}` },
      { text: this.service.horasDecimalAHHMMSS(semana.promedio), alignment: 'center' },
      { text: this.service.horasDecimalAHHMMSS(semana.horasTotales), alignment: 'center' },
      { text: semana.diasTrabajados.toString(), alignment: 'center' }
    ]);

    return [{
      table: {
        widths: ['auto', '*', 'auto', 'auto', 'auto'],
        headerRows: 1,
        body: [
          [
            { text: 'Semana', style: 'tableHeader' },
            { text: 'Período', style: 'tableHeader' },
            { text: 'Promedio', style: 'tableHeader' },
            { text: 'Total Horas', style: 'tableHeader' },
            { text: 'Días', style: 'tableHeader' }
          ],
          ...rows
        ]
      },
      layout: 'lightHorizontalLines'
    }];
  }

  private calcularPorcentaje(valor: number, total: number): string {
    return total > 0 ? ((valor / total) * 100).toFixed(1) : '0.0';
  }
}