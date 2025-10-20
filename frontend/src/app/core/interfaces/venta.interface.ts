export interface VentaDto {
  id: number;
  uuid: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioFinal: number;
  estado: string;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: number;
    fullName: string;
    email: string;
    telefono: string;
    ci: string;
    role: string;
  };
  asesor?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
  lote?: {
    id: number;
    numeroLote: string;
    superficieM2: number;
    precioBase: number;
    estado: string;
    urbanizacion?: {
      id: number;
      nombre: string;
      ubicacion: string;
    };
  };
  pagos?: Array<{
    id: number;
    monto: number;
    metodo: string;
    createdAt: string;
  }>;
  _count?: {
    pagos: number;
    documentos: number;
  };
}
