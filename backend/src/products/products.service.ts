import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateProductDto) {
    const images = dto.images ?? [];
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice,
        campaignText: dto.campaignText,
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        categoryId: dto.categoryId,
        images: {
          create: images.map((url, index) => ({
            url,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const images = dto.images;
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice,
        campaignText: dto.campaignText,
        stock: dto.stock,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        categoryId: dto.categoryId,
        images: images
          ? {
              deleteMany: {},
              create: images.map((url, index) => ({
                url,
                sortOrder: index,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
