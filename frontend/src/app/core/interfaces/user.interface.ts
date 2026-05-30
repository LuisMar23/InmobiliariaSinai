export interface UserDto {
  id: number;
  uuid: string;
  fullName: string;
  username?: string;
  ci: string;
  email?: string;
  telefono: string;
  direccion?: string;
  observaciones?: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  grupoId?: number;
  grupo?: {
    id: number;
    tipoUsuario: string;
    nombreEmpresa?: string;
  };
  urbanizacionesAsignadas?: any[];
}
