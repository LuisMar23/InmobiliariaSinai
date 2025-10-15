export interface UserDto {
  id: number;
  uuid: string;
  fullName: string;
  username: string;
  ci: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  telefono: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  failedAttempts: number;
  lockUntil?: Date;
}

export type UserRole = 'USER' | 'ADMIN';
