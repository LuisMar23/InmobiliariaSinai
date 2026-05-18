// src/seguridad/seguridad.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma';
import { PrismaService } from 'src/config/prisma.service';


@Injectable()
export class SeguridadService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // MÓDULOS
  // ============================================================

  async getModulos() {
    try {
      const modulos = await this.prisma.modulo.findMany({
        where: { activo: true },
        include: {
          hijos: {
            where: { activo: true },
            orderBy: { nombre: 'asc' },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      // Solo retornar padres (los hijos vienen incluidos)
      const padres = modulos.filter((m) => m.padreId === null);

      return { success: true, data: { modulos: padres } };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener módulos');
    }
  }

  // ============================================================
  // PERMISOS POR ROL
  // ============================================================

  async getPermisosPorRole(role: UserRole) {
    try {
      const permisos = await this.prisma.permisoRole.findMany({
        where: { role },
        include: {
          modulo: {
            include: {
              hijos: { where: { activo: true } },
            },
          },
        },
      });

      return { success: true, data: { role, permisos } };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener permisos');
    }
  }

  async updatePermisosRole(
    role: UserRole,
    permisos: {
      moduloId: number;
      puedeVer: boolean;
      puedeCrear: boolean;
      puedeEditar: boolean;
      puedeEliminar: boolean;
    }[],
  ) {
    try {
      const results = await Promise.all(
        permisos.map((p) =>
          this.prisma.permisoRole.upsert({
            where: { role_moduloId: { role, moduloId: p.moduloId } },
            update: {
              puedeVer: p.puedeVer,
              puedeCrear: p.puedeCrear,
              puedeEditar: p.puedeEditar,
              puedeEliminar: p.puedeEliminar,
            },
            create: {
              role,
              moduloId: p.moduloId,
              puedeVer: p.puedeVer,
              puedeCrear: p.puedeCrear,
              puedeEditar: p.puedeEditar,
              puedeEliminar: p.puedeEliminar,
            },
          }),
        ),
      );

      return {
        success: true,
        message: `Permisos actualizados para ${role}`,
        data: { permisos: results },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar permisos');
    }
  }

  // ============================================================
  // PERMISOS DE UN USUARIO (para el frontend al hacer login)
  // ============================================================

  async getPermisosUsuario(role: UserRole) {
    try {
      const permisos = await this.prisma.permisoRole.findMany({
        where: { role },
        include: { modulo: true },
      });

      // Formato simplificado para el frontend
      const permisosMap = permisos.reduce(
        (acc, p) => {
          acc[p.modulo.clave] = {
            ver: p.puedeVer,
            crear: p.puedeCrear,
            editar: p.puedeEditar,
            eliminar: p.puedeEliminar,
          };
          return acc;
        },
        {} as Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }>,
      );

      return { success: true, data: { permisos: permisosMap } };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener permisos del usuario');
    }
  }

  // ============================================================
  // URBANIZACIONES POR USUARIO
  // ============================================================

  async getUrbanizacionesUsuario(usuarioId: number) {
    try {
      const usuario = await this.prisma.user.findUnique({
        where: { id: usuarioId },
        include: {
          urbanizacionesAsignadas: {
            include: {
              urbanizacion: true,
            },
          },
        },
      });

      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      return {
        success: true,
        data: {
          urbanizaciones: usuario.urbanizacionesAsignadas.map((u) => u.urbanizacion),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al obtener urbanizaciones');
    }
  }

  async asignarUrbanizaciones(usuarioId: number, urbanizacionIds: number[]) {
    try {
      const usuario = await this.prisma.user.findUnique({
        where: { id: usuarioId },
      });

      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      // Borrar las actuales y reasignar
      await this.prisma.usuarioUrbanizacion.deleteMany({
        where: { usuarioId },
      });

      if (urbanizacionIds.length > 0) {
        await this.prisma.usuarioUrbanizacion.createMany({
          data: urbanizacionIds.map((urbanizacionId) => ({
            usuarioId,
            urbanizacionId,
          })),
          skipDuplicates: true,
        });
      }

      const resultado = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        include: { urbanizacion: true },
      });

      return {
        success: true,
        message: 'Urbanizaciones asignadas correctamente',
        data: {
          urbanizaciones: resultado.map((r) => r.urbanizacion),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al asignar urbanizaciones');
    }
  }

  async removerUrbanizacion(usuarioId: number, urbanizacionId: number) {
    try {
      await this.prisma.usuarioUrbanizacion.deleteMany({
        where: { usuarioId, urbanizacionId },
      });

      return {
        success: true,
        message: 'Urbanización removida correctamente',
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al remover urbanización');
    }
  }
}