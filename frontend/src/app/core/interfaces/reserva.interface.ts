export interface ReservaDto {
  id: number;
  uuid: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  montoReserva: number;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: number;
    fullName: string;
    email: string;
    telefono: string;
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
}