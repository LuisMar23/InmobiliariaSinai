import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  UploadedFiles,
} from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { UpdateArchivoDto } from './dto/update-archivo.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Determinar carpeta dinámica según el body
          const { ventaId, reservaId, loteId, urbanizacionId } = req.body;
          let folder = 'otros';

          if (ventaId) folder = 'ventas';
          else if (reservaId) folder = 'reservas';
          else if (loteId) folder = 'lotes';
          else if (urbanizacionId) folder = 'urbanizaciones';

          const uploadPath = `./uploads/${folder}`;

          // Crear carpeta si no existe
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadArchivos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateArchivoDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    // Determinar la carpeta nuevamente (para guardar la URL correcta)
    let folder = 'otros';
    if (dto.ventaId) folder = 'ventas';
    else if (dto.reservaId) folder = 'reservas';
    else if (dto.loteId) folder = 'lotes';
    else if (dto.urbanizacionId) folder = 'urbanizaciones';

    if (files.length === 1) {
      const file = files[0];
      return this.archivosService.create({
        ...dto,
        urlArchivo: `/uploads/${folder}/${file.filename}`,
        tipoArchivo: file.mimetype,
        nombreArchivo: file.originalname,
      });
    } else {
      return this.archivosService.createMultiple(dto, files, folder);
    }
  }

@Post('update')
@UseInterceptors(
  FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const { ventaId, reservaId, loteId, urbanizacionId } = req.body;
        let folder = 'otros';

        if (ventaId) folder = 'ventas';
        else if (reservaId) folder = 'reservas';
        else if (loteId) folder = 'lotes';
        else if (urbanizacionId) folder = 'urbanizaciones';

        const uploadPath = `./uploads/${folder}`;
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
  }),
)
async updateArchivos(
  @UploadedFiles() files: Express.Multer.File[],
  @Body() dto: CreateArchivoDto,
) {
  if (!files || files.length === 0) {
    throw new BadRequestException('No se recibieron archivos');
  }

  let folder = 'otros';
  const where: any = {};
  if (dto.ventaId) (folder = 'ventas'), (where.ventaId = Number(dto.ventaId));
  else if (dto.reservaId)
    (folder = 'reservas'), (where.reservaId = Number(dto.reservaId));
  else if (dto.loteId) (folder = 'lotes'), (where.loteId = Number(dto.loteId));
  else if (dto.urbanizacionId)
    (folder = 'urbanizaciones'),
      (where.urbanizacionId = Number(dto.urbanizacionId));
  else {
    throw new BadRequestException(
      'Debe especificar ventaId, reservaId, loteId o urbanizacionId',
    );
  }
  const prisma = this.archivosService.prisma;

  const existentes = await prisma.archivo.findMany({ where });

  for (const archivo of existentes) {
    const filePath = join(process.cwd(), archivo.urlArchivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.archivo.deleteMany({ where });

  if (files.length === 1) {
    const file = files[0];
    return this.archivosService.create({
      ...dto,
      urlArchivo: `/uploads/${folder}/${file.filename}`,
      tipoArchivo: file.mimetype,
      nombreArchivo: file.originalname,
    });
  } else {
    const nuevos = await Promise.all(
      files.map((file) =>
        this.archivosService.create({
          ...dto,
          urlArchivo: `/uploads/${folder}/${file.filename}`,
          tipoArchivo: file.mimetype,
          nombreArchivo: file.originalname,
        }),
      ),
    );
    return nuevos;
  }
}

  @Get()
  findAll() {
    return this.archivosService.findAll();
  }

  @Get('venta/:id')
  findByVenta(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByVenta(id);
  }
}
