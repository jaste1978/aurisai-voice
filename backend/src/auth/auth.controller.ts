import { Controller, Post, Get, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: ExpressRequest & { user: any }) {
    return this.authService.me(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: ExpressRequest & { user: any },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}
