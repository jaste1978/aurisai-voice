import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

// Admin-only management of API keys (issue / list / revoke).
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private apiKeys: ApiKeysService) {}

  private assertAdmin(user: any) {
    if (user?.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  @Post()
  async create(@Request() req: ExpressRequest & { user: any }, @Body() body: any) {
    this.assertAdmin(req.user);
    const result = await this.apiKeys.create({
      userId: body.userId ? Number(body.userId) : undefined,
      name: body.name,
      email: body.email,
      createdBy: req.user.id,
    });
    // `key` is the raw secret — returned exactly once.
    return { success: true, key: result.key, data: result.apiKey };
  }

  @Get()
  async list(@Request() req: ExpressRequest & { user: any }) {
    this.assertAdmin(req.user);
    return { success: true, data: await this.apiKeys.list() };
  }

  @Delete(':id')
  async revoke(@Request() req: ExpressRequest & { user: any }, @Param('id', ParseIntPipe) id: number) {
    this.assertAdmin(req.user);
    return this.apiKeys.revoke(id);
  }
}
