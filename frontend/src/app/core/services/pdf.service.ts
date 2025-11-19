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

  /**
   * GENERAR PDF DE TODOS LOS CLIENTES
   */
  generarPdfClientes(clientes: any[]): void {
    try {
      if (!clientes || clientes.length === 0) {
        console.error('No hay clientes para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      // ENCABEZADO DE LA TABLA
      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'CI', style: 'tableHeader', alignment: 'center' },
        { text: 'EMAIL', style: 'tableHeader', alignment: 'left' },
        { text: 'TELÉFONO', style: 'tableHeader', alignment: 'center' },
        { text: 'DIRECCIÓN', style: 'tableHeader', alignment: 'left' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
      ]);

      // DATOS DE LOS CLIENTES
      clientes.forEach((cliente, index) => {
        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: cliente.fullName || 'N/A', style: 'tableCell', alignment: 'left' },
          { text: cliente.ci || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: cliente.email || 'N/A', style: 'tableCell', alignment: 'left' },
          { text: cliente.telefono || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: cliente.direccion || 'N/A', style: 'tableCell', alignment: 'left' },
          {
            text: cliente.isActive ? 'ACTIVO' : 'INACTIVO',
            style: 'tableCell',
            alignment: 'center',
          },
        ]);
      });

      // CALCULAR TOTALES
      const totalClientes = clientes.length;
      const clientesActivos = clientes.filter((c) => c.isActive).length;
      const clientesInactivos = clientes.filter((c) => !c.isActive).length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 80, 20, 60],

        header: {
          columns: [
            {
              stack: [
                { text: 'REPORTE GENERAL DE CLIENTES', style: 'header' },
                { text: 'Sistema de Gestión Inmobiliaria', style: 'subheader' },
                { text: `Generado el: ${fechaHora}`, style: 'fechaHeader' },
              ],
              alignment: 'center',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Confidencial - Uso Interno',
                alignment: 'left',
                margin: [20, 0, 0, 0],
                fontSize: 8,
                color: '#666666',
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 20, 0],
                fontSize: 8,
                color: '#666666',
              },
            ],
            margin: [0, 10, 0, 10],
          };
        },

        content: [
          // Resumen ejecutivo
          {
            table: {
              widths: ['33%', '33%', '34%'],
              body: [
                [
                  { text: 'TOTAL CLIENTES', style: 'resumenLabel', alignment: 'center' },
                  { text: 'CLIENTES ACTIVOS', style: 'resumenLabel', alignment: 'center' },
                  { text: 'CLIENTES INACTIVOS', style: 'resumenLabel', alignment: 'center' },
                ],
                [
                  { text: totalClientes.toString(), style: 'resumenValue', alignment: 'center' },
                  { text: clientesActivos.toString(), style: 'resumenValue', alignment: 'center' },
                  {
                    text: clientesInactivos.toString(),
                    style: 'resumenValue',
                    alignment: 'center',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },

          // Tabla de clientes
          {
            table: {
              headerRows: 1,
              widths: ['5%', '20%', '12%', '20%', '12%', '20%', '11%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) => {
                return i === 0 || i === node.table.body.length ? 1 : 0.5;
              },
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },

          // Resumen final
          {
            text: `Total de clientes registrados: ${totalClientes} | Activos: ${clientesActivos} | Inactivos: ${clientesInactivos}`,
            style: 'summary',
            margin: [0, 20, 0, 0],
          },
        ],

        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          subheader: {
            fontSize: 12,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          fechaHeader: {
            fontSize: 10,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          resumenLabel: {
            bold: true,
            fontSize: 10,
            color: '#000000',
            fillColor: '#f0f0f0',
            padding: [8, 6, 8, 6],
          },
          resumenValue: {
            bold: true,
            fontSize: 12,
            color: '#000000',
            padding: [8, 6, 8, 6],
          },
          tableHeader: {
            bold: true,
            fontSize: 9,
            color: '#FFFFFF',
            fillColor: '#404040',
            alignment: 'center',
          },
          tableCell: {
            fontSize: 8,
            color: '#000000',
          },
          summary: {
            fontSize: 10,
            bold: true,
            alignment: 'right',
            color: '#000000',
          },
        },

        defaultStyle: {
          font: 'Roboto',
          fontSize: 8,
          color: '#000000',
        },
      };

      const fileName = `Reporte_Clientes_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de clientes:', error);
    }
  }

  /**
   * GENERAR PDF INDIVIDUAL DE UN CLIENTE
   */
  generarPdfClienteIndividual(cliente: any): void {
    try {
      if (!cliente) {
        console.error('No hay datos de cliente para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],

        header: {
          columns: [
            {
              stack: [
                { text: 'INFORMACIÓN DEL CLIENTE', style: 'header' },
                { text: 'Sistema de Gestión Inmobiliaria', style: 'subheader' },
              ],
              alignment: 'center',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: `Generado el: ${fechaHora}`,
                alignment: 'left',
                margin: [40, 0, 0, 0],
                fontSize: 8,
                color: '#666666',
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 40, 0],
                fontSize: 8,
                color: '#666666',
              },
            ],
            margin: [0, 10, 0, 10],
          };
        },

        content: [
          // Información del Cliente
          {
            text: 'DATOS PERSONALES',
            style: 'sectionHeader',
            margin: [0, 0, 0, 15],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Código de Cliente:', style: 'labelCell' },
                  { text: `#${cliente.id}`, style: 'valueCell' },
                ],
                [
                  { text: 'Nombre Completo:', style: 'labelCell' },
                  { text: cliente.fullName || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Carnet de Identidad:', style: 'labelCell' },
                  { text: cliente.ci || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Email:', style: 'labelCell' },
                  { text: cliente.email || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Teléfono:', style: 'labelCell' },
                  { text: cliente.telefono || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Dirección:', style: 'labelCell' },
                  { text: cliente.direccion || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Estado:', style: 'labelCell' },
                  {
                    text: cliente.isActive ? 'ACTIVO' : 'INACTIVO',
                    style: 'valueCell',
                    bold: true,
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },
        ],

        styles: {
          header: {
            fontSize: 18,
            bold: true,
            color: '#000000',
            alignment: 'center',
          },
          subheader: {
            fontSize: 12,
            color: '#666666',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#000000',
            margin: [0, 0, 0, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: '#000000',
            fillColor: '#f8f8f8',
            padding: [8, 6, 8, 6],
          },
          valueCell: {
            fontSize: 10,
            color: '#000000',
            padding: [8, 6, 8, 6],
          },
        },

        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
          color: '#000000',
        },
      };

      const fileName = `Cliente_${cliente.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de cliente:', error);
    }
  }

  /**
   * GENERAR PDF DE TODAS LAS RESERVAS
   */
  generarPdfReservas(reservas: any[]): void {
    try {
      if (!reservas || reservas.length === 0) {
        console.error('No hay reservas para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      // ENCABEZADO DE LA TABLA
      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'ID RESERVA', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'center' },
        { text: 'MONTO RESERVA', style: 'tableHeader', alignment: 'right' },
        { text: 'FECHA INICIO', style: 'tableHeader', alignment: 'center' },
        { text: 'FECHA VENCIMIENTO', style: 'tableHeader', alignment: 'center' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
      ]);

      // DATOS DE LAS RESERVAS
      reservas.forEach((reserva, index) => {
        const fechaInicio = this.formatDate(reserva.fechaInicio);
        const fechaVencimiento = this.formatDate(reserva.fechaVencimiento);
        const montoReserva = this.formatCurrency(reserva.montoReserva);

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${reserva.id}`, style: 'tableCell', alignment: 'center' },
          { text: reserva.cliente?.fullName || 'N/A', style: 'tableCell', alignment: 'left' },
          { text: reserva.lote?.numeroLote || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: montoReserva, style: 'tableCell', alignment: 'right' },
          { text: fechaInicio, style: 'tableCell', alignment: 'center' },
          { text: fechaVencimiento, style: 'tableCell', alignment: 'center' },
          {
            text: reserva.estado?.toUpperCase() || 'N/A',
            style: 'tableCell',
            alignment: 'center',
          },
        ]);
      });

      // CALCULAR TOTALES
      const totalReservas = reservas.length;
      const totalMonto = reservas.reduce((sum, reserva) => sum + (reserva.montoReserva || 0), 0);
      const reservasActivas = reservas.filter((r) => r.estado === 'ACTIVA').length;
      const reservasVencidas = reservas.filter((r) => r.estado === 'VENCIDA').length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 80, 20, 60],

        header: {
          columns: [
            {
              stack: [
                { text: 'REPORTE GENERAL DE RESERVAS', style: 'header' },
                { text: 'Sistema de Gestión Inmobiliaria', style: 'subheader' },
                { text: `Generado el: ${fechaHora}`, style: 'fechaHeader' },
              ],
              alignment: 'center',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Confidencial - Uso Interno',
                alignment: 'left',
                margin: [20, 0, 0, 0],
                fontSize: 8,
                color: '#666666',
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 20, 0],
                fontSize: 8,
                color: '#666666',
              },
            ],
            margin: [0, 10, 0, 10],
          };
        },

        content: [
          // Resumen ejecutivo
          {
            table: {
              widths: ['25%', '25%', '25%', '25%'],
              body: [
                [
                  { text: 'TOTAL RESERVAS', style: 'resumenLabel', alignment: 'center' },
                  { text: 'MONTO TOTAL', style: 'resumenLabel', alignment: 'center' },
                  { text: 'RESERVAS ACTIVAS', style: 'resumenLabel', alignment: 'center' },
                  { text: 'RESERVAS VENCIDAS', style: 'resumenLabel', alignment: 'center' },
                ],
                [
                  { text: totalReservas.toString(), style: 'resumenValue', alignment: 'center' },
                  {
                    text: this.formatCurrency(totalMonto),
                    style: 'resumenValue',
                    alignment: 'center',
                  },
                  { text: reservasActivas.toString(), style: 'resumenValue', alignment: 'center' },
                  { text: reservasVencidas.toString(), style: 'resumenValue', alignment: 'center' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },

          // Tabla de reservas
          {
            table: {
              headerRows: 1,
              widths: ['5%', '10%', '20%', '10%', '15%', '12%', '15%', '13%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) => {
                return i === 0 || i === node.table.body.length ? 1 : 0.5;
              },
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },

          // Resumen final
          {
            text: `Total de reservas registradas: ${totalReservas} | Monto total: ${this.formatCurrency(
              totalMonto
            )}`,
            style: 'summary',
            margin: [0, 20, 0, 0],
          },
        ],

        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          subheader: {
            fontSize: 12,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          fechaHeader: {
            fontSize: 10,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          resumenLabel: {
            bold: true,
            fontSize: 10,
            color: '#000000',
            fillColor: '#f0f0f0',
            padding: [8, 6, 8, 6],
          },
          resumenValue: {
            bold: true,
            fontSize: 12,
            color: '#000000',
            padding: [8, 6, 8, 6],
          },
          tableHeader: {
            bold: true,
            fontSize: 9,
            color: '#FFFFFF',
            fillColor: '#404040',
            alignment: 'center',
          },
          tableCell: {
            fontSize: 8,
            color: '#000000',
          },
          summary: {
            fontSize: 10,
            bold: true,
            alignment: 'right',
            color: '#000000',
          },
        },

        defaultStyle: {
          font: 'Roboto',
          fontSize: 8,
          color: '#000000',
        },
      };

      const fileName = `Reporte_Reservas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de reservas:', error);
    }
  }

  /**
   * GENERAR PDF INDIVIDUAL DE UNA RESERVA
   */
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
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],

        header: {
          columns: [
            {
              stack: [
                { text: 'COMPROBANTE DE RESERVA', style: 'header' },
                { text: 'Sistema de Gestión Inmobiliaria', style: 'subheader' },
              ],
              alignment: 'center',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: `Generado el: ${fechaHora}`,
                alignment: 'left',
                margin: [40, 0, 0, 0],
                fontSize: 8,
                color: '#666666',
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 40, 0],
                fontSize: 8,
                color: '#666666',
              },
            ],
            margin: [0, 10, 0, 10],
          };
        },

        content: [
          // Información General de la Reserva
          {
            text: 'INFORMACIÓN GENERAL DE LA RESERVA',
            style: 'sectionHeader',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Número de Reserva:', style: 'labelCell' },
                  { text: `#${reserva.id}`, style: 'valueCell' },
                ],
                [
                  { text: 'Fecha de Inicio:', style: 'labelCell' },
                  { text: fechaInicio, style: 'valueCell' },
                ],
                [
                  { text: 'Fecha de Vencimiento:', style: 'labelCell' },
                  { text: fechaVencimiento, style: 'valueCell' },
                ],
                [
                  { text: 'Estado:', style: 'labelCell' },
                  {
                    text: reserva.estado?.toUpperCase() || 'N/A',
                    style: 'valueCell',
                    bold: true,
                  },
                ],
                [
                  { text: 'Monto de Reserva:', style: 'labelCell' },
                  { text: montoReserva, style: 'valueCell', alignment: 'right' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },

          // Información del Cliente
          {
            text: 'INFORMACIÓN DEL CLIENTE',
            style: 'sectionHeader',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Nombre:', style: 'labelCell' },
                  { text: reserva.cliente?.fullName || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Email:', style: 'labelCell' },
                  { text: reserva.cliente?.email || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Teléfono:', style: 'labelCell' },
                  { text: reserva.cliente?.telefono || 'N/A', style: 'valueCell' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },

          // Información del Lote
          {
            text: 'INFORMACIÓN DEL INMUEBLE',
            style: 'sectionHeader',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                [
                  { text: 'Número de Lote:', style: 'labelCell' },
                  { text: reserva.lote?.numeroLote || 'N/A', style: 'valueCell' },
                ],
                [
                  { text: 'Superficie:', style: 'labelCell' },
                  { text: `${reserva.lote?.superficieM2 || 'N/A'} m²`, style: 'valueCell' },
                ],
                [
                  { text: 'Urbanización:', style: 'labelCell' },
                  { text: reserva.lote?.urbanizacion?.nombre || 'N/A', style: 'valueCell' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },
        ],

        styles: {
          header: {
            fontSize: 18,
            bold: true,
            color: '#000000',
            alignment: 'center',
          },
          subheader: {
            fontSize: 12,
            color: '#666666',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#000000',
            margin: [0, 0, 0, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: '#000000',
            fillColor: '#f8f8f8',
            padding: [8, 6, 8, 6],
          },
          valueCell: {
            fontSize: 10,
            color: '#000000',
            padding: [8, 6, 8, 6],
          },
        },

        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
          color: '#000000',
        },
      };

      const fileName = `Reserva_${reserva.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de reserva:', error);
    }
  }

  /**
   * GENERAR PDF DE TODAS LAS VENTAS (Ya existente - manteniendo)
   */
  generarPdfVentas(ventas: any[]): void {
    try {
      if (!ventas || ventas.length === 0) {
        console.error('No hay ventas para generar el PDF');
        return;
      }

      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');

      const tableBody: any[] = [];

      // ENCABEZADO DE LA TABLA
      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'ID VENTA', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'center' },
        { text: 'PRECIO FINAL', style: 'tableHeader', alignment: 'right' },
        { text: 'FECHA VENTA', style: 'tableHeader', alignment: 'center' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
        { text: 'MÉTODO PAGO', style: 'tableHeader', alignment: 'center' },
        { text: 'PLAN PAGO', style: 'tableHeader', alignment: 'center' },
      ]);

      // DATOS DE LAS VENTAS
      ventas.forEach((venta, index) => {
        const fechaVenta = this.formatDate(venta.fecha_venta);
        const precioFinal = this.formatCurrency(venta.precioFinal || venta.total);
        const tienePlanPago = venta.planPago ? 'SÍ' : 'NO';

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${venta.id}`, style: 'tableCell', alignment: 'center' },
          { text: venta.cliente?.fullName || 'N/A', style: 'tableCell', alignment: 'left' },
          { text: venta.lote?.numeroLote || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: precioFinal, style: 'tableCell', alignment: 'right' },
          { text: fechaVenta, style: 'tableCell', alignment: 'center' },
          {
            text: venta.estado?.toUpperCase() || 'N/A',
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: venta.metodo_pago?.toUpperCase() || 'N/A',
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: tienePlanPago,
            style: 'tableCell',
            alignment: 'center',
          },
        ]);
      });

      // CALCULAR TOTALES
      const totalVentas = ventas.length;
      const totalMonto = ventas.reduce(
        (sum, venta) => sum + (venta.precioFinal || venta.total || 0),
        0
      );
      const ventasPagadas = ventas.filter((v) => v.estado === 'pagado').length;
      const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 80, 20, 60],

        header: {
          columns: [
            {
              stack: [
                { text: 'REPORTE GENERAL DE VENTAS', style: 'header' },
                { text: 'Sistema de Gestión Inmobiliaria', style: 'subheader' },
                { text: `Generado el: ${fechaHora}`, style: 'fechaHeader' },
              ],
              alignment: 'center',
            },
          ],
          margin: [0, 20, 0, 0],
        },

        footer: (currentPage: number, pageCount: number) => {
          return {
            columns: [
              {
                text: 'Confidencial - Uso Interno',
                alignment: 'left',
                margin: [20, 0, 0, 0],
                fontSize: 8,
                color: '#666666',
              },
              {
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 20, 0],
                fontSize: 8,
                color: '#666666',
              },
            ],
            margin: [0, 10, 0, 10],
          };
        },

        content: [
          // Resumen ejecutivo
          {
            table: {
              widths: ['25%', '25%', '25%', '25%'],
              body: [
                [
                  { text: 'TOTAL VENTAS', style: 'resumenLabel', alignment: 'center' },
                  { text: 'MONTO TOTAL', style: 'resumenLabel', alignment: 'center' },
                  { text: 'VENTAS PAGADAS', style: 'resumenLabel', alignment: 'center' },
                  { text: 'VENTAS PENDIENTES', style: 'resumenLabel', alignment: 'center' },
                ],
                [
                  { text: totalVentas.toString(), style: 'resumenValue', alignment: 'center' },
                  {
                    text: this.formatCurrency(totalMonto),
                    style: 'resumenValue',
                    alignment: 'center',
                  },
                  { text: ventasPagadas.toString(), style: 'resumenValue', alignment: 'center' },
                  { text: ventasPendientes.toString(), style: 'resumenValue', alignment: 'center' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 0, 0, 20],
          },

          // Tabla de ventas
          {
            table: {
              headerRows: 1,
              widths: ['4%', '8%', '18%', '8%', '12%', '10%', '10%', '12%', '8%'],
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) => {
                return i === 0 || i === node.table.body.length ? 1 : 0.5;
              },
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },

          // Resumen final
          {
            text: `Total de ventas registradas: ${totalVentas} | Monto total: ${this.formatCurrency(
              totalMonto
            )}`,
            style: 'summary',
            margin: [0, 20, 0, 0],
          },
        ],

        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          subheader: {
            fontSize: 12,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          fechaHeader: {
            fontSize: 10,
            color: '#000000',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          resumenLabel: {
            bold: true,
            fontSize: 10,
            color: '#000000',
            fillColor: '#f0f0f0',
            padding: [8, 6, 8, 6],
          },
          resumenValue: {
            bold: true,
            fontSize: 12,
            color: '#000000',
            padding: [8, 6, 8, 6],
          },
          tableHeader: {
            bold: true,
            fontSize: 9,
            color: '#FFFFFF',
            fillColor: '#404040',
            alignment: 'center',
          },
          tableCell: {
            fontSize: 8,
            color: '#000000',
          },
          summary: {
            fontSize: 10,
            bold: true,
            alignment: 'right',
            color: '#000000',
          },
        },

        defaultStyle: {
          font: 'Roboto',
          fontSize: 8,
          color: '#000000',
        },
      };

      const fileName = `Reporte_Ventas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de ventas:', error);
    }
  }

  /**
   * GENERAR PDF INDIVIDUAL DE UNA VENTA (Ya existente - manteniendo)
   */
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

      let primaryColor = '#0D9488'; // teal-600
      let accentColor = '#14B8A6'; // teal-500
      let darkTeal = '#115E59'; // teal-800
      const lightBg = '#F0FDFA'; // teal-50
      let darkText = '#134E4A';
      const mutedText = '#5EEAD4';

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 120, 40, 60],

        header: (currentPage: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595,
                    h: 100,
                    color: primaryColor,
                  },
                ],
              },
              {
                text: 'COMPROBANTE DE VENTA',
                style: 'mainHeader',
                margin: [40, -80, 40, 0],
              },
              {
                text: `Venta #${venta.id}`,
                style: 'subHeader',
                margin: [40, 5, 40, 0],
              },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 40,
                    y1: 15,
                    x2: 555,
                    y2: 15,
                    lineWidth: 3,
                    lineColor: '#FFFFFF',
                  },
                ],
              },
            ],
          };
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
          // INFORMACIÓN DE LA VENTA
          {
            columns: [
              {
                width: '48%',
                stack: [
                  {
                    text: 'Información de Venta',
                    style: 'cardTitle',
                  },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              {
                                columns: [
                                  { text: 'Fecha:', style: 'tableLabel', width: '35%' },
                                  { text: fechaVenta, style: 'tableValue', width: '65%' },
                                ],
                                margin: [0, 8, 0, 8],
                              },
                              {
                                canvas: [
                                  {
                                    type: 'line',
                                    x1: 0,
                                    y1: 0,
                                    x2: 220,
                                    y2: 0,
                                    lineWidth: 0.5,
                                    lineColor: '#99F6E4',
                                  },
                                ],
                              },
                              {
                                columns: [
                                  { text: 'Estado:', style: 'tableLabel', width: '35%' },
                                  {
                                    text: venta.estado?.toUpperCase() || 'N/A',
                                    style: 'statusBadge',
                                    width: '65%',
                                  },
                                ],
                                margin: [0, 8, 0, 8],
                              },
                              {
                                canvas: [
                                  {
                                    type: 'line',
                                    x1: 0,
                                    y1: 0,
                                    x2: 220,
                                    y2: 0,
                                    lineWidth: 0.5,
                                    lineColor: '#99F6E4',
                                  },
                                ],
                              },
                              {
                                columns: [
                                  { text: 'Método de Pago:', style: 'tableLabel', width: '35%' },
                                  {
                                    text: venta.metodo_pago?.toUpperCase() || 'N/A',
                                    style: 'tableValue',
                                    width: '65%',
                                  },
                                ],
                                margin: [0, 8, 0, 8],
                              },
                            ],
                            fillColor: '#FFFFFF',
                            margin: [10, 5, 10, 5],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 2,
                      vLineWidth: () => 2,
                      hLineColor: () => primaryColor,
                      vLineColor: () => primaryColor,
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                ],
              },
              { width: '4%', text: '' },
              {
                width: '48%',
                stack: [
                  {
                    text: 'Cliente',
                    style: 'cardTitle',
                  },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              {
                                text: venta.cliente?.fullName || 'N/A',
                                style: 'clientName',
                                margin: [0, 8, 0, 5],
                              },
                              {
                                canvas: [
                                  {
                                    type: 'line',
                                    x1: 0,
                                    y1: 0,
                                    x2: 220,
                                    y2: 0,
                                    lineWidth: 0.5,
                                    lineColor: '#99F6E4',
                                  },
                                ],
                                margin: [0, 0, 0, 5],
                              },
                              {
                                text: venta.cliente?.email || 'N/A',
                                style: 'clientDetail',
                                margin: [0, 0, 0, 3],
                              },
                              {
                                text: venta.cliente?.telefono || 'N/A',
                                style: 'clientDetail',
                                margin: [0, 0, 0, 3],
                              },
                              {
                                text: venta.cliente?.direccion || 'N/A',
                                style: 'clientDetail',
                                margin: [0, 0, 0, 8],
                              },
                            ],
                            fillColor: '#FFFFFF',
                            margin: [10, 5, 10, 5],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 2,
                      vLineWidth: () => 2,
                      hLineColor: () => primaryColor,
                      vLineColor: () => primaryColor,
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },

          // INFORMACIÓN DEL INMUEBLE
          {
            text: 'Detalle del Inmueble',
            style: 'sectionTitle',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['50%', '50%'],
              body: [
                [
                  {
                    text: 'Lote',
                    style: 'tableHeaderCell',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: venta.lote?.numeroLote || 'N/A',
                    style: 'tableValueCell',
                    fillColor: '#FFFFFF',
                  },
                ],
                [
                  {
                    text: 'Superficie',
                    style: 'tableHeaderCell',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: `${venta.lote?.superficieM2 || 'N/A'} m²`,
                    style: 'tableValueCell',
                    fillColor: '#FFFFFF',
                  },
                ],
                [
                  {
                    text: 'Urbanización',
                    style: 'tableHeaderCell',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: venta.lote?.urbanizacion?.nombre || 'N/A',
                    style: 'tableValueCell',
                    fillColor: '#FFFFFF',
                  },
                ],
                [
                  {
                    text: 'Precio Base',
                    style: 'tableHeaderCell',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: this.formatCurrency(venta.lote?.precioBase || 0),
                    style: 'tableValueCell',
                    fillColor: '#FFFFFF',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) => 2,
              vLineWidth: (i: number, node: any) => 2,
              hLineColor: () => primaryColor,
              vLineColor: () => primaryColor,
            },
          },

          // RESUMEN FINANCIERO
          {
            text: 'RESUMEN FINANCIERO',
            style: 'financialTitle',
            margin: [0, 25, 0, 15],
            alignment: 'center',
          },
          {
            table: {
              widths: ['60%', '40%'],
              body: [
                [
                  {
                    text: 'Subtotal:',
                    style: 'financialRowLabel',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: subtotal,
                    style: 'financialRowValue',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                    alignment: 'right',
                  },
                ],
                [
                  {
                    text: 'Descuento:',
                    style: 'financialRowLabel',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                  },
                  {
                    text: descuento,
                    style: 'financialRowValue',
                    fillColor: primaryColor,
                    color: '#FFFFFF',
                    alignment: 'right',
                  },
                ],
                [
                  {
                    text: 'TOTAL:',
                    style: 'totalLabel',
                    fillColor: '#FFFFFF',
                    color: primaryColor,
                  },
                  {
                    text: precioFinal,
                    style: 'totalAmount',
                    fillColor: '#FFFFFF',
                    color: primaryColor,
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number) => 3,
              vLineWidth: (i: number) => 3,
              hLineColor: () => primaryColor,
              vLineColor: () => primaryColor,
              paddingLeft: () => 20,
              paddingRight: () => 20,
              paddingTop: () => 15,
              paddingBottom: () => 15,
            },
          },

          // PLAN DE PAGOS
          ...this.buildPlanPagosSection(venta.planPago),

          // OBSERVACIONES
          ...this.buildObservacionesSection(venta.observaciones),
        ],

        styles: {
          mainHeader: {
            fontSize: 24,
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
            color: '#5EEAD4',
          },
          cardTitle: {
            fontSize: 13,
            bold: true,
            color: primaryColor,
            margin: [0, 0, 0, 8],
          },
          tableLabel: {
            fontSize: 9,
            color: darkTeal,
            bold: true,
          },
          tableValue: {
            fontSize: 10,
            color: darkText,
          },
          statusBadge: {
            fontSize: 9,
            bold: true,
            color: accentColor,
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: primaryColor,
          },
          clientDetail: {
            fontSize: 9,
            color: darkText,
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: primaryColor,
          },
          tableHeaderCell: {
            fontSize: 11,
            bold: true,
            margin: [0, 8, 0, 8],
          },
          tableValueCell: {
            fontSize: 11,
            color: darkText,
            margin: [0, 8, 0, 8],
          },
          financialTitle: {
            fontSize: 14,
            bold: true,
            color: primaryColor,
          },
          financialRowLabel: {
            fontSize: 11,
            color: darkText,
          },
          financialRowValue: {
            fontSize: 11,
            color: darkText,
          },
          totalLabel: {
            fontSize: 14,
            bold: true,
          },
          totalAmount: {
            fontSize: 16,
            bold: true,
          },
          paymentHeaderCell: {
            fontSize: 11,
            bold: true,
          },
          paymentValueCell: {
            fontSize: 11,
            color: darkText,
          },
          paymentHighlight: {
            fontSize: 12,
            bold: true,
            color: accentColor,
          },
          paymentStatus: {
            fontSize: 11,
            bold: true,
            color: accentColor,
          },
          observationsText: {
            fontSize: 10,
            color: darkText,
            alignment: 'justify',
            lineHeight: 1.5,
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

  private buildPlanPagosSection(planPago: any): any[] {
    if (!planPago) {
      return [];
    }

    const totalPagado =
      planPago.total_pagado ||
      (planPago.pagos && Array.isArray(planPago.pagos)
        ? planPago.pagos.reduce((sum: number, pago: any) => sum + Number(pago.monto || 0), 0)
        : 0);

    const saldoPendiente = Math.max(0, Number(planPago.total || 0) - totalPagado);
    const porcentajePagado =
      Number(planPago.total || 0) > 0 ? (totalPagado / Number(planPago.total || 0)) * 100 : 0;

    return [
      {
        text: 'Plan de Pagos',
        style: 'sectionTitle',
        margin: [0, 25, 0, 10],
      },
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                text: 'Monto Total',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: this.formatCurrency(planPago.total),
                style: 'paymentValueCell',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Monto Inicial',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: this.formatCurrency(planPago.monto_inicial),
                style: 'paymentValueCell',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Total Pagado',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: this.formatCurrency(totalPagado),
                style: 'paymentValueCell',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Saldo Pendiente',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: this.formatCurrency(saldoPendiente),
                style: 'paymentHighlight',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Porcentaje Pagado',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: `${porcentajePagado.toFixed(1)}%`,
                style: 'paymentValueCell',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
            [
              {
                text: 'Estado',
                style: 'paymentHeaderCell',
                fillColor: '#0D9488',
                color: '#FFFFFF',
              },
              {
                text: planPago.estado?.toUpperCase() || 'ACTIVO',
                style: 'paymentStatus',
                fillColor: '#FFFFFF',
                alignment: 'right',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 2,
          vLineWidth: () => 2,
          hLineColor: () => '#0D9488',
          vLineColor: () => '#0D9488',
          paddingLeft: () => 15,
          paddingRight: () => 15,
          paddingTop: () => 10,
          paddingBottom: () => 10,
        },
      },
    ];
  }

  private buildObservacionesSection(observaciones: string | undefined): any[] {
    if (!observaciones) {
      return [];
    }

    return [
      {
        text: 'Observaciones',
        style: 'sectionTitle',
        margin: [0, 25, 0, 10],
      },
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: observaciones,
                style: 'observationsText',
                fillColor: '#FFFFFF',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 2,
          vLineWidth: () => 2,
          hLineColor: () => '#0D9488',
          vLineColor: () => '#0D9488',
          paddingLeft: () => 15,
          paddingRight: () => 15,
          paddingTop: () => 15,
          paddingBottom: () => 15,
        },
      },
    ];
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
    return `$ ${isNaN(num) ? '0.00' : num.toFixed(2)}`;
  }
}
