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
    const STAGES = ['new', 'contacted', 'demo', 'pilot', 'won', 'lost'];
    const counts = await Promise.all([
      this.prisma.enquiry.count(),
      ...STAGES.map((s) => this.prisma.enquiry.count({ where: { status: s } })),
    ]);
    const out: any = { total: counts[0] };
    STAGES.forEach((s, i) => { out[s] = counts[i + 1]; });
    return out;
  }

  async create(data: any) {
    const name = (data.name || '').trim();
    const company = (data.company || '').trim();
    const email = (data.email || '').trim();
    const message = (data.message || '').trim();
    const source = (data.source || 'website').trim();

    if (source === 'website') {
      // public website form — keep strict validation
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
        throw new BadRequestException('Name, a valid email, and a message are required.');
      }
    } else {
      // manually added lead (CRM) — only need a name or company; rest optional
      if (!name && !company) {
        throw new BadRequestException('Please enter at least a name or company.');
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('That email looks invalid.');
      }
    }

    const e = await this.prisma.enquiry.create({
      data: {
        name: name || company,            // never empty
        company: company || null,
        email: email || '',               // column is NOT NULL
        phone: (data.phone || '').trim() || null,
        interest: (data.interest || '').trim() || null,
        message: message || '',           // column is NOT NULL
        source,
        status: (data.status || 'new').trim(),
        notes: (data.notes || '').trim() || null,
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
