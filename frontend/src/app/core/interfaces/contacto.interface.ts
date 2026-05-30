export interface ContactoDto {
  id: number;
  uuid: string;
  firstName: string;
  lastName: string;
  ci: string;
  genero?: string;
  telefono: string;
  ocupacion?: string;
  email?: string;
  pais?: string;
  departamento?: string;
  domicilio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactoDto {
  firstName: string;
  lastName: string;
  ci: string;
  genero?: string;
  telefono: string;
  ocupacion?: string;
  email?: string;
  pais?: string;
  departamento?: string;
  domicilio?: string;
}

export interface UpdateContactoDto {
  firstName?: string;
  lastName?: string;
  ci?: string;
  genero?: string;
  telefono?: string;
  ocupacion?: string;
  email?: string;
  pais?: string;
  departamento?: string;
  domicilio?: string;
}
