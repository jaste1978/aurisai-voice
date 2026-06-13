import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data');

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService, private bolna: BolnaService) {}

  async findAll() {
    const batches = await this.prisma.batch.findMany({ orderBy: { createdAt: 'desc' } });
    return batches.map(this.serialize);
  }

  async getStatus(id: number) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (!batch.bolnaBatchId) return { success: true, data: this.serialize(batch) };
    try {
      const res = await this.bolna.getBatch(batch.bolnaBatchId);
      const updated = await this.prisma.batch.update({
        where: { id },
        data: { status: res.status || batch.status, bolnaResponse: res },
      });
      return { success: true, data: this.serialize(updated) };
    } catch {
      return { success: true, data: this.serialize(batch) };
    }
  }

  async getExecutions(id: number) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch || !batch.bolnaBatchId) throw new NotFoundException('Batch not found or no Bolna ID');
    const data = await this.bolna.getBatchExecutions(batch.bolnaBatchId);
    return { success: true, data };
  }

  async stop(id: number) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch || !batch.bolnaBatchId) throw new NotFoundException('Batch not found');
    const res = await this.bolna.stopBatch(batch.bolnaBatchId);
    await this.prisma.batch.update({ where: { id }, data: { status: 'stopped' } });
    return { success: true, data: res };
  }

  async previewCSV(file: Express.Multer.File) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    if (!records.length) throw new BadRequestException('CSV is empty');
    const headers = Object.keys(records[0]);
    if (!headers.includes('contact_number')) throw new BadRequestException('CSV must have a contact_number column');
    fs.unlinkSync(file.path);
    return { success: true, data: { headers, preview: records.slice(0, 5), total: records.length } };
  }

  async create(file: Express.Multer.File, body: any) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    const totalContacts = records.length;

    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), { filename: file.originalname, contentType: 'text/csv' });
    form.append('agent_id', body.agent_id);
    if (body.name) form.append('name', body.name);
    if (body.from_phone_number) form.append('from_phone_number', body.from_phone_number);
    if (body.webhook_url) form.append('webhook_url', body.webhook_url);

    let bolnaRes: any = {};
    try {
      bolnaRes = await this.bolna.createBatch(form, form.getHeaders());
    } catch (err: any) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(err.response?.data?.message || err.message);
    }

    fs.unlinkSync(file.path);

    const batch = await this.prisma.batch.create({
      data: {
        batchId: bolnaRes.batch_id || bolnaRes.id || `batch_${Date.now()}`,
        bolnaBatchId: bolnaRes.batch_id || bolnaRes.id,
        name: body.name || file.originalname,
        agentId: body.agent_id,
        agentName: body.agent_name || null,
        fromPhoneNumber: body.from_phone_number || null,
        totalContacts,
        status: bolnaRes.status || 'created',
        fileName: file.originalname,
        webhookUrl: body.webhook_url || null,
        bolnaResponse: bolnaRes,
      },
    });

    return { success: true, data: this.serialize(batch) };
  }

  serialize(b: any) {
    return {
      id: b.id,
      batch_id: b.batchId,
      bolna_batch_id: b.bolnaBatchId,
      name: b.name,
      agent_id: b.agentId,
      agent_name: b.agentName,
      from_phone_number: b.fromPhoneNumber,
      total_contacts: b.totalContacts,
      status: b.status,
      file_name: b.fileName,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }
}
