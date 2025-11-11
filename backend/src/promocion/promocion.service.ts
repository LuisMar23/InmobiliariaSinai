// src/promocion/promocion.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@Injectable()
export class PromocionService {
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

  private validarFechasPromocion(fechaInicio: Date, fechaFin: Date): void {
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }
  }

  private async aplicarPromocionALotesIndividuales(
    promocionId: number,
    descuento: number,
    lotesIds: number[],
  ) {
    if (!lotesIds || lotesIds.length === 0) {
      return;
    }

    const lotesExistentes = await this.prisma.lote.findMany({
      where: {
        id: { in: lotesIds },
        estado: 'DISPONIBLE',
      },
    });

    if (lotesExistentes.length !== lotesIds.length) {
      throw new BadRequestException(
        'Uno o más lotes no existen o no están disponibles',
      );
    }

    for (const lote of lotesExistentes) {
      const precioConDescuento =
        Number(lote.precioBase) * (1 - descuento / 100);

      await this.prisma.lotePromocion.upsert({
        where: {
          loteId_promocionId: {
            loteId: lote.id,
            promocionId: promocionId,
          },
        },
        update: {
          precioConDescuento,
        },
        create: {
          loteId: lote.id,
          promocionId: promocionId,
          precioOriginal: lote.precioBase,
          precioConDescuento,
        },
      });
    }
  }

  private async aplicarPromocionAUrbanizacion(
    promocionId: number,
    descuento: number,
    urbanizacionId: number,
  ) {
    const urbanizacion = await this.prisma.urbanizacion.findUnique({
      where: { id: urbanizacionId },
      include: {
        lotes: {
          where: { estado: 'DISPONIBLE' },
        },
      },
    });

    if (!urbanizacion) {
      throw new BadRequestException('Urbanización no encontrada');
    }

    for (const lote of urbanizacion.lotes) {
      const precioConDescuento =
        Number(lote.precioBase) * (1 - descuento / 100);

      await this.prisma.lotePromocion.upsert({
        where: {
          loteId_promocionId: {
            loteId: lote.id,
            promocionId: promocionId,
          },
        },
        update: {
          precioConDescuento,
        },
        create: {
          loteId: lote.id,
          promocionId: promocionId,
          precioOriginal: lote.precioBase,
          precioConDescuento,
        },
      });
    }
  }

  private async aplicarPromocionATodosLotes(
    promocionId: number,
    descuento: number,
  ) {
    const todosLotes = await this.prisma.lote.findMany({
      where: { estado: 'DISPONIBLE' },
    });

    for (const lote of todosLotes) {
      const precioConDescuento =
        Number(lote.precioBase) * (1 - descuento / 100);

      await this.prisma.lotePromocion.upsert({
        where: {
          loteId_promocionId: {
            loteId: lote.id,
            promocionId: promocionId,
          },
        },
        update: {
          precioConDescuento,
        },
        create: {
          loteId: lote.id,
          promocionId: promocionId,
          precioOriginal: lote.precioBase,
          precioConDescuento,
        },
      });
    }
  }

  private async removerPromocionDeLotes(promocionId: number) {
    await this.prisma.lotePromocion.deleteMany({
      where: { promocionId },
    });
  }

  async create(createPromocionDto: CreatePromocionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const fechaInicio = new Date(createPromocionDto.fechaInicio);
      const fechaFin = new Date(createPromocionDto.fechaFin);

      this.validarFechasPromocion(fechaInicio, fechaFin);

      const promocion = await prisma.promocion.create({
        data: {
          titulo: createPromocionDto.titulo,
          descripcion: createPromocionDto.descripcion,
          descuento: createPromocionDto.descuento,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          urbanizacionId: createPromocionDto.urbanizacionId,
        },
      });

      // Aplicar promoción según los parámetros proporcionados
      if (
        createPromocionDto.lotesIds &&
        createPromocionDto.lotesIds.length > 0
      ) {
        await this.aplicarPromocionALotesIndividuales(
          promocion.id,
          createPromocionDto.descuento,
          createPromocionDto.lotesIds,
        );
      } else if (createPromocionDto.urbanizacionId) {
        await this.aplicarPromocionAUrbanizacion(
          promocion.id,
          createPromocionDto.descuento,
          createPromocionDto.urbanizacionId,
        );
      }
      // Si no se especifica nada, la promoción se crea sin lotes asignados

      await this.crearAuditoria(
        createPromocionDto.usuarioId,
        'CREAR',
        'Promocion',
        promocion.id,
        null,
        promocion,
      );

      return {
        success: true,
        message: 'Promoción creada correctamente',
        data: promocion,
      };
    });
  }

  async findAll() {
    const promociones = await this.prisma.promocion.findMany({
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
          },
        },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            lotesAfectados: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: promociones,
    };
  }

  async findOne(id: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
          },
        },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!promocion) {
      throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: promocion,
    };
  }

  async update(id: number, updatePromocionDto: UpdatePromocionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const promocionExistente = await prisma.promocion.findUnique({
        where: { id },
        include: {
          lotesAfectados: true,
        },
      });

      if (!promocionExistente) {
        throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
      }

      const datosAntes = { ...promocionExistente };

      const dataToUpdate: any = {};

      if (updatePromocionDto.titulo !== undefined) {
        dataToUpdate.titulo = updatePromocionDto.titulo;
      }

      if (updatePromocionDto.descripcion !== undefined) {
        dataToUpdate.descripcion = updatePromocionDto.descripcion;
      }

      if (updatePromocionDto.descuento !== undefined) {
        dataToUpdate.descuento = updatePromocionDto.descuento;
      }

      let fechaInicio = promocionExistente.fechaInicio;
      let fechaFin = promocionExistente.fechaFin;

      if (updatePromocionDto.fechaInicio) {
        fechaInicio = new Date(updatePromocionDto.fechaInicio);
        dataToUpdate.fechaInicio = fechaInicio;
      }

      if (updatePromocionDto.fechaFin) {
        fechaFin = new Date(updatePromocionDto.fechaFin);
        dataToUpdate.fechaFin = fechaFin;
      }

      if (updatePromocionDto.fechaInicio || updatePromocionDto.fechaFin) {
        this.validarFechasPromocion(fechaInicio, fechaFin);
      }

      if (updatePromocionDto.urbanizacionId !== undefined) {
        dataToUpdate.urbanizacionId = updatePromocionDto.urbanizacionId;
      }

      const promocionActualizada = await prisma.promocion.update({
        where: { id },
        data: dataToUpdate,
      });

      // Re-aplicar promoción si cambió el descuento o los lotes/urbanización
      const necesitaReaplicar =
        updatePromocionDto.descuento !== undefined ||
        updatePromocionDto.lotesIds !== undefined ||
        updatePromocionDto.urbanizacionId !== undefined;

      if (necesitaReaplicar) {
        await this.removerPromocionDeLotes(id);

        const descuento =
          updatePromocionDto.descuento !== undefined
            ? updatePromocionDto.descuento
            : Number(promocionExistente.descuento);

        // Aplicar según los nuevos parámetros
        if (
          updatePromocionDto.lotesIds &&
          updatePromocionDto.lotesIds.length > 0
        ) {
          await this.aplicarPromocionALotesIndividuales(
            id,
            descuento,
            updatePromocionDto.lotesIds,
          );
        } else if (updatePromocionDto.urbanizacionId !== undefined) {
          await this.aplicarPromocionAUrbanizacion(
            id,
            descuento,
            updatePromocionDto.urbanizacionId,
          );
        } else if (promocionExistente.urbanizacionId) {
          // Mantener la urbanización existente si no se cambió
          await this.aplicarPromocionAUrbanizacion(
            id,
            descuento,
            promocionExistente.urbanizacionId,
          );
        } else if (promocionExistente.lotesAfectados.length > 0) {
          // Mantener los lotes individuales existentes si no se cambió
          const lotesIdsExistentes = promocionExistente.lotesAfectados.map(
            (lp) => lp.loteId,
          );
          await this.aplicarPromocionALotesIndividuales(
            id,
            descuento,
            lotesIdsExistentes,
          );
        }
      }

      await this.crearAuditoria(
        updatePromocionDto.usuarioId,
        'ACTUALIZAR',
        'Promocion',
        id,
        datosAntes,
        promocionActualizada,
      );

      return {
        success: true,
        message: 'Promoción actualizada correctamente',
        data: promocionActualizada,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id },
      });

      if (!promocion) {
        throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
      }

      const datosAntes = { ...promocion };

      await this.removerPromocionDeLotes(id);

      await prisma.promocion.delete({
        where: { id },
      });

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Promocion',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Promoción eliminada correctamente',
      };
    });
  }

  async getLotesDisponibles() {
    const lotes = await this.prisma.lote.findMany({
      where: { estado: 'DISPONIBLE' },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
          },
        },
        LotePromocion: {
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaFin: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: lotes,
    };
  }

  // Nuevos métodos para asignar/remover lotes individualmente
  async asignarLotesAPromocion(
    promocionId: number,
    lotesIds: number[],
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      // Verificar que los lotes existen y están disponibles
      const lotesExistentes = await prisma.lote.findMany({
        where: {
          id: { in: lotesIds },
          estado: 'DISPONIBLE',
        },
      });

      if (lotesExistentes.length !== lotesIds.length) {
        throw new BadRequestException(
          'Uno o más lotes no existen o no están disponibles',
        );
      }

      // Aplicar promoción a los lotes seleccionados
      for (const lote of lotesExistentes) {
        const precioConDescuento =
          Number(lote.precioBase) * (1 - Number(promocion.descuento) / 100);

        await prisma.lotePromocion.upsert({
          where: {
            loteId_promocionId: {
              loteId: lote.id,
              promocionId: promocionId,
            },
          },
          update: {
            precioConDescuento,
          },
          create: {
            loteId: lote.id,
            promocionId: promocionId,
            precioOriginal: lote.precioBase,
            precioConDescuento,
          },
        });
      }

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId, lotesIds },
      );

      return {
        success: true,
        message: `Promoción asignada a ${lotesExistentes.length} lotes correctamente`,
        data: {
          promocionId,
          lotesAsignados: lotesExistentes.length,
        },
      };
    });
  }

  async removerLotesDePromocion(
    promocionId: number,
    lotesIds: number[],
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      await prisma.lotePromocion.deleteMany({
        where: {
          promocionId: promocionId,
          loteId: { in: lotesIds },
        },
      });

      await this.crearAuditoria(
        usuarioId,
        'REMOVER_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId, lotesIds },
      );

      return {
        success: true,
        message: `Lotes removidos de la promoción correctamente`,
        data: {
          promocionId,
          lotesRemovidos: lotesIds.length,
        },
      };
    });
  }

  async asignarUrbanizacionAPromocion(
    promocionId: number,
    urbanizacionId: number,
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      const urbanizacion = await prisma.urbanizacion.findUnique({
        where: { id: urbanizacionId },
      });

      if (!urbanizacion) {
        throw new BadRequestException('Urbanización no encontrada');
      }

      // Actualizar la promoción con la urbanización
      await prisma.promocion.update({
        where: { id: promocionId },
        data: { urbanizacionId },
      });

      // Aplicar promoción a todos los lotes de la urbanización
      await this.aplicarPromocionAUrbanizacion(
        promocionId,
        Number(promocion.descuento),
        urbanizacionId,
      );

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_URBANIZACION_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId, urbanizacionId },
      );

      return {
        success: true,
        message: 'Urbanización asignada a la promoción correctamente',
        data: {
          promocionId,
          urbanizacionId,
        },
      };
    });
  }

  async asignarTodosLotesAPromocion(promocionId: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      // Limpiar cualquier urbanización asignada
      await prisma.promocion.update({
        where: { id: promocionId },
        data: { urbanizacionId: null },
      });

      // Aplicar promoción a todos los lotes
      await this.aplicarPromocionATodosLotes(
        promocionId,
        Number(promocion.descuento),
      );

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_TODOS_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId },
      );

      return {
        success: true,
        message: 'Promoción aplicada a todos los lotes disponibles',
        data: {
          promocionId,
        },
      };
    });
  }

  async verificarPromocionesExpiradas() {
    const ahora = new Date();

    const promocionesExpiradas = await this.prisma.promocion.findMany({
      where: {
        fechaFin: { lt: ahora },
        isActive: true,
      },
    });

    for (const promocion of promocionesExpiradas) {
      await this.prisma.$transaction(async (prisma) => {
        // Desactivar la promoción
        await prisma.promocion.update({
          where: { id: promocion.id },
          data: { isActive: false },
        });

        // Eliminar las relaciones de promoción con lotes
        await prisma.lotePromocion.deleteMany({
          where: { promocionId: promocion.id },
        });

        console.log(`Promoción ${promocion.titulo} expirada y desactivada`);
      });
    }

    return {
      success: true,
      message: `Se procesaron ${promocionesExpiradas.length} promociones expiradas`,
      data: promocionesExpiradas,
    };
  }

  async getPromocionesActivas() {
    const ahora = new Date();

    const promocionesActivas = await this.prisma.promocion.findMany({
      where: {
        isActive: true,
        fechaInicio: { lte: ahora },
        fechaFin: { gte: ahora },
      },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
          },
        },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            lotesAfectados: true,
          },
        },
      },
      orderBy: {
        fechaFin: 'asc',
      },
    });

    return {
      success: true,
      data: promocionesActivas,
    };
  }
}
