// src/promocion/dto/update-promocion.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePromocionDto } from './create-promocion.dto';

export class UpdatePromocionDto extends PartialType(CreatePromocionDto) {}
