import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.twoFactorCode);
  }

  @Post('bootstrap')
  async bootstrap(@Body() dto: RegisterDto) {
    return this.authService.bootstrapAdmin(dto.email, dto.password, dto.fullName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async setupTwoFactor(@Req() req: any) {
    return this.authService.setupTwoFactor(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enableTwoFactor(@Req() req: any, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.enableTwoFactor(req.user.id, dto.code);
  }
}
