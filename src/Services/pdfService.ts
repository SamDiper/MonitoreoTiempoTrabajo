import { inject, Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { calendarioService } from './calendarioService';
import { ChartService } from './chartsService';
import { RegistroProcessorService } from './RegistroAgrupado';

pdfMake.vfs = pdfFonts.vfs;

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  service = inject(RegistroProcessorService);
  
  constructor(
    private chartService: ChartService,
    private calendarService: calendarioService
  ) {}

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
    registrosTrabajador?: any[];
    mes_numero?: number;
  }) {
    
    try {
      console.log('📄 Iniciando generación de PDF...');
      
      // 🎯 Generar gráfico con el servicio actualizado
      let graficoBase64 = '';
      if (data.semanas && data.semanas.length > 0 && 
          data.registrosTrabajador && data.mes_numero !== undefined) {
        
        console.log('📊 Generando gráfico semanal...');
        graficoBase64 = await this.chartService.generarGraficoSemanal(
          data.semanas,
          data.registrosTrabajador,
          data.mes_numero,
          data.anio
        );
        
        if (graficoBase64 && graficoBase64.length > 100) {
          console.log('✅ Gráfico generado correctamente');
        } else {
          console.warn('⚠️ El gráfico no se generó correctamente');
        }
      }

      // 📅 Generar calendario
      let calendarioBase64 = '';
      if (data.diasCalendario && data.diasCalendario.length > 0) {
        console.log('📅 Generando calendario...');
        calendarioBase64 = await this.calendarService.generarCalendarioImagen(
          data.diasCalendario,
          data.mes,
          data.anio
        );
        
        if (calendarioBase64 && calendarioBase64.length > 100) {
          console.log('✅ Calendario generado correctamente');
        }
      }

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
          // 📌 Título
          { text: data.trabajador, style: 'title' },
          { text: `Mes de ${data.mes} ${data.anio}`, style: 'subtitle' },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 20] },

          // 📊 Resumen de estadísticas
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: 'Total Horas Trabajadas', style: 'label' },
                  { text: this.horasDecimalAHHMMSS(data.estadisticas?.totalHoras || 0), style: 'value' }
                ]
              },
              {
                width: '50%',
                stack: [
                  { text: 'Promedio Diario', style: 'label' },
                  { text: this.horasDecimalAHHMMSS(data.estadisticas?.promedioDiario || 0), style: 'value' }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          },

          // 📅 Calendario (si está disponible)
          ...(calendarioBase64 && calendarioBase64.length > 100 ? [
            { text: 'Calendario del Mes', style: 'sectionTitle', margin: [0, 20, 0, 10] },
            {
              image: calendarioBase64,
              width: 500,
              alignment: 'center',
              margin: [0, 0, 0, 20]
            }
          ] : []),

          // 📋 Tabla de resumen
          {
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Días Aprobados', style: 'tableHeader', fillColor: '#22c55e', color: 'white' },
                  { text: 'Faltas', style: 'tableHeader', fillColor: '#ef4444', color: 'white' },
                  { text: 'Novedades', style: 'tableHeader', fillColor: '#fbbf24', color: 'black' },
                  { text: 'Total Trabajados', style: 'tableHeader', fillColor: '#1f2937', color: 'white' }
                ],
                [
                  { text: data.diasNormales.toString(), style: 'tableCell', alignment: 'center' },
                  { text: data.diasFalta.toString(), style: 'tableCell', alignment: 'center' },
                  { text: data.diasNovedad.toString(), style: 'tableCell', alignment: 'center' },
                  { text: (data.diasNormales + data.diasNovedad).toString(), style: 'tableCell', alignment: 'center', bold: true }
                ]
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          },

          // 🔄 Salto de página antes del gráfico
          { text: '', pageBreak: 'before' },

          // 📊 Gráfico de horas trabajadas (si está disponible)
          ...(graficoBase64 && graficoBase64.length > 100 ? [
            { text: 'Análisis de Horas Trabajadas', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            {
              image: graficoBase64,
              width: 515, // 👈 Ancho completo de la página (A4 - márgenes)
              alignment: 'center',
              margin: [0, 0, 0, 20]
            }
          ] : [
            { 
              text: '⚠️ Gráfico no disponible', 
              style: 'sectionTitle', 
              color: '#ef4444',
              alignment: 'center',
              margin: [0, 20, 0, 20] 
            }
          ]),

          // 📋 Detalle por semana
          { text: 'Detalle por Semana', style: 'header', margin: [0, 20, 0, 10] },
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
          tableHeader: { fontSize: 10, bold: true, margin: 5 },
          tableCell: { fontSize: 11, margin: 5 }
        }
      };

      console.log('✅ Generando PDF...');
      pdfMake.createPdf(docDefinition).download(`reporte_${data.trabajador}_${data.mes}_${data.anio}.pdf`);
      console.log('✅ PDF descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al generar el PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
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
            { text: 'Semana', style: 'tableHeader', fillColor: '#e5e7eb' },
            { text: 'Período', style: 'tableHeader', fillColor: '#e5e7eb' },
            { text: 'Promedio', style: 'tableHeader', fillColor: '#e5e7eb' },
            { text: 'Total Horas', style: 'tableHeader', fillColor: '#e5e7eb' },
            { text: 'Días', style: 'tableHeader', fillColor: '#e5e7eb' }
          ],
          ...rows
        ]
      },
      layout: 'lightHorizontalLines'
    }];
  }

  private horasDecimalAHHMMSS(horas: number): string {
    const h = Math.floor(horas);
    const m = Math.floor((horas - h) * 60);
    const s = Math.floor(((horas - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}