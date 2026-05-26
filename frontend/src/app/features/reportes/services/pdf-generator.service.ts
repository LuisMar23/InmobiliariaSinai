// services/pdf-generator.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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

// ── Paleta de colores ──────────────────────────────────────────
const C = {
  verde:       '#2d6a4f',
  verdeClaro:  '#52b788',
  verdePale:   '#d8f3dc',
  grisOscuro:  '#2d3748',
  grisMedio:   '#718096',
  grisClaro:   '#e2e8f0',
  grisPale:    '#f7fafc',
  blanco:      '#ffffff',
  azul:        '#2563eb',
  azulPale:    '#eff6ff',
  rojo:        '#c53030',
  rojoPale:    '#fff5f5',
  amarillo:    '#b7791f',
  amarilloPale:'#fffff0',
  negro:       '#1a202c',
};

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {

  constructor(private http: HttpClient) {}

  // ── Helpers ───────────────────────────────────────────────────

  private async getLogoBase64(assetPath: string): Promise<string | null> {
    try {
      const blob = await firstValueFrom(this.http.get(assetPath, { responseType: 'blob' }));
      return new Promise(resolve => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  private money(v: number): string {
    return `Bs. ${(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private fecha(s: string): string {
    if (!s) return 'S/D';
    return new Date(s).toLocaleDateString('es-BO');
  }

  private periodo(f: any): string {
    if (f?.fechaInicio && f?.fechaFin)
      return `Periodo: ${this.fecha(f.fechaInicio)} al ${this.fecha(f.fechaFin)}`;
    if (f?.fechaInicio) return `Desde: ${this.fecha(f.fechaInicio)}`;
    if (f?.fechaFin)    return `Hasta: ${this.fecha(f.fechaFin)}`;
    return 'Periodo: Todos los tiempos';
  }

  private inmueble(venta: any): string {
    if (venta?.lote) {
      let t = `Lote ${venta.lote.numeroLote}`;
      if (venta.lote.manzano) t += ` - Mz. ${venta.lote.manzano}`;
      if (venta.lote.ciudad)  t += ` (${venta.lote.ciudad})`;
      return t;
    }
    if (venta?.propiedad) {
      let t = venta.propiedad.nombre || 'Propiedad';
      if (venta.propiedad.ciudad) t += ` - ${venta.propiedad.ciudad}`;
      return t;
    }
    return 'N/A';
  }

  // ── Bloques reutilizables ─────────────────────────────────────

  /** Encabezado: logo + nombre empresa + título del reporte */
  private header(logo: string | null, titulo: string, landscape = false): any {
    const lineW = landscape ? 760 : 515;
    return [
      {
        columns: [
          logo
            ? { image: logo, width: 65, margin: [0, 0, 12, 0] }
            : { text: '', width: 65 },
          {
            width: '*',
            stack: [
              {
                text: 'SINAI BIENES RAICES',
                fontSize: 15, bold: true,
                color: C.verde, alignment: 'center',
                margin: [0, 4, 0, 2],
              },
              {
                text: titulo,
                fontSize: 11, bold: true,
                color: C.grisOscuro, alignment: 'center',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: lineW, y2: 0, lineWidth: 1, lineColor: C.verde }], margin: [0, 0, 0, 8] },
    ];
  }

  /** Fila de periodo + fecha de generación */
  private subHeader(filtros: any): any {
    return {
      columns: [
        { text: this.periodo(filtros), fontSize: 9, bold: true, color: C.grisOscuro },
        { text: `Generado: ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.grisMedio, alignment: 'right' },
      ],
      margin: [0, 0, 0, 14],
    };
  }

  /** Tarjeta de estadística individual */
  private statCard(label: string, value: string, bgColor: string, textColor: string): any {
    return {
      stack: [
        { text: label,  fontSize: 8,  bold: true, color: C.grisMedio, alignment: 'center', margin: [0, 0, 0, 4] },
        { text: value,  fontSize: 18, bold: true, color: textColor,   alignment: 'center' },
      ],
      fillColor: bgColor,
      margin: [3, 0, 3, 0],
    };
  }

  /** Cabecera de tabla con color verde */
  private thCell(text: string, align: 'left' | 'center' | 'right' = 'left'): any {
    return { text, fontSize: 8, bold: true, color: C.blanco, fillColor: C.verde, alignment: align, margin: [4, 5, 4, 5] };
  }

  /** Celda normal */
  private td(text: string, align: 'left' | 'center' | 'right' = 'left', bold = false, color = C.negro): any {
    return { text: text || '', fontSize: 8, bold, color, alignment: align, margin: [4, 4, 4, 4] };
  }

  /** Sección de título interno */
  private secTitle(text: string): any {
    return {
      stack: [
        { text, fontSize: 10, bold: true, color: C.verde },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: C.verdeClaro }] },
      ],
      margin: [0, 12, 0, 8],
    };
  }

  private layout = {
    hLineWidth:  () => 0.5,
    vLineWidth:  () => 0,
    hLineColor:  () => C.grisClaro,
    fillColor:   (_: number, node: any) => null,
    paddingLeft: () => 4,
    paddingRight: () => 4,
  };

  private stripedLayout = {
    hLineWidth:  () => 0.5,
    vLineWidth:  () => 0,
    hLineColor:  () => C.grisClaro,
    fillColor:   (row: number) => row > 0 && row % 2 === 0 ? C.grisPale : null,
    paddingLeft: () => 4,
    paddingRight: () => 4,
  };

  // ── 1. REPORTE GENERAL ────────────────────────────────────────
  // ── 1. REPORTE GENERAL ────────────────────────────────────────
