import { Injectable } from '@angular/core';
declare const require: any;
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
const pdfMake: any = pdfMakeLib;
pdfMake.vfs = pdfFonts as any;
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {}

  private primaryColor = '#059669';
  private primaryLight = '#10B981';
  private primaryDark = '#047857';
  private accentColor = '#34D399';
  private lightBg = '#ECFDF5';
  private headerBg = '#059669';
  private headerTextColor = '#FFFFFF';
  private successColor = '#10B981';
  private warningColor = '#F59E0B';
  private errorColor = '#EF4444';
  private textColor = '#1F2937';
  private borderColor = '#D1FAE5';

  generarPdfClientes(clientes: any[]): void {
    try {
      if (!clientes || clientes.length === 0) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');
      const tableBody: any[] = [];

      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'DOCUMENTO', style: 'tableHeader', alignment: 'center' },
        { text: 'TELÉFONO', style: 'tableHeader', alignment: 'center' },
        { text: 'TOTAL DEUDA', style: 'tableHeader', alignment: 'center' },
        { text: 'TOTAL PAGADO', style: 'tableHeader', alignment: 'center' },
        { text: 'SALDO', style: 'tableHeader', alignment: 'center' },
        { text: 'AVANCE', style: 'tableHeader', alignment: 'center' },
      ]);

      clientes.forEach((cliente, index) => {
        const infoPlanPago = this.obtenerInfoPlanPagoCliente(cliente);
        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: cliente.fullName || 'N/A', style: 'tableCellBold' },
          { text: cliente.ci || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: cliente.telefono || 'N/A', style: 'tableCell', alignment: 'center' },
          {
            text: infoPlanPago.tienePlan
              ? this.formatCurrency(infoPlanPago.totalDeuda)
              : 'SIN DEUDA',
            style: infoPlanPago.tienePlan ? 'tableCellBold' : 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? this.formatCurrency(infoPlanPago.totalPagado) : 'N/A',
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? this.formatCurrency(infoPlanPago.saldoPendiente) : 'N/A',
            style: infoPlanPago.saldoPendiente > 0 ? 'deudaWarning' : 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? `${infoPlanPago.porcentajePagado}%` : 'N/A',
            style: infoPlanPago.tienePlan ? 'tableCellBold' : 'tableCell',
            alignment: 'center',
          },
        ]);
      });

      const totalClientes = clientes.length;
      const clientesConPlan = clientes.filter(
        (cliente) => this.obtenerInfoPlanPagoCliente(cliente).tienePlan
      ).length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 150, 20, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 120,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'REPORTE DE CLIENTES',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Estado de Pagos y Finanzas`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [20, -110, 20, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: 'Sistema de Gestión Inmobiliaria - Todos los derechos reservados',
                    style: 'footer',
                    alignment: 'left',
                    margin: [20, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 20, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '50%',
                stack: [
                  {
                    text: 'TOTAL CLIENTES',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: totalClientes.toString(),
                    style: 'statValue',
                    alignment: 'center',
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  {
                    text: 'CON PLAN PAGO',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: clientesConPlan.toString(),
                    style: 'statValue',
                    alignment: 'center',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },
          {
            table: {
              headerRows: 1,
              widths: ['5%', '25%', '12%', '13%', '15%', '15%', '10%', '5%'],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? this.primaryDark : null),
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => this.primaryDark,
              vLineColor: () => this.borderColor,
              paddingTop: (i: number) => (i === 0 ? 10 : 8),
              paddingBottom: (i: number) => (i === 0 ? 10 : 8),
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 12,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 16,
            color: this.primaryDark,
            bold: true,
          },
          tableHeader: {
            fontSize: 9,
            bold: true,
            color: this.headerTextColor,
          },
          tableCell: {
            fontSize: 9,
            color: this.textColor,
          },
          tableCellBold: {
            fontSize: 9,
            color: this.textColor,
            bold: true,
          },
          deudaWarning: {
            fontSize: 9,
            bold: true,
            color: this.errorColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Clientes_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de clientes:', error);
    }
  }

  generarPdfClienteIndividual(cliente: any): void {
    try {
      if (!cliente) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const infoPlanPago = this.obtenerInfoPlanPagoCliente(cliente);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 160, 40, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 130,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'INFORMACIÓN DETALLADA DEL CLIENTE',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Cliente #${cliente.id}`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [40, -120, 40, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: `Generado: ${fechaHora}`,
                    style: 'footer',
                    alignment: 'left',
                    margin: [40, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 40, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '60%',
                stack: [
                  { text: cliente.fullName || 'N/A', style: 'clientName' },
                  {
                    text: cliente.ci ? `CI: ${cliente.ci}` : 'Documento no registrado',
                    style: 'clientDetail',
                  },
                ],
              },
              {
                width: '40%',
                stack: [
                  {
                    text: infoPlanPago.tienePlan ? 'CON PLAN PAGO' : 'SIN PLAN PAGO',
                    style: infoPlanPago.tienePlan ? 'statusActive' : 'statusInactive',
                    alignment: 'right',
                    margin: [0, 10, 0, 0],
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },
          {
            stack: [
              {
                text: 'INFORMACIÓN DE CONTACTO',
                style: 'sectionTitle',
                background: this.lightBg,
                margin: [0, 0, 0, 10],
              },
              {
                table: {
                  widths: ['25%', '75%'],
                  body: [
                    [
                      { text: 'Teléfono:', style: 'labelCell' },
                      { text: cliente.telefono || 'No registrado', style: 'valueCell' },
                    ],
                    [
                      { text: 'Dirección:', style: 'labelCell' },
                      { text: cliente.direccion || 'No registrada', style: 'valueCell' },
                    ],
                    [
                      { text: 'Observaciones:', style: 'labelCell' },
                      { text: cliente.observaciones || 'Ninguna', style: 'valueCell' },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => this.borderColor,
                  vLineColor: () => this.borderColor,
                },
              },
            ],
            margin: [0, 0, 0, 25],
          },
          {
            stack: [
              {
                text: 'RESUMEN FINANCIERO',
                style: 'sectionTitle',
                background: this.lightBg,
                margin: [0, 0, 0, 10],
              },
              this.buildResumenFinancieroCliente(infoPlanPago),
            ],
            margin: [0, 0, 0, 25],
          },
          ...this.buildDetalleVentasCliente(cliente),
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 18,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 14,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          clientName: {
            fontSize: 16,
            bold: true,
            color: this.primaryDark,
          },
          clientDetail: {
            fontSize: 12,
            color: this.textColor,
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryDark,
            padding: [10, 5, 10, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.textColor,
            fillColor: this.lightBg,
          },
          valueCell: {
            fontSize: 10,
            color: this.textColor,
          },
          statusActive: {
            fontSize: 12,
            bold: true,
            color: this.successColor,
          },
          statusInactive: {
            fontSize: 12,
            bold: true,
            color: '#666666',
          },
          financialLabel: {
            fontSize: 10,
            bold: true,
            color: this.textColor,
          },
          financialValue: {
            fontSize: 10,
            color: this.textColor,
          },
          financialWarning: {
            fontSize: 10,
            bold: true,
            color: this.errorColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Cliente_${cliente.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de cliente:', error);
    }
  }

  generarPdfReservas(reservas: any[]): void {
    try {
      if (!reservas || reservas.length === 0) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');
      const tableBody: any[] = [];

      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'RESERVA', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'center' },
        { text: 'MONTO', style: 'tableHeader', alignment: 'right' },
        { text: 'FECHA INICIO', style: 'tableHeader', alignment: 'center' },
        { text: 'FECHA VENCE', style: 'tableHeader', alignment: 'center' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
      ]);

      reservas.forEach((reserva, index) => {
        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${reserva.id}`, style: 'tableCellBold', alignment: 'center' },
          { text: reserva.cliente?.fullName || 'N/A', style: 'tableCell' },
          { text: reserva.lote?.numeroLote || 'N/A', style: 'tableCell', alignment: 'center' },
          {
            text: this.formatCurrency(reserva.montoReserva),
            style: 'tableCellBold',
            alignment: 'right',
          },
          { text: this.formatDate(reserva.fechaInicio), style: 'tableCell', alignment: 'center' },
          {
            text: this.formatDate(reserva.fechaVencimiento),
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: reserva.estado?.toUpperCase() || 'N/A',
            style: this.getEstadoReservaStyle(reserva.estado),
            alignment: 'center',
          },
        ]);
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 150, 20, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 120,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'REPORTE DE RESERVAS',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Control de Reservas de Inmuebles`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [20, -110, 20, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: 'Sistema de Gestión Inmobiliaria - Todos los derechos reservados',
                    style: 'footer',
                    alignment: 'left',
                    margin: [20, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 20, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            table: {
              headerRows: 1,
              widths: ['5%', '8%', '27%', '10%', '15%', '15%', '15%', '5%'],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? this.primaryDark : null),
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => this.primaryDark,
              vLineColor: () => this.borderColor,
              paddingTop: (i: number) => (i === 0 ? 10 : 8),
              paddingBottom: (i: number) => (i === 0 ? 10 : 8),
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 12,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            color: this.headerTextColor,
          },
          tableCell: {
            fontSize: 9,
            color: this.textColor,
          },
          tableCellBold: {
            fontSize: 9,
            color: this.textColor,
            bold: true,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Reservas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de reservas:', error);
    }
  }

  generarPdfReservaIndividual(reserva: any): void {
    try {
      if (!reserva) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 160, 40, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 130,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'COMPROBANTE DE RESERVA',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Reserva #${reserva.id}`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [40, -120, 40, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: `Generado: ${fechaHora}`,
                    style: 'footer',
                    alignment: 'left',
                    margin: [40, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 40, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '50%',
                stack: [
                  {
                    text: 'INFORMACIÓN GENERAL',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['35%', '65%'],
                      body: [
                        [
                          { text: 'Estado:', style: 'labelCell' },
                          {
                            text: reserva.estado?.toUpperCase() || 'N/A',
                            style: this.getEstadoReservaStyle(reserva.estado),
                          },
                        ],
                        [
                          { text: 'Monto:', style: 'labelCell' },
                          {
                            text: this.formatCurrency(reserva.montoReserva),
                            style: 'valueCellBold',
                          },
                        ],
                        [
                          { text: 'Fecha Inicio:', style: 'labelCell' },
                          { text: this.formatDate(reserva.fechaInicio), style: 'valueCell' },
                        ],
                        [
                          { text: 'Fecha Vence:', style: 'labelCell' },
                          { text: this.formatDate(reserva.fechaVencimiento), style: 'valueCell' },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  {
                    text: 'CLIENTE',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              { text: reserva.cliente?.fullName || 'N/A', style: 'clientName' },
                              {
                                text: reserva.cliente?.telefono || 'Sin teléfono',
                                style: 'clientDetail',
                              },
                            ],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 2,
                      vLineWidth: () => 2,
                      hLineColor: () => this.headerBg,
                      vLineColor: () => this.headerBg,
                    },
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },
          {
            text: 'DETALLE DEL INMUEBLE',
            style: 'sectionTitle',
            background: this.lightBg,
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['25%', '25%', '25%', '25%'],
              body: [
                [
                  { text: 'Lote', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Superficie', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Urbanización', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Precio Base', style: 'labelCell', fillColor: this.lightBg },
                ],
                [
                  { text: reserva.lote?.numeroLote || 'N/A', style: 'valueCell' },
                  { text: `${reserva.lote?.superficieM2 || 'N/A'} m²`, style: 'valueCell' },
                  { text: reserva.lote?.urbanizacion?.nombre || 'N/A', style: 'valueCell' },
                  { text: this.formatCurrency(reserva.lote?.precioBase || 0), style: 'valueCell' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => this.borderColor,
              vLineColor: () => this.borderColor,
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 18,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 14,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryDark,
            padding: [10, 5, 10, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.textColor,
          },
          valueCell: {
            fontSize: 10,
            color: this.textColor,
          },
          valueCellBold: {
            fontSize: 10,
            color: this.textColor,
            bold: true,
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: this.primaryDark,
          },
          clientDetail: {
            fontSize: 10,
            color: this.textColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Reserva_${reserva.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de reserva:', error);
    }
  }

  generarPdfVentas(ventas: any[]): void {
    try {
      if (!ventas || ventas.length === 0) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');
      const tableBody: any[] = [];

      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'VENTA', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'TIPO INMUEBLE', style: 'tableHeader', alignment: 'center' },
        { text: 'INMUEBLE', style: 'tableHeader', alignment: 'center' },
        { text: 'FECHA VENTA', style: 'tableHeader', alignment: 'center' },
        { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
        { text: 'PAGADO', style: 'tableHeader', alignment: 'right' },
        { text: 'SALDO', style: 'tableHeader', alignment: 'right' },
        { text: 'AVANCE', style: 'tableHeader', alignment: 'center' },
      ]);

      ventas.forEach((venta: any, index: number) => {
        const planPago = venta.planPago || venta.plan_pago;
        const totalPagado = planPago
          ? Number(planPago.total_pagado || planPago.monto_pagado || 0)
          : 0;
        const totalVenta = Number(venta.precioFinal || venta.total || 0);
        const saldoPendiente = totalVenta - totalPagado;
        const porcentajePagado = totalVenta > 0 ? (totalPagado / totalVenta) * 100 : 0;
        const fechaVenta =
          venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

        // Determinar información del inmueble según el tipo
        let inmuebleInfo = 'N/A';
        if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
          inmuebleInfo = venta.lote.numeroLote;
        } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
          inmuebleInfo = venta.propiedad.nombre;
        }

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${venta.id}`, style: 'tableCellBold', alignment: 'center' },
          { text: venta.cliente?.fullName || 'N/A', style: 'tableCell' },
          {
            text: venta.inmuebleTipo === 'LOTE' ? 'LOTE' : 'PROPIEDAD',
            style: 'tableCell',
            alignment: 'center',
          },
          { text: inmuebleInfo, style: 'tableCell', alignment: 'center' },
          { text: this.formatDate(fechaVenta), style: 'tableCell', alignment: 'center' },
          { text: this.formatCurrency(totalVenta), style: 'tableCellBold', alignment: 'right' },
          { text: this.formatCurrency(totalPagado), style: 'tableCell', alignment: 'right' },
          {
            text: this.formatCurrency(saldoPendiente),
            style: saldoPendiente > 0 ? 'deudaWarning' : 'tableCell',
            alignment: 'right',
          },
          { text: `${porcentajePagado.toFixed(1)}%`, style: 'tableCell', alignment: 'center' },
        ]);
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 150, 20, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 120,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'REPORTE DE VENTAS',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Planes de Pago y Estado Financiero`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [20, -110, 20, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: 'Sistema de Gestión Inmobiliaria - Todos los derechos reservados',
                    style: 'footer',
                    alignment: 'left',
                    margin: [20, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 20, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            table: {
              headerRows: 1,
              widths: ['3%', '5%', '18%', '8%', '12%', '10%', '12%', '12%', '12%', '8%'],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? this.primaryDark : null),
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => this.primaryDark,
              vLineColor: () => this.borderColor,
              paddingTop: (i: number) => (i === 0 ? 10 : 8),
              paddingBottom: (i: number) => (i === 0 ? 10 : 8),
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 12,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          tableHeader: {
            fontSize: 7,
            bold: true,
            color: this.headerTextColor,
          },
          tableCell: {
            fontSize: 7,
            color: this.textColor,
          },
          tableCellBold: {
            fontSize: 7,
            color: this.textColor,
            bold: true,
          },
          deudaWarning: {
            fontSize: 7,
            bold: true,
            color: this.errorColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Ventas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de ventas:', error);
    }
  }

  generarPdfVentaIndividual(venta: any): void {
    try {
      if (!venta) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const planPago = venta.planPago || venta.plan_pago;
      const totalPagado = planPago
        ? Number(planPago.total_pagado || planPago.monto_pagado || 0)
        : 0;
      const totalVenta = Number(venta.precioFinal || venta.total || 0);
      const saldoPendiente = totalVenta - totalPagado;
      const porcentajePagado = totalVenta > 0 ? (totalPagado / totalVenta) * 100 : 0;
      const fechaVenta = venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

      // Construir tabla de detalles del inmueble según el tipo
      const detalleInmuebleTable = this.buildDetalleInmuebleTable(venta);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 160, 40, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 130,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'DETALLE COMPLETO DE VENTA',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Venta #${venta.id}`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [40, -120, 40, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: `Generado: ${fechaHora}`,
                    style: 'footer',
                    alignment: 'left',
                    margin: [40, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 40, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '50%',
                stack: [
                  {
                    text: 'INFORMACIÓN DE VENTA',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['35%', '65%'],
                      body: [
                        [
                          { text: 'Fecha Venta:', style: 'labelCell' },
                          { text: this.formatDate(fechaVenta), style: 'valueCell' },
                        ],
                        [
                          { text: 'Estado:', style: 'labelCell' },
                          {
                            text: venta.estado?.toUpperCase() || 'N/A',
                            style: this.getEstadoVentaStyle(venta.estado),
                          },
                        ],
                        [
                          { text: 'Tipo Inmueble:', style: 'labelCell' },
                          {
                            text: venta.inmuebleTipo === 'LOTE' ? 'LOTE' : 'PROPIEDAD',
                            style: 'valueCellBold',
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  {
                    text: 'CLIENTE',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              { text: venta.cliente?.fullName || 'N/A', style: 'clientName' },
                              {
                                text: venta.cliente?.telefono || 'Sin teléfono',
                                style: 'clientDetail',
                              },
                            ],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 2,
                      vLineWidth: () => 2,
                      hLineColor: () => this.headerBg,
                      vLineColor: () => this.headerBg,
                    },
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },
          {
            text: 'DETALLE DEL INMUEBLE',
            style: 'sectionTitle',
            background: this.lightBg,
            margin: [0, 0, 0, 10],
          },
          detalleInmuebleTable,
          {
            text: 'RESUMEN FINANCIERO',
            style: 'sectionTitle',
            background: this.lightBg,
            margin: [0, 25, 0, 10],
          },
          {
            table: {
              widths: ['60%', '40%'],
              body: [
                [
                  { text: 'Total Venta:', style: 'financialLabel' },
                  {
                    text: this.formatCurrency(totalVenta),
                    style: 'financialValue',
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Total Pagado:', style: 'financialLabel' },
                  {
                    text: this.formatCurrency(totalPagado),
                    style: 'financialValue',
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Saldo Pendiente:', style: 'financialLabel' },
                  {
                    text: this.formatCurrency(saldoPendiente),
                    style: saldoPendiente > 0 ? 'financialWarning' : 'financialValue',
                    alignment: 'right',
                  },
                ],
                [
                  { text: 'Porcentaje Pagado:', style: 'financialLabel' },
                  {
                    text: `${porcentajePagado.toFixed(1)}%`,
                    style: 'financialValue',
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 || i === 3 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: (i: number) => (i === 0 || i === 3 ? this.primaryDark : this.borderColor),
              vLineColor: () => this.borderColor,
            },
          },
          ...this.buildDetallePagos(planPago),
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 18,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 14,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryDark,
            padding: [10, 5, 10, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.textColor,
          },
          valueCell: {
            fontSize: 10,
            color: this.textColor,
          },
          valueCellBold: {
            fontSize: 10,
            color: this.textColor,
            bold: true,
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: this.primaryDark,
          },
          clientDetail: {
            fontSize: 10,
            color: this.textColor,
          },
          financialLabel: {
            fontSize: 11,
            color: this.textColor,
          },
          financialValue: {
            fontSize: 11,
            color: this.textColor,
          },
          financialWarning: {
            fontSize: 11,
            bold: true,
            color: this.errorColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Venta_${venta.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de venta:', error);
    }
  }

  private buildDetalleInmuebleTable(venta: any): any {
    if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
      return {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: 'Lote', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Superficie', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Urbanización', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Precio Base', style: 'labelCell', fillColor: this.lightBg },
            ],
            [
              { text: venta.lote?.numeroLote || 'N/A', style: 'valueCell' },
              { text: `${venta.lote?.superficieM2 || 'N/A'} m²`, style: 'valueCell' },
              { text: venta.lote?.urbanizacion?.nombre || 'N/A', style: 'valueCell' },
              { text: this.formatCurrency(venta.lote?.precioBase || 0), style: 'valueCell' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
      return {
        table: {
          widths: ['20%', '20%', '20%', '20%', '20%'],
          body: [
            [
              { text: 'Nombre', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Tipo', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Tamaño', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Ciudad', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Precio', style: 'labelCell', fillColor: this.lightBg },
            ],
            [
              { text: venta.propiedad?.nombre || 'N/A', style: 'valueCell' },
              { text: venta.propiedad?.tipo || 'N/A', style: 'valueCell' },
              { text: `${venta.propiedad?.tamano || 'N/A'} m²`, style: 'valueCell' },
              { text: venta.propiedad?.ciudad || 'N/A', style: 'valueCell' },
              { text: this.formatCurrency(venta.propiedad?.precio || 0), style: 'valueCell' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    } else {
      return {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: 'Información del inmueble no disponible',
                style: 'valueCell',
                alignment: 'center',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    }
  }

  private obtenerInfoPlanPagoCliente(cliente: any): any {
    let totalDeuda = 0;
    let totalPagado = 0;
    let tienePlan = false;

    const ventas = cliente.ventas || (cliente.cliente ? cliente.cliente.ventas : []);
    if (ventas && Array.isArray(ventas)) {
      ventas.forEach((venta: any) => {
        const planPago = venta.planPago || venta.plan_pago;
        if (planPago) {
          tienePlan = true;
          const totalVenta = Number(venta.precioFinal || venta.total || 0);
          let pagadoVenta = 0;
          if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
            pagadoVenta = Number(planPago.total_pagado);
          } else if (planPago.pagos && Array.isArray(planPago.pagos)) {
            pagadoVenta = planPago.pagos.reduce(
              (sum: number, pago: any) => sum + Number(pago.monto || 0),
              0
            );
          }
          totalDeuda += totalVenta;
          totalPagado += pagadoVenta;
        }
      });
    }

    const porcentajePagado = totalDeuda > 0 ? (totalPagado / totalDeuda) * 100 : 0;
    return {
      tienePlan,
      porcentajePagado: porcentajePagado.toFixed(1),
      totalDeuda,
      totalPagado,
      saldoPendiente: totalDeuda - totalPagado,
    };
  }

  private buildResumenFinancieroCliente(infoPlanPago: any): any {
    return {
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            { text: 'Deuda Total:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.totalDeuda),
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Total Pagado:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.totalPagado),
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Saldo Pendiente:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.saldoPendiente),
              style: infoPlanPago.saldoPendiente > 0 ? 'financialWarning' : 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Progreso de Pago:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: `${infoPlanPago.porcentajePagado}%`,
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.borderColor,
        vLineColor: () => this.borderColor,
      },
    };
  }

  private buildDetalleVentasCliente(cliente: any): any[] {
    const ventas = cliente.ventas || (cliente.cliente ? cliente.cliente.ventas : []);
    if (!ventas || !Array.isArray(ventas) || ventas.length === 0) {
      return [
        {
          text: 'DETALLE DE VENTAS',
          style: 'sectionTitle',
          background: this.lightBg,
          margin: [0, 20, 0, 10],
        },
        {
          text: 'El cliente no tiene ventas registradas',
          style: 'valueCell',
          margin: [0, 0, 0, 20],
        },
      ];
    }

    const tableBody: any[] = [
      [
        { text: 'VENTA', style: 'labelCell', fillColor: this.lightBg },
        { text: 'INMUEBLE', style: 'labelCell', fillColor: this.lightBg },
        { text: 'TIPO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'FECHA VENTA', style: 'labelCell', fillColor: this.lightBg },
        { text: 'TOTAL', style: 'labelCell', fillColor: this.lightBg },
        { text: 'PAGADO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'SALDO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'AVANCE', style: 'labelCell', fillColor: this.lightBg },
      ],
    ];

    ventas.forEach((venta: any) => {
      const planPago = venta.planPago || venta.plan_pago;
      const total = Number(venta.precioFinal || venta.total || 0);
      let pagado = 0;

      // Determinar información del inmueble
      let inmuebleInfo = 'N/A';
      let tipoInmueble = 'N/A';

      if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
        inmuebleInfo = venta.lote.numeroLote;
        tipoInmueble = 'LOTE';
      } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
        inmuebleInfo = venta.propiedad.nombre;
        tipoInmueble = 'PROPIEDAD';
      }

      if (planPago) {
        if (planPago.pagos && Array.isArray(planPago.pagos)) {
          pagado = planPago.pagos.reduce(
            (sum: number, pago: any) => sum + Number(pago.monto || 0),
            0
          );
        }
        if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
          pagado = Number(planPago.total_pagado);
        }
      }
      const saldo = total - pagado;
      const porcentaje = total > 0 ? (pagado / total) * 100 : 0;
      const fechaVenta = venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

      tableBody.push([
        { text: `#${venta.id}`, style: 'valueCell' },
        { text: inmuebleInfo, style: 'valueCell' },
        { text: tipoInmueble, style: 'valueCell' },
        { text: this.formatDate(fechaVenta), style: 'valueCell' },
        { text: this.formatCurrency(total), style: 'valueCell' },
        { text: this.formatCurrency(pagado), style: 'valueCell' },
        {
          text: this.formatCurrency(saldo),
          style: saldo > 0 ? 'financialWarning' : 'valueCell',
        },
        { text: `${porcentaje.toFixed(1)}%`, style: 'valueCell' },
      ]);
    });

    return [
      {
        text: 'DETALLE DE VENTAS',
        style: 'sectionTitle',
        background: this.lightBg,
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['8%', '15%', '10%', '12%', '15%', '15%', '15%', '10%'],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? this.lightBg : null),
          hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 ? this.primaryDark : this.borderColor),
          vLineColor: () => this.borderColor,
        },
      },
    ];
  }

  private buildDetallePagos(planPago: any): any[] {
    if (
      !planPago ||
      !planPago.pagos ||
      !Array.isArray(planPago.pagos) ||
      planPago.pagos.length === 0
    ) {
      return [];
    }

    const tableBody: any[] = [
      [
        { text: 'FECHA PAGO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'MONTO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'MÉTODO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'OBSERVACIÓN', style: 'labelCell', fillColor: this.lightBg },
      ],
    ];

    planPago.pagos.forEach((pago: any) => {
      tableBody.push([
        { text: this.formatDate(pago.fecha_pago), style: 'valueCell' },
        { text: this.formatCurrency(pago.monto), style: 'valueCell' },
        { text: pago.metodoPago || 'EFECTIVO', style: 'valueCell' },
        { text: pago.observacion || '-', style: 'valueCell' },
      ]);
    });

    return [
      {
        text: 'HISTORIAL DE PAGOS',
        style: 'sectionTitle',
        background: this.lightBg,
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['20%', '20%', '20%', '40%'],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? this.lightBg : null),
          hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 ? this.primaryDark : this.borderColor),
          vLineColor: () => this.borderColor,
        },
      },
    ];
  }

  private getEstadoReservaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      ACTIVA: { fontSize: 10, bold: true, color: this.successColor },
      VENCIDA: { fontSize: 10, bold: true, color: this.errorColor },
      CANCELADA: { fontSize: 10, bold: true, color: this.warningColor },
    };
    return styles[estado?.toUpperCase()] || { fontSize: 10, bold: true, color: this.textColor };
  }

  private getEstadoVentaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      PAGADO: { fontSize: 10, bold: true, color: this.successColor },
      PENDIENTE: { fontSize: 10, bold: true, color: this.warningColor },
      CANCELADO: { fontSize: 10, bold: true, color: this.errorColor },
    };
    return styles[estado?.toUpperCase()] || { fontSize: 10, bold: true, color: this.textColor };
  }

  private formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  private formatCurrency(value: any): string {
    if (value === null || value === undefined) return '$ 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return `$ ${
      isNaN(num)
        ? '0.00'
        : num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }`;
  }
}
