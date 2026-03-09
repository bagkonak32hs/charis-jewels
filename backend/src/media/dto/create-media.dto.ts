import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MediaType, DeviceTarget } from '../../../generated/prisma/enums.js';

export class CreateMediaDto {
  @IsString()
  url: string;

  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;

  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsEnum(DeviceTarget)
  device?: DeviceTarget;
}
