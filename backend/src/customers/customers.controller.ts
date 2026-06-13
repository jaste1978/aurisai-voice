import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  async findAll() {
    const data = await this.customersService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.customersService.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: any) {
    return this.customersService.create(body);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.delete(id);
  }
}
