import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateLoteDto, EstadoInmueble } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';

@Injectable()
export class LoteService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number | undefined,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
  ) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || undefined,
        accion,
        tablaAfectada,
        registroId,
        datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
        datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
        ip: '127.0.0.1',
        dispositivo: 'API',
      },
    });
  }

  async create(createLoteDto: CreateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      if (!createLoteDto.esIndependiente && createLoteDto.urbanizacionId) {
        const urbanizacion = await prisma.urbanizacion.findUnique({
          where: { id: createLoteDto.urbanizacionId },
        });

        if (!urbanizacion) {
          throw new BadRequestException('Urbanización no encontrada');
        }

        const loteExistente = await prisma.lote.findFirst({
          where: {
            urbanizacionId: createLoteDto.urbanizacionId,
            numeroLote: createLoteDto.numeroLote,
          },
        });

        if (loteExistente) {
          throw new BadRequestException(
            'El número de lote ya existe en esta urbanización',
          );
        }
      }

      if (createLoteDto.esIndependiente) {
        const loteIndependienteExistente = await prisma.lote.findFirst({
          where: {
            esIndependiente: true,
            numeroLote: createLoteDto.numeroLote,
            ciudad: createLoteDto.ciudad,
          },
        });

        if (loteIndependienteExistente) {
          throw new BadRequestException(
            'Ya existe un lote independiente con este número en la misma ciudad',
          );
        }
      }

      const lote = await prisma.lote.create({
        data: {
          urbanizacionId: createLoteDto.esIndependiente
            ? null
            : createLoteDto.urbanizacionId,
          numeroLote: createLoteDto.numeroLote,
          superficieM2: createLoteDto.superficieM2,
          precioBase: createLoteDto.precioBase,
          estado: createLoteDto.estado || EstadoInmueble.DISPONIBLE,
          descripcion: createLoteDto.descripcion,
          ubicacion: createLoteDto.ubicacion,
          ciudad: createLoteDto.ciudad,
          latitud: createLoteDto.latitud,
          longitud: createLoteDto.longitud,
          esIndependiente: createLoteDto.esIndependiente,
        },
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
              ciudad: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        createLoteDto.usuarioId,
        'CREAR',
        'Lote',
        lote.id,
        null,
        lote,
      );

      return {
        success: true,
        message: 'Lote creado correctamente',
        data: lote,
      };
    });
  }

  async findAll(urbanizacionId?: number) {
    const where = urbanizacionId ? { urbanizacionId } : {};

    const lotes = await this.prisma.lote.findMany({
      where,
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
          },
        },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        _count: {
          select: {
            cotizaciones: true,
            ventas: true,
            reservas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const lotesConPrecioActual = lotes.map((lote) => {
      const promocionActiva = lote.LotePromocion[0];
      const precioActual = lote.precioBase;

      return {
        ...lote,
        precioActual,
        tienePromocionActiva: !!promocionActiva,
        promocionActiva: promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null,
      };
    });

    return {
      success: true,
      data: lotesConPrecioActual,
    };
  }

  async findOne(id: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
            descripcion: true,
          },
        },
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        cotizaciones: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        visitas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lote) {
      throw new NotFoundException(`Lote con ID ${id} no encontrado`);
    }

    const promocionActiva = lote.LotePromocion[0];
    const precioActual = lote.precioBase;

    const loteConPrecio = {
      ...lote,
      precioActual,
      tienePromocionActiva: !!promocionActiva,
      promocionActiva: promocionActiva
        ? {
            id: promocionActiva.promocion.id,
            titulo: promocionActiva.promocion.titulo,
            descuento: promocionActiva.promocion.descuento,
            fechaFin: promocionActiva.promocion.fechaFin,
          }
        : null,
    };

    return {
      success: true,
      data: loteConPrecio,
    };
  }

  async findOneUUID(uuid: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { uuid },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
            descripcion: true,
          },
        },
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        cotizaciones: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        visitas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lote) {
      throw new NotFoundException(`Lote con UUID ${uuid} no encontrado`);
    }

    const promocionActiva = lote.LotePromocion[0];
    const precioActual = lote.precioBase;

    const loteConPrecio = {
      ...lote,
      precioActual,
      tienePromocionActiva: !!promocionActiva,
      promocionActiva: promocionActiva
        ? {
            id: promocionActiva.promocion.id,
            titulo: promocionActiva.promocion.titulo,
            descuento: promocionActiva.promocion.descuento,
            fechaFin: promocionActiva.promocion.fechaFin,
          }
        : null,
    };

    return {
      success: true,
      data: loteConPrecio,
    };
  }

  async update(id: number, updateLoteDto: UpdateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      const loteExistente = await prisma.lote.findUnique({
        where: { id },
      });

      if (!loteExistente) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      const datosAntes = { ...loteExistente };

      if (updateLoteDto.urbanizacionId && !updateLoteDto.esIndependiente) {
        const urbanizacion = await prisma.urbanizacion.findUnique({
          where: { id: updateLoteDto.urbanizacionId },
        });
        if (!urbanizacion) {
          throw new BadRequestException('Urbanización no encontrada');
        }
      }

      if (updateLoteDto.numeroLote) {
        let whereClause = {};

        if (updateLoteDto.esIndependiente) {
          whereClause = {
            esIndependiente: true,
            numeroLote: updateLoteDto.numeroLote,
            ciudad: updateLoteDto.ciudad || loteExistente.ciudad,
            id: { not: id },
          };
        } else {
          whereClause = {
            urbanizacionId:
              updateLoteDto.urbanizacionId || loteExistente.urbanizacionId,
            numeroLote: updateLoteDto.numeroLote,
            id: { not: id },
          };
        }

        const loteConMismoNumero = await prisma.lote.findFirst({
          where: whereClause,
        });

        if (loteConMismoNumero) {
          throw new BadRequestException(
            'El número de lote ya existe en esta urbanización/ciudad',
          );
        }
      }

      const loteActualizado = await prisma.lote.update({
        where: { id },
        data: {
          urbanizacionId: updateLoteDto.esIndependiente
            ? null
            : updateLoteDto.urbanizacionId,
          numeroLote: updateLoteDto.numeroLote,
          superficieM2: updateLoteDto.superficieM2,
          precioBase: updateLoteDto.precioBase,
          estado: updateLoteDto.estado,
          descripcion: updateLoteDto.descripcion,
          ubicacion: updateLoteDto.ubicacion,
          ciudad: updateLoteDto.ciudad,
          latitud: updateLoteDto.latitud,
          longitud: updateLoteDto.longitud,
          esIndependiente: updateLoteDto.esIndependiente,
        },
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
              ciudad: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        updateLoteDto.usuarioId,
        'ACTUALIZAR',
        'Lote',
        id,
        datosAntes,
        loteActualizado,
      );

      return {
        success: true,
        message: 'Lote actualizado correctamente',
        data: loteActualizado,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const lote = await prisma.lote.findUnique({
        where: { id },
        include: {
          cotizaciones: true,
          ventas: true,
          reservas: true,
          visitas: true,
          archivos: true,
          LotePromocion: true,
        },
      });

      if (!lote) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      const tieneRelaciones =
        lote.cotizaciones.length > 0 ||
        lote.ventas.length > 0 ||
        lote.reservas.length > 0 ||
        lote.visitas.length > 0 ||
        lote.archivos.length > 0 ||
        lote.LotePromocion.length > 0;

      if (tieneRelaciones) {
        throw new BadRequestException(
          'No se puede eliminar el lote porque tiene relaciones activas',
        );
      }

      const datosAntes = { ...lote };

      await prisma.lote.delete({
        where: { id },
      });

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Lote',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Lote eliminado correctamente',
      };
    });
  }

  async getLotesParaCotizacion() {
    const lotes = await this.prisma.lote.findMany({
      where: {
        estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
      },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
          },
        },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        _count: {
          select: {
            cotizaciones: {
              where: {
                estado: 'PENDIENTE',
              },
            },
          },
        },
      },
      orderBy: {
        urbanizacionId: 'asc',
        numeroLote: 'asc',
      },
    });

    const lotesParaCotizacion = lotes.map((lote) => {
      const promocionActiva = lote.LotePromocion[0];
      const precioActual = lote.precioBase;

      return {
        id: lote.id,
        uuid: lote.uuid,
        numeroLote: lote.numeroLote,
        superficieM2: lote.superficieM2,
        precioBase: lote.precioBase,
        precioActual,
        estado: lote.estado,
        descripcion: lote.descripcion,
        ubicacion: lote.ubicacion,
        ciudad: lote.ciudad,
        esIndependiente: lote.esIndependiente,
        tienePromocionActiva: !!promocionActiva,
        promocionActiva: promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null,
        urbanizacion: lote.urbanizacion,
        cotizacionesPendientes: lote._count.cotizaciones,
        ahorro: promocionActiva
          ? Number(lote.precioBase) - Number(precioActual)
          : 0,
        porcentajeAhorro: promocionActiva
          ? Number(promocionActiva.promocion.descuento)
          : 0,
      };
    });

    return {
      success: true,
      data: lotesParaCotizacion,
    };
  }

  async getLotesConPromociones() {
    const lotes = await this.prisma.lote.findMany({
      where: {
        estado: 'DISPONIBLE',
        LotePromocion: {
          some: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
        },
      },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
          },
        },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
      },
    });

    const lotesConPromocion = lotes.map((lote) => ({
      ...lote,
      precioPromocional: lote.precioBase,
      promocion: lote.LotePromocion[0]?.promocion || null,
    }));

    return {
      success: true,
      data: lotesConPromocion,
    };
  }

  async obtenerLotesConPromocion() {
    const hoy = new Date();

    return this.prisma.lote.findMany({
      where: {
        LotePromocion: {
          some: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: hoy },
              fechaFin: { gte: hoy },
            },
          },
        },
      },
      include: {
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: hoy },
              fechaFin: { gte: hoy },
            },
          },
          include: {
            promocion: true,
          },
        },
        archivos: true,
        urbanizacion: true,
      },
    });
  }

  async asignarEncargado(
    loteId: number,
    encargadoId: number,
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const lote = await prisma.lote.findUnique({
        where: { id: loteId },
      });

      if (!lote) {
        throw new NotFoundException(`Lote con ID ${loteId} no encontrado`);
      }

      const encargado = await prisma.user.findUnique({
        where: {
          id: encargadoId,
          role: { in: ['ASESOR', 'ADMINISTRADOR'] },
        },
      });

      if (!encargado) {
        throw new BadRequestException(
          'Encargado no encontrado o no tiene permisos (solo ASESOR o ADMINISTRADOR)',
        );
      }

      const datosAntes = { ...lote };

      const loteActualizado = await prisma.lote.update({
        where: { id: loteId },
        data: {
          encargadoId: encargadoId,
        },
        include: {
          encargado: {
            select: {
              id: true,
              fullName: true,
              role: true,
              telefono: true,
              email: true,
            },
          },
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_ENCARGADO',
        'Lote',
        loteId,
        datosAntes,
        loteActualizado,
      );

      return {
        success: true,
        message: 'Encargado asignado correctamente al lote',
        data: loteActualizado,
      };
    });
  }
}
