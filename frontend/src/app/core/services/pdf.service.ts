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

  private primaryColor = '#0D9488';
  private accentColor = '#14B8A6';
  private darkColor = '#115E59';
  private lightBg = '#F0FDFA';
  private successColor = '#10B981';
  private warningColor = '#F59E0B';
  private errorColor = '#EF4444';

  generarPdfClientes(clientes: any[]): void {
    try {
      if (!clientes || clientes.length === 0) {
        console.error('No hay clientes para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      tableBody.push([
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'CONTACTO', style: 'tableHeader', alignment: 'left' },
        { text: 'DOCUMENTO', style: 'tableHeader', alignment: 'center' },
        { text: 'PLAN PAGO', style: 'tableHeader', alignment: 'center' },
        { text: 'AVANCE', style: 'tableHeader', alignment: 'center' },
      ]);

      clientes.forEach((cliente, index) => {
        const infoPlanPago = this.obtenerInfoPlanPagoCliente(cliente);

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          {
            stack: [
              { text: cliente.fullName || 'N/A', style: 'tableCellBold' },
              {
                text: cliente.direccion || 'Sin dirección',
                style: 'tableCellSmall',
                color: '#666',
              },
            ],
            alignment: 'left',
          },
          {
            stack: [
              { text: cliente.email || 'Sin email', style: 'tableCell' },
              { text: cliente.telefono || 'Sin teléfono', style: 'tableCellSmall', color: '#666' },
            ],
            alignment: 'left',
          },
          { text: cliente.ci || 'N/A', style: 'tableCell', alignment: 'center' },
          {
            text: infoPlanPago.tienePlan ? 'SÍ' : 'NO',
            style: infoPlanPago.tienePlan ? 'statusActive' : 'statusInactive',
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
      const clientesSinPlan = totalClientes - clientesConPlan;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 100, 20, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'REPORTE DE CLIENTES',
              style: 'mainHeader',
              margin: [20, -60, 20, 0],
            },
            {
              text: `Generado el ${fechaHora}`,
              style: 'subHeader',
              margin: [20, 5, 20, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Sistema de Gestión Inmobiliaria',
                style: 'footer',
                alignment: 'left',
                margin: [20, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 20, 0],
              },
            ],
          };
        },

        content: [
          {
            columns: [
              {
                width: '33%',
                stack: [
                  { text: 'TOTAL CLIENTES', style: 'statLabel' },
                  { text: totalClientes.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '33%',
                stack: [
                  { text: 'CON PLAN PAGO', style: 'statLabel' },
                  { text: clientesConPlan.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '33%',
                stack: [
                  { text: 'SIN PLAN PAGO', style: 'statLabel' },
                  { text: clientesSinPlan.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
            ],
            margin: [0, 0, 0, 20],
          },

          {
            table: {
              headerRows: 1,
              widths: ['5%', '25%', '20%', '15%', '15%', '20%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: (i: number) => (i === 0 ? this.primaryColor : '#E5E7EB'),
              vLineColor: () => '#E5E7EB',
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
          },
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 10,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 18,
            color: this.darkColor,
            bold: true,
          },
          tableHeader: {
            fontSize: 9,
            bold: true,
            color: '#FFFFFF',
            fillColor: this.primaryColor,
          },
          tableCell: {
            fontSize: 8,
            color: '#1F2937',
          },
          tableCellBold: {
            fontSize: 8,
            color: '#1F2937',
            bold: true,
          },
          tableCellSmall: {
            fontSize: 7,
            color: '#6B7280',
          },
          statusActive: {
            fontSize: 8,
            bold: true,
            color: this.successColor,
          },
          statusInactive: {
            fontSize: 8,
            bold: true,
            color: this.errorColor,
          },
        },

        defaultStyle: {
          font: 'Roboto',
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
        console.error('No hay datos de cliente para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const infoDeudas = this.calcularInfoDeudasCliente(cliente);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 120, 40, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'INFORMACIÓN DEL CLIENTE',
              style: 'mainHeader',
              margin: [40, -60, 40, 0],
            },
            {
              text: `Cliente #${cliente.id}`,
              style: 'subHeader',
              margin: [40, 5, 40, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: `Generado: ${fechaHora}`,
                style: 'footer',
                alignment: 'left',
                margin: [40, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 40, 0],
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
                  {
                    text: cliente.fullName || 'N/A',
                    style: 'clientName',
                  },
                  {
                    text: cliente.ci ? `CI: ${cliente.ci}` : 'Documento no registrado',
                    style: 'clientDetail',
                    margin: [0, 5, 0, 0],
                  },
                ],
              },
              {
                width: '40%',
                stack: [
                  {
                    text: infoDeudas.tieneDeudas ? 'CON DEUDAS' : 'SIN DEUDAS',
                    style: infoDeudas.tieneDeudas ? 'statusDeuda' : 'statusSinDeuda',
                    alignment: 'right',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },

          {
            stack: [
              { text: 'INFORMACIÓN DE CONTACTO', style: 'sectionTitle' },
              {
                table: {
                  widths: ['30%', '70%'],
                  body: [
                    [
                      { text: 'Email:', style: 'labelCell' },
                      { text: cliente.email || 'No registrado', style: 'valueCell' },
                    ],
                    [
                      { text: 'Teléfono:', style: 'labelCell' },
                      { text: cliente.telefono || 'No registrado', style: 'valueCell' },
                    ],
                    [
                      { text: 'Dirección:', style: 'labelCell' },
                      { text: cliente.direccion || 'No registrada', style: 'valueCell' },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => '#E5E7EB',
                  vLineColor: () => '#E5E7EB',
                },
              },
            ],
            margin: [0, 0, 0, 25],
          },

          {
            stack: [
              { text: 'SITUACIÓN FINANCIERA', style: 'sectionTitle' },
              this.buildDeudasSection(infoDeudas),
            ],
          },

          ...this.buildVentasClienteSection(cliente),
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 12,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          clientName: {
            fontSize: 18,
            bold: true,
            color: this.darkColor,
          },
          clientDetail: {
            fontSize: 12,
            color: '#6B7280',
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryColor,
            margin: [0, 0, 0, 10],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.darkColor,
            fillColor: this.lightBg,
            padding: [8, 6, 8, 6],
          },
          valueCell: {
            fontSize: 10,
            color: '#1F2937',
            padding: [8, 6, 8, 6],
          },
          statusDeuda: {
            fontSize: 12,
            bold: true,
            color: this.errorColor,
          },
          statusSinDeuda: {
            fontSize: 12,
            bold: true,
            color: this.successColor,
          },
          deudaLabel: {
            fontSize: 10,
            bold: true,
            color: this.darkColor,
          },
          deudaValue: {
            fontSize: 10,
            color: '#1F2937',
          },
          deudaHighlight: {
            fontSize: 11,
            bold: true,
            color: this.primaryColor,
          },
          deudaWarning: {
            fontSize: 11,
            bold: true,
            color: this.errorColor,
          },
        },

        defaultStyle: {
          font: 'Roboto',
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
        console.error('No hay reservas para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      tableBody.push([
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'RESERVA', style: 'tableHeader', alignment: 'left' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'center' },
        { text: 'MONTO', style: 'tableHeader', alignment: 'right' },
        { text: 'FECHAS', style: 'tableHeader', alignment: 'center' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
      ]);

      reservas.forEach((reserva, index) => {
        const fechaInicio = this.formatDate(reserva.fechaInicio);
        const fechaVencimiento = this.formatDate(reserva.fechaVencimiento);
        const montoReserva = this.formatCurrency(reserva.montoReserva);

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${reserva.id}`, style: 'tableCellBold' },
          { text: reserva.cliente?.fullName || 'N/A', style: 'tableCell' },
          { text: reserva.lote?.numeroLote || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: montoReserva, style: 'tableCellBold', alignment: 'right' },
          {
            stack: [
              { text: `Inicio: ${fechaInicio}`, style: 'tableCellSmall' },
              { text: `Vence: ${fechaVencimiento}`, style: 'tableCellSmall' },
            ],
            alignment: 'center',
          },
          {
            text: reserva.estado?.toUpperCase() || 'N/A',
            style: this.getEstadoReservaStyle(reserva.estado),
            alignment: 'center',
          },
        ]);
      });

      const totalReservas = reservas.length;
      const totalMonto = reservas.reduce((sum, reserva) => sum + (reserva.montoReserva || 0), 0);
      const reservasActivas = reservas.filter((r) => r.estado === 'ACTIVA').length;
      const reservasVencidas = reservas.filter((r) => r.estado === 'VENCIDA').length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 100, 20, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'REPORTE DE RESERVAS',
              style: 'mainHeader',
              margin: [20, -60, 20, 0],
            },
            {
              text: `Generado el ${fechaHora}`,
              style: 'subHeader',
              margin: [20, 5, 20, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Sistema de Gestión Inmobiliaria',
                style: 'footer',
                alignment: 'left',
                margin: [20, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 20, 0],
              },
            ],
          };
        },

        content: [
          {
            columns: [
              {
                width: '25%',
                stack: [
                  { text: 'TOTAL', style: 'statLabel' },
                  { text: totalReservas.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'MONTO TOTAL', style: 'statLabel' },
                  { text: this.formatCurrency(totalMonto), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'ACTIVAS', style: 'statLabel' },
                  { text: reservasActivas.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'VENCIDAS', style: 'statLabel' },
                  { text: reservasVencidas.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
            ],
            margin: [0, 0, 0, 20],
          },

          {
            table: {
              headerRows: 1,
              widths: ['5%', '10%', '20%', '10%', '15%', '20%', '20%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: (i: number) => (i === 0 ? this.primaryColor : '#E5E7EB'),
              vLineColor: () => '#E5E7EB',
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
          },
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 10,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 16,
            color: this.darkColor,
            bold: true,
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            color: '#FFFFFF',
            fillColor: this.primaryColor,
          },
          tableCell: {
            fontSize: 9,
            color: '#1F2937',
          },
          tableCellBold: {
            fontSize: 9,
            color: '#1F2937',
            bold: true,
          },
          tableCellSmall: {
            fontSize: 8,
            color: '#6B7280',
          },
        },

        defaultStyle: {
          font: 'Roboto',
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
        console.error('No hay datos de reserva para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaInicio = this.formatDate(reserva.fechaInicio);
      const fechaVencimiento = this.formatDate(reserva.fechaVencimiento);
      const montoReserva = this.formatCurrency(reserva.montoReserva);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 120, 40, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'COMPROBANTE DE RESERVA',
              style: 'mainHeader',
              margin: [40, -60, 40, 0],
            },
            {
              text: `Reserva #${reserva.id}`,
              style: 'subHeader',
              margin: [40, 5, 40, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: `Generado: ${fechaHora}`,
                style: 'footer',
                alignment: 'left',
                margin: [40, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 40, 0],
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
                  { text: 'INFORMACIÓN GENERAL', style: 'sectionTitle' },
                  {
                    table: {
                      widths: ['40%', '60%'],
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
                          { text: montoReserva, style: 'valueCellBold' },
                        ],
                        [
                          { text: 'Fecha Inicio:', style: 'labelCell' },
                          { text: fechaInicio, style: 'valueCell' },
                        ],
                        [
                          { text: 'Fecha Vence:', style: 'labelCell' },
                          { text: fechaVencimiento, style: 'valueCell' },
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
                  { text: 'CLIENTE', style: 'sectionTitle' },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              { text: reserva.cliente?.fullName || 'N/A', style: 'clientName' },
                              {
                                text: reserva.cliente?.email || 'Sin email',
                                style: 'clientDetail',
                              },
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
                      hLineColor: () => this.primaryColor,
                      vLineColor: () => this.primaryColor,
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
              hLineColor: () => '#E5E7EB',
              vLineColor: () => '#E5E7EB',
            },
          },
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 12,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryColor,
            margin: [0, 0, 0, 10],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.darkColor,
          },
          valueCell: {
            fontSize: 10,
            color: '#1F2937',
          },
          valueCellBold: {
            fontSize: 10,
            color: '#1F2937',
            bold: true,
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: this.darkColor,
          },
          clientDetail: {
            fontSize: 10,
            color: '#6B7280',
          },
        },

        defaultStyle: {
          font: 'Roboto',
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
        console.error('No hay ventas para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      tableBody.push([
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'VENTA', style: 'tableHeader', alignment: 'left' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'center' },
        { text: 'MONTO', style: 'tableHeader', alignment: 'right' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
        { text: 'PLAN PAGO', style: 'tableHeader', alignment: 'center' },
      ]);

      ventas.forEach((venta: any, index: number) => {
        const fechaVenta = this.formatDate(venta.fecha_venta);
        const precioFinal = this.formatCurrency(venta.precioFinal || venta.total);
        const tienePlanPago = this.tienePlanPago(venta) ? 'SÍ' : 'NO';

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          {
            stack: [
              { text: `#${venta.id}`, style: 'tableCellBold' },
              { text: fechaVenta, style: 'tableCellSmall' },
            ],
          },
          { text: venta.cliente?.fullName || 'N/A', style: 'tableCell' },
          { text: venta.lote?.numeroLote || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: precioFinal, style: 'tableCellBold', alignment: 'right' },
          {
            text: venta.estado?.toUpperCase() || 'N/A',
            style: this.getEstadoVentaStyle(venta.estado),
            alignment: 'center',
          },
          {
            text: tienePlanPago,
            style: tienePlanPago === 'SÍ' ? 'statusActive' : 'statusInactive',
            alignment: 'center',
          },
        ]);
      });

      const totalVentas = ventas.length;
      const totalMonto = ventas.reduce(
        (sum: number, venta: any) => sum + (venta.precioFinal || venta.total || 0),
        0
      );
      const ventasPagadas = ventas.filter((v: any) => v.estado === 'pagado').length;
      const ventasPendientes = ventas.filter((v: any) => v.estado === 'pendiente').length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 100, 20, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'REPORTE DE VENTAS',
              style: 'mainHeader',
              margin: [20, -60, 20, 0],
            },
            {
              text: `Generado el ${fechaHora}`,
              style: 'subHeader',
              margin: [20, 5, 20, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Sistema de Gestión Inmobiliaria',
                style: 'footer',
                alignment: 'left',
                margin: [20, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 20, 0],
              },
            ],
          };
        },

        content: [
          {
            columns: [
              {
                width: '25%',
                stack: [
                  { text: 'TOTAL', style: 'statLabel' },
                  { text: totalVentas.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'MONTO TOTAL', style: 'statLabel' },
                  { text: this.formatCurrency(totalMonto), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'PAGADAS', style: 'statLabel' },
                  { text: ventasPagadas.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
              {
                width: '25%',
                stack: [
                  { text: 'PENDIENTES', style: 'statLabel' },
                  { text: ventasPendientes.toString(), style: 'statValue' },
                ],
                alignment: 'center',
              },
            ],
            margin: [0, 0, 0, 20],
          },

          {
            table: {
              headerRows: 1,
              widths: ['5%', '15%', '25%', '10%', '15%', '15%', '15%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: (i: number) => (i === 0 ? this.primaryColor : '#E5E7EB'),
              vLineColor: () => '#E5E7EB',
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
          },
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 10,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 16,
            color: this.darkColor,
            bold: true,
          },
          tableHeader: {
            fontSize: 10,
            bold: true,
            color: '#FFFFFF',
            fillColor: this.primaryColor,
          },
          tableCell: {
            fontSize: 9,
            color: '#1F2937',
          },
          tableCellBold: {
            fontSize: 9,
            color: '#1F2937',
            bold: true,
          },
          tableCellSmall: {
            fontSize: 8,
            color: '#6B7280',
          },
          statusActive: {
            fontSize: 8,
            bold: true,
            color: this.successColor,
          },
          statusInactive: {
            fontSize: 8,
            bold: true,
            color: this.errorColor,
          },
        },

        defaultStyle: {
          font: 'Roboto',
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
        console.error('No hay datos de venta para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaVenta = this.formatDate(venta.fecha_venta);
      const precioFinal = this.formatCurrency(venta.precioFinal || venta.total);
      const subtotal = this.formatCurrency(venta.subtotal);
      const descuento = this.formatCurrency(venta.descuento);

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 120, 40, 60],

        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595,
                  h: 80,
                  color: this.primaryColor,
                },
              ],
            },
            {
              text: 'COMPROBANTE DE VENTA',
              style: 'mainHeader',
              margin: [40, -60, 40, 0],
            },
            {
              text: `Venta #${venta.id}`,
              style: 'subHeader',
              margin: [40, 5, 40, 0],
            },
          ],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: `Generado: ${fechaHora}`,
                style: 'footer',
                alignment: 'left',
                margin: [40, 0, 0, 0],
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer',
                alignment: 'right',
                margin: [0, 0, 40, 0],
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
                  { text: 'INFORMACIÓN DE VENTA', style: 'sectionTitle' },
                  {
                    table: {
                      widths: ['40%', '60%'],
                      body: [
                        [
                          { text: 'Fecha:', style: 'labelCell' },
                          { text: fechaVenta, style: 'valueCell' },
                        ],
                        [
                          { text: 'Estado:', style: 'labelCell' },
                          {
                            text: venta.estado?.toUpperCase() || 'N/A',
                            style: this.getEstadoVentaStyle(venta.estado),
                          },
                        ],
                        [
                          { text: 'Método Pago:', style: 'labelCell' },
                          { text: venta.metodo_pago?.toUpperCase() || 'N/A', style: 'valueCell' },
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
                  { text: 'CLIENTE', style: 'sectionTitle' },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              { text: venta.cliente?.fullName || 'N/A', style: 'clientName' },
                              { text: venta.cliente?.email || 'Sin email', style: 'clientDetail' },
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
                      hLineColor: () => this.primaryColor,
                      vLineColor: () => this.primaryColor,
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
              hLineColor: () => '#E5E7EB',
              vLineColor: () => '#E5E7EB',
            },
          },

          {
            text: 'RESUMEN FINANCIERO',
            style: 'sectionTitle',
            margin: [0, 25, 0, 10],
          },
          {
            table: {
              widths: ['70%', '30%'],
              body: [
                [
                  { text: 'Subtotal:', style: 'financialLabel' },
                  { text: subtotal, style: 'financialValue', alignment: 'right' },
                ],
                [
                  { text: 'Descuento:', style: 'financialLabel' },
                  { text: descuento, style: 'financialValue', alignment: 'right' },
                ],
                [
                  { text: 'TOTAL:', style: 'totalLabel' },
                  { text: precioFinal, style: 'totalValue', alignment: 'right' },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number) => (i === 2 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: (i: number) => (i === 2 ? this.primaryColor : '#E5E7EB'),
              vLineColor: () => '#E5E7EB',
            },
          },

          ...this.buildPlanPagosSection(venta),
        ],

        styles: {
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: '#FFFFFF',
            alignment: 'center',
          },
          subHeader: {
            fontSize: 12,
            color: '#CCFBF1',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: '#6B7280',
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryColor,
            margin: [0, 0, 0, 10],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.darkColor,
          },
          valueCell: {
            fontSize: 10,
            color: '#1F2937',
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: this.darkColor,
          },
          clientDetail: {
            fontSize: 10,
            color: '#6B7280',
          },
          financialLabel: {
            fontSize: 11,
            color: '#1F2937',
            padding: [0, 8, 0, 8],
          },
          financialValue: {
            fontSize: 11,
            color: '#1F2937',
            padding: [0, 8, 0, 8],
          },
          totalLabel: {
            fontSize: 12,
            bold: true,
            color: this.primaryColor,
            padding: [0, 8, 0, 8],
          },
          totalValue: {
            fontSize: 12,
            bold: true,
            color: this.primaryColor,
            padding: [0, 8, 0, 8],
          },
        },

        defaultStyle: {
          font: 'Roboto',
        },
      };

      const fileName = `Venta_${venta.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de venta:', error);
    }
  }

  private obtenerInfoPlanPagoCliente(cliente: any): any {
    let totalDeuda = 0;
    let totalPagado = 0;
    let tienePlan = false;

    if (cliente.ventas && Array.isArray(cliente.ventas)) {
      cliente.ventas.forEach((venta: any) => {
        const planPago = venta.planPago || venta.plan_pago;

        if (planPago) {
          tienePlan = true;

          const totalVenta = Number(
            planPago.total || planPago.monto_total || planPago.precioFinal || 0
          );
          const pagadoVenta = Number(
            planPago.total_pagado || planPago.monto_pagado || planPago.totalPagado || 0
          );

          totalDeuda += totalVenta;
          totalPagado += pagadoVenta;
        }
      });
    }

    if (cliente.planPago && (cliente.planPago.id_plan_pago || cliente.planPago.id)) {
      tienePlan = true;

      const totalPlan = Number(cliente.planPago.total || cliente.planPago.monto_total || 0);
      const pagadoPlan = Number(
        cliente.planPago.total_pagado || cliente.planPago.monto_pagado || 0
      );

      totalDeuda += totalPlan;
      totalPagado += pagadoPlan;
    }

    if (cliente.tieneDeuda !== undefined) {
      if (cliente.tieneDeuda) {
        tienePlan = true;
        if (totalDeuda === 0) {
          totalDeuda = cliente.montoDeuda || 1000;
        }
      }
    }

    const porcentajePagado = totalDeuda > 0 ? (totalPagado / totalDeuda) * 100 : 0;

    return {
      tienePlan,
      porcentajePagado: porcentajePagado.toFixed(1),
      totalDeuda,
      totalPagado,
    };
  }

  private calcularInfoDeudasCliente(cliente: any): any {
    const infoPlan = this.obtenerInfoPlanPagoCliente(cliente);

    if (!infoPlan.tienePlan) {
      return {
        tieneDeudas: false,
        mensaje: 'El cliente no tiene planes de pago activos',
        totalDeuda: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        porcentajePagado: 0,
      };
    }

    const saldoPendiente = infoPlan.totalDeuda - infoPlan.totalPagado;

    return {
      tieneDeudas: saldoPendiente > 0,
      mensaje: saldoPendiente > 0 ? 'Cliente tiene saldo pendiente' : 'Plan de pago al día',
      totalDeuda: infoPlan.totalDeuda,
      totalPagado: infoPlan.totalPagado,
      saldoPendiente: saldoPendiente,
      porcentajePagado: infoPlan.porcentajePagado,
    };
  }

  private buildVentasClienteSection(cliente: any): any[] {
    if (!cliente.ventas || !Array.isArray(cliente.ventas) || cliente.ventas.length === 0) {
      return [];
    }

    const ventasConPlan = cliente.ventas.filter((venta: any) => venta.planPago || venta.plan_pago);

    if (ventasConPlan.length === 0) {
      return [];
    }

    const tableBody: any[] = [
      [
        { text: 'VENTA', style: 'labelCell', fillColor: this.lightBg },
        { text: 'LOTE', style: 'labelCell', fillColor: this.lightBg },
        { text: 'MONTO TOTAL', style: 'labelCell', fillColor: this.lightBg },
        { text: 'PAGADO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'SALDO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'AVANCE', style: 'labelCell', fillColor: this.lightBg },
      ],
    ];

    ventasConPlan.forEach((venta: any) => {
      const planPago = venta.planPago || venta.plan_pago;
      const total = Number(planPago.total || planPago.monto_total || venta.precioFinal || 0);
      const pagado = Number(planPago.total_pagado || planPago.monto_pagado || 0);
      const saldo = total - pagado;
      const porcentaje = total > 0 ? (pagado / total) * 100 : 0;

      tableBody.push([
        { text: `#${venta.id}`, style: 'valueCell' },
        { text: venta.lote?.numeroLote || 'N/A', style: 'valueCell' },
        { text: this.formatCurrency(total), style: 'valueCell' },
        { text: this.formatCurrency(pagado), style: 'valueCell' },
        {
          text: this.formatCurrency(saldo),
          style: saldo > 0 ? 'deudaWarning' : 'valueCell',
        },
        { text: `${porcentaje.toFixed(1)}%`, style: 'valueCell' },
      ]);
    });

    return [
      {
        text: 'DETALLE DE VENTAS CON PLANES DE PAGO',
        style: 'sectionTitle',
        margin: [0, 25, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['15%', '15%', '20%', '20%', '15%', '15%'],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 ? this.primaryColor : '#E5E7EB'),
          vLineColor: () => '#E5E7EB',
        },
      },
    ];
  }

  private tienePlanPago(venta: any): boolean {
    return !!(venta.planPago || venta.plan_pago);
  }

  private buildDeudasSection(infoDeudas: any): any {
    if (!infoDeudas.tieneDeudas) {
      return {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: infoDeudas.mensaje,
                style: 'deudaValue',
                alignment: 'center',
                fillColor: this.lightBg,
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E5E7EB',
          vLineColor: () => '#E5E7EB',
        },
      };
    }

    return {
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            { text: 'Deuda Total:', style: 'deudaLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoDeudas.totalDeuda),
              style: 'deudaValue',
              fillColor: this.lightBg,
            },
          ],
          [
            { text: 'Total Pagado:', style: 'deudaLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoDeudas.totalPagado),
              style: 'deudaValue',
              fillColor: this.lightBg,
            },
          ],
          [
            { text: 'Saldo Pendiente:', style: 'deudaLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoDeudas.saldoPendiente),
              style: 'deudaWarning',
              fillColor: this.lightBg,
            },
          ],
          [
            { text: 'Progreso de Pago:', style: 'deudaLabel', fillColor: this.lightBg },
            {
              text: `${infoDeudas.porcentajePagado}%`,
              style: 'deudaHighlight',
              fillColor: this.lightBg,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
    };
  }

  private buildPlanPagosSection(venta: any): any[] {
    const planPago = venta.planPago || venta.plan_pago;

    if (!planPago) {
      return [];
    }

    const total = Number(planPago.total || planPago.monto_total || venta.precioFinal || 0);
    const totalPagado = Number(planPago.total_pagado || planPago.monto_pagado || 0);
    const saldoPendiente = Math.max(0, total - totalPagado);
    const porcentajePagado = total > 0 ? (totalPagado / total) * 100 : 0;

    return [
      {
        text: 'PLAN DE PAGOS',
        style: 'sectionTitle',
        margin: [0, 25, 0, 10],
      },
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              { text: 'Monto Total:', style: 'labelCell', fillColor: this.lightBg },
              { text: this.formatCurrency(total), style: 'valueCell', alignment: 'right' },
            ],
            [
              { text: 'Total Pagado:', style: 'labelCell', fillColor: this.lightBg },
              { text: this.formatCurrency(totalPagado), style: 'valueCell', alignment: 'right' },
            ],
            [
              { text: 'Saldo Pendiente:', style: 'labelCell', fillColor: this.lightBg },
              {
                text: this.formatCurrency(saldoPendiente),
                style: 'valueCellBold',
                alignment: 'right',
              },
            ],
            [
              { text: 'Progreso:', style: 'labelCell', fillColor: this.lightBg },
              { text: `${porcentajePagado.toFixed(1)}%`, style: 'valueCell', alignment: 'right' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E5E7EB',
          vLineColor: () => '#E5E7EB',
        },
      },
    ];
  }

  private getEstadoReservaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      ACTIVA: { fontSize: 8, bold: true, color: this.successColor },
      VENCIDA: { fontSize: 8, bold: true, color: this.errorColor },
      CANCELADA: { fontSize: 8, bold: true, color: this.warningColor },
      CONVERTIDA_EN_VENTA: { fontSize: 8, bold: true, color: this.primaryColor },
    };
    return styles[estado?.toUpperCase()] || { fontSize: 8, bold: true, color: '#6B7280' };
  }

  private getEstadoVentaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      pagado: { fontSize: 8, bold: true, color: this.successColor },
      pendiente: { fontSize: 8, bold: true, color: this.warningColor },
      cancelado: { fontSize: 8, bold: true, color: this.errorColor },
    };
    return styles[estado?.toLowerCase()] || { fontSize: 8, bold: true, color: '#6B7280' };
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
