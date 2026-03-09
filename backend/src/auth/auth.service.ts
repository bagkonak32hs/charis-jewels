import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return user;
  }

  async login(email: string, password: string, twoFactorCode?: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı.');

    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        throw new UnauthorizedException('İki faktör doğrulama kodu gerekli.');
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret || '',
        encoding: 'base32',
        token: twoFactorCode,
      });
      if (!verified) throw new UnauthorizedException('İki faktör kodu hatalı.');
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async bootstrapAdmin(email: string, password: string, fullName: string) {
    const existingAdmins = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (existingAdmins > 0) {
      throw new BadRequestException('Admin zaten mevcut.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        customer: {
          create: { fullName },
        },
      },
    });
    return { id: user.id, email: user.email };
  }

  async setupTwoFactor(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'ISIS Admin' });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });
    return { otpauthUrl: secret.otpauth_url, base32: secret.base32 };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA kurulumu bulunamadı.');
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });
    if (!verified) {
      throw new BadRequestException('Kod doğrulanamadı.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });
    return { enabled: true };
  }
}
