import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnquiriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const enquiries = await this.prisma.enquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return enquiries.map(this.serialize);
  }

  async stats() {
    const [total, neu, contacted, qualified, closed] = await Promise.all([
      this.prisma.enquiry.count(),
      this.prisma.enquiry.count({ where: { status: 'new' } }),
      this.prisma.enquiry.count({ where: { status: 'contacted' } }),
      this.prisma.enquiry.count({ where: { status: 'qualified' } }),
      this.prisma.enquiry.count({ where: { status: 'closed' } }),
    ]);
    return { total, new: neu, contacted, qualified, closed };
  }

  async create(data: any) {
    const name = (data.name || '').trim();
    const email = (data.email || '').trim();
    const message = (data.message || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      throw new BadRequestException('Name, a valid email, and a message are required.');
    }
    const e = await this.prisma.enquiry.create({
      data: {
        name,
        company: (data.company || '').trim() || null,
        email,
        phone: (data.phone || '').trim() || null,
        interest: (data.interest || '').trim() || null,
        message,
        source: (data.source || 'website').trim(),
        status: 'new',
      },
    });
    return { success: true, data: this.serialize(e) };
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Enquiry not found');
    const e = await this.prisma.enquiry.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    return { success: true, data: this.serialize(e) };
  }

  async delete(id: number) {
    const existing = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Enquiry not found');
    await this.prisma.enquiry.delete({ where: { id } });
    return { success: true, message: 'Enquiry deleted' };
  }

  serialize(e: any) {
    return {
      id: e.id,
      enquiry_id: e.enquiryId,
      name: e.name,
      company: e.company,
      email: e.email,
      phone: e.phone,
      interest: e.interest,
      message: e.message,
      source: e.source,
      status: e.status,
      notes: e.notes,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    };
  }
}
