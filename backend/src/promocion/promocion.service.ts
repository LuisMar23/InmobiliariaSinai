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
    columnaAfectada?: string,
  ) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || undefined,
        accion,
        tablaAfectada,
        columnaAfectada,
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

  async create(createPromocionDto: CreatePromocionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const fechaInicio = new Date(createPromocionDto.fechaInicio);
      const fechaFin = new Date(createPromocionDto.fechaFin);

      // Validar fechas
      this.validarFechasPromocion(fechaInicio, fechaFin);

      const promocion = await prisma.promocion.create({
        data: {
          titulo: createPromocionDto.titulo,
          descripcion: createPromocionDto.descripcion,
          descuento: createPromocionDto.descuento,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          aplicaA: createPromocionDto.aplicaA,
        },
      });

      // Auditoría
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
      });

      if (!promocionExistente) {
        throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
      }

      const datosAntes = { ...promocionExistente };

      // Preparar datos para actualización
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

      // Validar fechas si se están actualizando
      if (updatePromocionDto.fechaInicio || updatePromocionDto.fechaFin) {
        this.validarFechasPromocion(fechaInicio, fechaFin);
      }

      if (updatePromocionDto.aplicaA !== undefined) {
        dataToUpdate.aplicaA = updatePromocionDto.aplicaA;
      }

      const promocionActualizada = await prisma.promocion.update({
        where: { id },
        data: dataToUpdate,
      });

      // Auditoría
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

      await prisma.promocion.delete({
        where: { id },
      });

      // Auditoría
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
}
