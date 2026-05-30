export interface SedeForGrupo {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface GrupoDto {
  id: number;
  uuid: string;
  tipoUsuario: string;
  nombreEmpresa?: string;
  descripcion?: string;
  sedeId: number;
  sede?: SedeForGrupo;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrupoDto {
  tipoUsuario: string;
  nombreEmpresa?: string;
  descripcion?: string;
  sedeId: number;
}

export interface UpdateGrupoDto {
  tipoUsuario?: string;
  nombreEmpresa?: string;
  descripcion?: string;
  sedeId?: number;
}
