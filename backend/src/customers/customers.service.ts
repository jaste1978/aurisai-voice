import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const customers = await this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    return customers.map(this.serialize);
  }

  async findOne(id: number) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    return this.serialize(c);
  }

  async create(data: any) {
    const c = await this.prisma.customer.create({
      data: {
        name: data.name,
        phoneNumber: data.phone_number || data.phoneNumber,
        email: data.email || null,
        language: data.language || 'en',
        notes: data.notes || null,
        status: 'active',
      },
    });
    return { success: true, data: this.serialize(c) };
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');
    const c = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone_number && { phoneNumber: data.phone_number }),
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.language && { language: data.language }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      },
    });
    return { success: true, data: this.serialize(c) };
  }

  async delete(id: number) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');
    await this.prisma.customer.delete({ where: { id } });
    return { success: true, message: 'Customer deleted' };
  }

  serialize(c: any) {
    return {
      id: c.id,
      customer_id: c.customerId,
      name: c.name,
      phone_number: c.phoneNumber,
      email: c.email,
      language: c.language,
      notes: c.notes,
      status: c.status,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }
}
