// src/seguridad/seguridad.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SeguridadService } from './seguridad.service';
import { UserRole } from 'generated/prisma';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { RequierePermiso } from 'src/auth/guards/permisos/decorator/permisos.decorator';
import { PermisosGuard } from 'src/auth/guards/permisos/permisos.guard';


@Controller('seguridad')
@UseGuards(JwtAuthGuard, PermisosGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class SeguridadController {
  constructor(private readonly seguridadService: SeguridadService) {}

  // ============================================================
  // MÓDULOS
  // ============================================================

  @Get('modulos')
  @RequierePermiso('usuarios', 'puedeVer')
  async getModulos() {
    return this.seguridadService.getModulos();
  }

  // ============================================================
  // PERMISOS POR ROL
  // ============================================================

  @Get('permisos/:role')
  @RequierePermiso('usuarios', 'puedeVer')
  async getPermisosPorRole(@Param('role') role: UserRole) {
    return this.seguridadService.getPermisosPorRole(role);
  }

  @Put('permisos/:role')
  @RequierePermiso('usuarios', 'puedeEditar')
  async updatePermisosRole(
    @Param('role') role: UserRole,
    @Body()
    body: {
      permisos: {
        moduloId: number;
        puedeVer: boolean;
        puedeCrear: boolean;
        puedeEditar: boolean;
        puedeEliminar: boolean;
      }[];
    },
  ) {
    return this.seguridadService.updatePermisosRole(role, body.permisos);
  }

  // ============================================================
  // PERMISOS DE USUARIO ACTUAL (para el frontend)
  // ============================================================

  @Get('mis-permisos/:role')
  async getMisPermisos(@Param('role') role: UserRole) {
    return this.seguridadService.getPermisosUsuario(role);
  }

  // ============================================================
  // URBANIZACIONES POR USUARIO
  // ============================================================

  @Get('usuarios/:id/urbanizaciones')
  @RequierePermiso('usuarios', 'puedeVer')
  async getUrbanizacionesUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.seguridadService.getUrbanizacionesUsuario(id);
  }

  @Put('usuarios/:id/urbanizaciones')
  @RequierePermiso('usuarios', 'puedeEditar')
  async asignarUrbanizaciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { urbanizacionIds: number[] },
  ) {
    return this.seguridadService.asignarUrbanizaciones(id, body.urbanizacionIds);
  }

  @Delete('usuarios/:id/urbanizaciones/:urbanizacionId')
  @RequierePermiso('usuarios', 'puedeEditar')
  async removerUrbanizacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('urbanizacionId', ParseIntPipe) urbanizacionId: number,
  ) {
    return this.seguridadService.removerUrbanizacion(id, urbanizacionId);
  }
}