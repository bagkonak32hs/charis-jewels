import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMediaDto } from './dto/create-media.dto.js';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateMediaDto) {
    return this.prisma.mediaAsset.create({ data: dto });
  }

  remove(id: string) {
    return this.prisma.mediaAsset.delete({ where: { id } });
  }
}
