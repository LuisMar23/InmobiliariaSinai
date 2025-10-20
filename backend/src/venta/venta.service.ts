import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import {
  CreateVentaDto,
  EstadoVenta,
  TipoInmueble,
  UserRole,
} from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';

@Injectable()
export class VentasService {
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

  async create(createVentaDto: CreateVentaDto) {
    return this.prisma.$transaction(async (prisma) => {
      // Verificar que cliente existe y tiene rol CLIENTE
      const cliente = await prisma.user.findUnique({
        where: {
          id: createVentaDto.clienteId,
          isActive: true,
        },
      });

      if (!cliente) {
        throw new BadRequestException('Cliente no encontrado');
      }
      if (cliente.role !== UserRole.CLIENTE) {
        throw new BadRequestException(
          'El usuario especificado no tiene rol de CLIENTE',
        );
      }

      // Verificar que asesor existe y tiene rol ASESOR
      const asesor = await prisma.user.findUnique({
        where: {
          id: createVentaDto.asesorId,
          isActive: true,
        },
      });

      if (!asesor) {
        throw new BadRequestException('Asesor no encontrado');
      }
      if (asesor.role !== UserRole.ASESOR) {
        throw new BadRequestException(
          'El usuario especificado no tiene rol de ASESOR',
        );
      }

      // Verificar que el inmueble existe y está disponible
      let inmueble;
      if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
        inmueble = await prisma.lote.findUnique({
          where: { id: createVentaDto.inmuebleId },
        });
        if (!inmueble) {
          throw new BadRequestException('Lote no encontrado');
        }
        if (inmueble.estado !== 'DISPONIBLE') {
          throw new BadRequestException(
            'El lote no está disponible para venta',
          );
        }
      }

      const venta = await prisma.venta.create({
        data: {
          clienteId: createVentaDto.clienteId,
          asesorId: createVentaDto.asesorId,
          inmuebleTipo: createVentaDto.inmuebleTipo,
          inmuebleId: createVentaDto.inmuebleId,
          precioFinal: createVentaDto.precioFinal,
          estado: createVentaDto.estado || EstadoVenta.PENDIENTE_PAGO,
        },
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              email: true,
              telefono: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          lote:
            createVentaDto.inmuebleTipo === TipoInmueble.LOTE
              ? {
                  include: {
                    urbanizacion: {
                      select: {
                        id: true,
                        nombre: true,
                        ubicacion: true,
                      },
                    },
                  },
                }
              : false,
        },
      });

      // Actualizar estado del inmueble
      if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: createVentaDto.inmuebleId },
          data: { estado: 'VENDIDO' },
        });
      }

      await this.crearAuditoria(
        createVentaDto.usuarioId,
        'CREAR',
        'Venta',
        venta.id,
        null,
        venta,
      );

      return {
        success: true,
        message: 'Venta creada correctamente',
        data: venta,
      };
    });
  }

  async findAll(clienteId?: number, asesorId?: number) {
    const where: any = {};
    if (clienteId) where.clienteId = clienteId;
    if (asesorId) where.asesorId = asesorId;

    const ventas = await this.prisma.venta.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lote: {
          include: {
            urbanizacion: {
              select: {
                id: true,
                nombre: true,
                ubicacion: true,
              },
            },
          },
        },
        pagos: {
          select: {
            id: true,
            monto: true,
            metodo: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            pagos: true,
            documentos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: ventas,
    };
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            fullName: true,
            email: true,
            telefono: true,
            ci: true,
            role: true,
          },
        },
        asesor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lote: {
          include: {
            urbanizacion: {
              select: {
                id: true,
                nombre: true,
                ubicacion: true,
                descripcion: true,
              },
            },
          },
        },
        pagos: {
          include: {
            usuario: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        documentos: {
          include: {
            usuario: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        planFinanciamiento: {
          include: {
            cuotas: {
              orderBy: {
                numeroCuota: 'asc',
              },
            },
          },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: venta,
    };
  }

  async update(id: number, updateVentaDto: UpdateVentaDto) {
    return this.prisma.$transaction(async (prisma) => {
      const ventaExistente = await prisma.venta.findUnique({
        where: { id },
      });

      if (!ventaExistente) {
        throw new NotFoundException(`Venta con ID ${id} no encontrada`);
      }

      const datosAntes = { ...ventaExistente };

      // Verificar relaciones si se están actualizando
      if (updateVentaDto.clienteId) {
        const cliente = await prisma.user.findUnique({
          where: {
            id: updateVentaDto.clienteId,
            isActive: true,
          },
        });
        if (!cliente) {
          throw new BadRequestException('Cliente no encontrado');
        }
        if (cliente.role !== UserRole.CLIENTE) {
          throw new BadRequestException(
            'El usuario especificado no tiene rol de CLIENTE',
          );
        }
      }

      if (updateVentaDto.asesorId) {
        const asesor = await prisma.user.findUnique({
          where: {
            id: updateVentaDto.asesorId,
            isActive: true,
          },
        });
        if (!asesor) {
          throw new BadRequestException('Asesor no encontrado');
        }
        if (asesor.role !== UserRole.ASESOR) {
          throw new BadRequestException(
            'El usuario especificado no tiene rol de ASESOR',
          );
        }
      }

      const ventaActualizada = await prisma.venta.update({
        where: { id },
        data: updateVentaDto,
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        updateVentaDto.usuarioId,
        'ACTUALIZAR',
        'Venta',
        id,
        datosAntes,
        ventaActualizada,
      );

      return {
        success: true,
        message: 'Venta actualizada correctamente',
        data: ventaActualizada,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const venta = await prisma.venta.findUnique({
        where: { id },
        include: {
          pagos: true,
          documentos: true,
          planFinanciamiento: true,
        },
      });

      if (!venta) {
        throw new NotFoundException(`Venta con ID ${id} no encontrada`);
      }

      // Verificar si tiene relaciones
      if (
        venta.pagos.length > 0 ||
        venta.documentos.length > 0 ||
        venta.planFinanciamiento
      ) {
        throw new BadRequestException(
          'No se puede eliminar la venta porque tiene relaciones activas',
        );
      }

      const datosAntes = { ...venta };

      await prisma.venta.delete({
        where: { id },
      });

      // Restaurar estado del inmueble
      if (venta.inmuebleTipo === TipoInmueble.LOTE) {
        await prisma.lote.update({
          where: { id: venta.inmuebleId },
          data: { estado: 'DISPONIBLE' },
        });
      }

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Venta',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Venta eliminada correctamente',
      };
    });
  }
}