async generarReporteGeneral(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const resumen = data?.resumen || {};
    const ventas  = data?.ventas  || [];

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE GENERAL DE VENTAS', true),
        // Solo agregar esta línea después del header
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        // Stats
        {
          columns: [
            this.statCard('TOTAL VENTAS',     String(resumen.totalVentas    || 0), C.azulPale,     C.azul),
            this.statCard('MONTO TOTAL',       this.money(resumen.montoTotal || 0), C.verdePale,    C.verde),
            this.statCard('VENTAS PAGADAS',   String(resumen.porEstado?.pagado    || 0), C.verdePale, C.verdeClaro),
            this.statCard('VENTAS PENDIENTES', String(resumen.porEstado?.pendiente || 0), C.amarilloPale, C.amarillo),
          ],
          margin: [0, 0, 0, 18],
        },

        this.secTitle('DETALLE DE VENTAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', '*', 70, 58],
            body: [
              [
                this.thCell('ID',       'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI',       'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('MONTO',    'right'),
                this.thCell('FECHA',    'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`,                             'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci       || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName  || 'N/A'),
                this.td(this.money(v.precioFinal), 'right', true, C.verde),
                this.td(this.fecha(v.createdAt),   'center'),
              ]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const tag = filtros.fechaInicio && filtros.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Reporte_General_${alcanceTag}_${tag}.pdf`);
}

// ── 2. VENTAS POR VENDEDOR ────────────────────────────────────
async generarReporteVendedores(data: any, filtros: any, infoAdicional?: any) {
    const logo      = await this.getLogoBase64('assets/logoSinai.jpg');
    const vendedores = data?.vendedores || [];
    const resumen    = data?.resumen    || {};

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const posiciones = ['1er', '2do', '3er'];

    const rankingRows = vendedores.map((v: any, i: number) => ({
      columns: [
        {
          width: 30,
          stack: [{ text: posiciones[i] || `${i + 1}`, fontSize: 10, bold: true, color: C.verde, alignment: 'center' }],
        },
        {
          width: '*',
          stack: [
            { text: v.asesor.fullName, fontSize: 10, bold: true, color: C.grisOscuro },
            { text: `${v.totalVentas} ventas  |  Pagadas: ${v.ventasPagadas}  |  Pendientes: ${v.ventasPendientes}`, fontSize: 8, color: C.grisMedio },
          ],
        },
        {
          width: 110,
          stack: [{ text: this.money(v.montoTotal), fontSize: 12, bold: true, color: C.verde, alignment: 'right' }],
        },
      ],
      fillColor: i === 0 ? C.verdePale : C.grisPale,
      margin: [0, 0, 0, 4],
    }));

    const detalleBody = vendedores.flatMap((v: any) =>
      v.detalle?.map((venta: any) => {
        let inm = venta.lote
          ? `Lote ${venta.lote.numeroLote}${venta.lote.manzano ? ' - Mz. ' + venta.lote.manzano : ''}`
          : venta.propiedad?.nombre || 'N/A';
        return [
          this.td(v.asesor.fullName),
          this.td(venta.cliente?.fullName || 'S/R'),
          this.td(venta.cliente?.ci       || 'S/D', 'center'),
          this.td(inm),
          this.td(this.money(venta.precioFinal), 'right', true, C.verde),
        ];
      }) || []
    );

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE DE VENTAS POR VENDEDOR'),
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        // Stats
        {
          columns: [
            this.statCard('VENDEDORES',  String(resumen.totalVendedores || 0), C.azulPale,  C.azul),
            this.statCard('TOTAL VENTAS', String(resumen.totalVentas    || 0), C.verdePale, C.verdeClaro),
            this.statCard('MONTO TOTAL',  this.money(resumen.montoTotal || 0), C.verdePale, C.verde),
          ],
          margin: [0, 0, 0, 18],
        },

        this.secTitle('RANKING DE VENDEDORES'),
        ...rankingRows,

        this.secTitle('DETALLE DE VENTAS POR VENDEDOR'),

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 55, '*', 75],
            body: [
              [
                this.thCell('VENDEDOR'),
                this.thCell('CLIENTE'),
                this.thCell('CI',      'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('MONTO',   'right'),
              ],
              ...(detalleBody.length ? detalleBody : [[
                { text: 'Sin detalle disponible', colSpan: 5, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 6, 0, 6] },
                {}, {}, {}, {},
              ]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const tag = filtros.fechaInicio && filtros.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Reporte_Vendedores_${alcanceTag}_${tag}.pdf`);
}

// ── 3. CUOTAS POR COBRAR ──────────────────────────────────────
async generarReporteCuotas(data: any, filtros: any, infoAdicional?: any) {
    const logo   = await this.getLogoBase64('assets/logoSinai.jpg');
    const cuotas  = data?.cuotas  || [];
    const resumen = data?.resumen || {};

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE DE CUOTAS POR COBRAR', true),
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('TOTAL POR COBRAR', this.money(resumen.totalPorCobrar || 0), C.rojoPale,     C.rojo),
            this.statCard('PLANES VENCIDOS',  String(resumen.planesVencidos     || 0), C.amarilloPale, C.amarillo),
            this.statCard('PLANES ACTIVOS',   String(resumen.totalPlanes        || 0), C.verdePale,    C.verdeClaro),
          ],
          margin: [0, 0, 0, 18],
        },

        this.secTitle('DETALLE DE CUOTAS PENDIENTES'),

        {
          table: {
            headerRows: 1,
            widths: ['*', 55, 70, '*', 80, 60, 50],
            body: [
              [
                this.thCell('CLIENTE'),
                this.thCell('CI',           'center'),
                this.thCell('TELEFONO'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('SALDO',         'right'),
                this.thCell('VENCIMIENTO',   'center'),
                this.thCell('ESTADO',        'center'),
              ],
              ...cuotas.map((c: any) => {
                const vencido = c.estaVencido;
                let inm = '';
                if (c.venta?.inmueble) {
                  inm = c.venta.inmuebleTipo === 'LOTE'
                    ? `Lote ${c.venta.inmueble.numeroLote || 'N/A'}${c.venta.inmueble.manzano ? ' - Mz. ' + c.venta.inmueble.manzano : ''}`
                    : c.venta.inmueble.nombre || 'Propiedad';
                }
                return [
                  this.td(c.venta?.cliente?.fullName || 'S/R'),
                  this.td(c.venta?.cliente?.ci       || 'S/D', 'center'),
                  this.td(c.venta?.cliente?.telefono || 'S/D'),
                  this.td(inm),
                  this.td(this.money(c.saldoPendiente), 'right', true, C.rojo),
                  this.td(this.fecha(c.fechaVencimiento), 'center'),
                  {
                    text: vencido ? 'VENCIDO' : 'AL DIA',
                    fontSize: 7, bold: true, alignment: 'center',
                    color: vencido ? C.rojo : C.verdeClaro,
                    fillColor: vencido ? C.rojoPale : C.verdePale,
                    margin: [4, 4, 4, 4],
                  },
                ];
              }),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const tag = filtros.fechaInicio && filtros.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Cuotas_por_Cobrar_${alcanceTag}_${tag}.pdf`);
}

// ── 4. DETALLE DE VENTAS ──────────────────────────────────────
async generarReporteDetalle(data: any, filtros: any, infoAdicional?: any) {
    const logo  = await this.getLogoBase64('assets/logoSinai.jpg');
    const ventas = data || [];

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'DETALLE COMPLETO DE VENTAS', true),
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        this.statCard('TOTAL REGISTROS', String(ventas.length), C.azulPale, C.azul),

        this.secTitle('LISTADO DE VENTAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', '*', 72, 58],
            body: [
              [
                this.thCell('ID',      'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI',      'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('PRECIO',  'right'),
                this.thCell('FECHA',   'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`,                           'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci       || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName  || 'N/A'),
                this.td(this.money(v.precioFinal),  'right', true, C.verde),
                this.td(this.fecha(v.createdAt),    'center'),
              ]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const tag = filtros.fechaInicio && filtros.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Detalle_Ventas_${alcanceTag}_${tag}.pdf`);
}

// ── 5. VENTAS COMPLETADAS ─────────────────────────────────────
async generarReporteCompletadas(data: any, filtros: any, infoAdicional?: any) {
    const logo   = await this.getLogoBase64('assets/logoSinai.jpg');
    const resumen = data?.resumen || {};
    const ventas  = data?.ventas  || [];

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'VENTAS COMPLETADAS - 100% PAGADAS'),
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('VENTAS PAGADAS', String(resumen.totalCompletadas || 0), C.verdePale, C.verdeClaro),
            this.statCard('MONTO TOTAL',    this.money(resumen.montoTotal   || 0), C.verdePale, C.verde),
          ],
          margin: [0, 0, 0, 18],
        },

        this.secTitle('DETALLE DE VENTAS COMPLETADAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', 72, 65],
            body: [
              [
                this.thCell('ID',        'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI',        'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('MONTO',     'right'),
                this.thCell('FECHA PAGO','center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`,                           'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci       || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(this.money(v.precioFinal),             'right', true, C.verde),
                this.td(this.fecha(v.updatedAt || v.createdAt),'center'),
              ]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const tag = filtros.fechaInicio && filtros.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Ventas_Completadas_${alcanceTag}_${tag}.pdf`);
}

// ── 6. VENTAS POR CLIENTE ─────────────────────────────────────
async generarReporteCliente(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const cliente  = data?.cliente || {};
    const resumen  = data?.resumen || {};
    const ventas   = data?.ventas  || [];

    const alcanceTexto = infoAdicional?.alcance === 'global' 
      ? 'GLOBAL (Todos los datos)' 
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;

    const fichaRow = (label: string, value: string) => ({
      columns: [
        { text: label, fontSize: 9, bold: true, color: C.grisMedio, width: 120 },
        { text: value || 'S/D', fontSize: 9, color: C.negro, width: '*' },
      ],
      margin: [0, 2, 0, 2],
    });

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'HISTORIAL DE VENTAS POR CLIENTE'),
        {
          text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString()}`,
          fontSize: 8,
          color: infoAdicional?.alcance === 'global' ? C.azul : C.verde,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        this.subHeader(filtros),

        // Ficha del cliente
        this.secTitle('DATOS DEL CLIENTE'),
        {
          fillColor: C.grisPale,
          stack: [
            fichaRow('Nombre completo:', cliente?.fullName),
            fichaRow('Cedula de identidad:', cliente?.ci),
            fichaRow('Telefono:', cliente?.telefono),
            fichaRow('Email:', cliente?.email),
          ],
          margin: [0, 0, 0, 14],
          padding: [10, 10, 10, 10],
        },

        // Stats
        {
          columns: [
            this.statCard('TOTAL VENTAS',     String(resumen.totalVentas       || 0), C.azulPale,     C.azul),
            this.statCard('MONTO TOTAL',       this.money(resumen.montoTotal   || 0), C.verdePale,    C.verde),
            this.statCard('PAGADAS',          String(resumen.ventasPagadas     || 0), C.verdePale,    C.verdeClaro),
            this.statCard('PENDIENTES',       String(resumen.ventasPendientes  || 0), C.amarilloPale, C.amarillo),
          ],
          margin: [0, 0, 0, 18],
        },

        this.secTitle('HISTORIAL DE COMPRAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', '*', 72, 58],
            body: [
              [
                this.thCell('ID',     'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('MONTO',  'right'),
                this.thCell('FECHA',  'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`,                        'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName || 'N/A'),
                this.td(this.money(v.precioFinal), 'right', true, C.verde),
                this.td(this.fecha(v.createdAt),   'center'),
              ]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (page: number, pages: number) => ({
        text: `Pagina ${page} de ${pages}  |  SINAI BIENES RAICES`,
        fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 0],
      }),
    };

    const nombre = cliente?.fullName?.replace(/\s+/g, '_') || 'Cliente';
    const alcanceTag = infoAdicional?.alcance === 'global' ? 'global' : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
    pdfMake.createPdf(doc).download(`Historial_${nombre}_${alcanceTag}.pdf`);
}
}