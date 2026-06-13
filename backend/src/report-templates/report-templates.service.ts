import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.reportTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(templateId: string) {
    const t = await this.prisma.reportTemplate.findUnique({ where: { templateId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(data: { name: string; agentId?: string; fields?: any[] }) {
    return this.prisma.reportTemplate.create({
      data: {
        name: data.name,
        agentId: data.agentId || null,
        fields: data.fields || [],
      },
    });
  }

  async update(templateId: string, data: { name?: string; agentId?: string; fields?: any[] }) {
    await this.findOne(templateId);
    return this.prisma.reportTemplate.update({
      where: { templateId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.agentId !== undefined && { agentId: data.agentId || null }),
        ...(data.fields !== undefined && { fields: data.fields }),
      },
    });
  }

  async remove(templateId: string) {
    await this.findOne(templateId);
    await this.prisma.reportTemplate.delete({ where: { templateId } });
    return { success: true };
  }
}
