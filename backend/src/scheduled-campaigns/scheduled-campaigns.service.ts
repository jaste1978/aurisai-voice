import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/** Convert "HH:MM" IST string + a base date into a UTC Date for the next occurrence */
function nextRunUtc(
  scheduledTime: string,
  recurrence: string,
  daysOfWeek: number[],
  dayOfMonth: number | null,
  from: Date = new Date(),
): Date {
  const [h, m] = scheduledTime.split(':').map(Number);

  // Current IST time
  const nowIst = new Date(from.getTime() + IST_OFFSET_MS);
  const candidate = new Date(nowIst);
  candidate.setUTCHours(h, m, 0, 0);

  // If this candidate is in the past (in IST) advance by one period
  if (candidate <= nowIst) {
    advance(candidate, recurrence, daysOfWeek, dayOfMonth);
  } else {
    // For weekly/monthly still need to pick the right day
    alignDay(candidate, nowIst, recurrence, daysOfWeek, dayOfMonth);
  }

  // Convert back to UTC
  return new Date(candidate.getTime() - IST_OFFSET_MS);
}

function alignDay(candidate: Date, nowIst: Date, recurrence: string, daysOfWeek: number[], dayOfMonth: number | null) {
  if (recurrence === 'weekly' && daysOfWeek.length) {
    const currentDay = candidate.getUTCDay();
    // find soonest day >= currentDay (or wrap)
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    let targetDay = sortedDays.find(d => d > currentDay) ?? sortedDays[0];
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    candidate.setUTCDate(candidate.getUTCDate() + diff);
  } else if (recurrence === 'monthly' && dayOfMonth) {
    if (candidate.getUTCDate() !== dayOfMonth) {
      candidate.setUTCDate(dayOfMonth);
      if (candidate <= nowIst) {
        candidate.setUTCMonth(candidate.getUTCMonth() + 1);
        candidate.setUTCDate(dayOfMonth);
      }
    }
  }
}

function advance(candidate: Date, recurrence: string, daysOfWeek: number[], dayOfMonth: number | null) {
  switch (recurrence) {
    case 'once':
      // already past — no next run
      break;
    case 'daily':
      candidate.setUTCDate(candidate.getUTCDate() + 1);
      break;
    case 'weekly': {
      if (!daysOfWeek.length) { candidate.setUTCDate(candidate.getUTCDate() + 7); break; }
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = candidate.getUTCDay();
      let targetDay = sortedDays.find(d => d > currentDay) ?? sortedDays[0];
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      candidate.setUTCDate(candidate.getUTCDate() + diff);
      break;
    }
    case 'monthly':
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
      if (dayOfMonth) candidate.setUTCDate(dayOfMonth);
      break;
  }
}

@Injectable()
export class ScheduledCampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.scheduledCampaign.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(this.serialize);
  }

  async findOne(campaignId: string) {
    const row = await this.prisma.scheduledCampaign.findUnique({ where: { campaignId } });
    if (!row) throw new NotFoundException('Scheduled campaign not found');
    return this.serialize(row);
  }

  async create(body: any) {
    const nextRunAt = nextRunUtc(
      body.scheduledTime,
      body.recurrence ?? 'once',
      body.daysOfWeek ?? [],
      body.dayOfMonth ?? null,
      body.startDate ? new Date(body.startDate) : new Date(),
    );

    const row = await this.prisma.scheduledCampaign.create({
      data: {
        name: body.name,
        agentId: body.agentId,
        agentName: body.agentName ?? null,
        fromPhoneNumber: body.fromPhoneNumber ?? null,
        contacts: body.contacts ?? [],
        recurrence: body.recurrence ?? 'once',
        scheduledTime: body.scheduledTime,
        daysOfWeek: body.daysOfWeek ?? [],
        dayOfMonth: body.dayOfMonth ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        nextRunAt,
        active: true,
      },
    });
    return this.serialize(row);
  }

  async update(campaignId: string, body: any) {
    const existing = await this.prisma.scheduledCampaign.findUnique({ where: { campaignId } });
    if (!existing) throw new NotFoundException('Scheduled campaign not found');

    const scheduledTime = body.scheduledTime ?? existing.scheduledTime;
    const recurrence = body.recurrence ?? existing.recurrence;
    const daysOfWeek = body.daysOfWeek ?? (existing.daysOfWeek as number[]);
    const dayOfMonth = body.dayOfMonth ?? existing.dayOfMonth;

    const nextRunAt = nextRunUtc(scheduledTime, recurrence, daysOfWeek, dayOfMonth);

    const row = await this.prisma.scheduledCampaign.update({
      where: { campaignId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.agentId !== undefined && { agentId: body.agentId }),
        ...(body.agentName !== undefined && { agentName: body.agentName }),
        ...(body.fromPhoneNumber !== undefined && { fromPhoneNumber: body.fromPhoneNumber }),
        ...(body.contacts !== undefined && { contacts: body.contacts }),
        ...(body.recurrence !== undefined && { recurrence: body.recurrence }),
        ...(body.scheduledTime !== undefined && { scheduledTime: body.scheduledTime }),
        ...(body.daysOfWeek !== undefined && { daysOfWeek: body.daysOfWeek }),
        ...(body.dayOfMonth !== undefined && { dayOfMonth: body.dayOfMonth }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.active !== undefined && { active: body.active }),
        nextRunAt,
      },
    });
    return this.serialize(row);
  }

  async remove(campaignId: string) {
    const existing = await this.prisma.scheduledCampaign.findUnique({ where: { campaignId } });
    if (!existing) throw new NotFoundException('Scheduled campaign not found');
    await this.prisma.scheduledCampaign.delete({ where: { campaignId } });
    return { deleted: true };
  }

  /** Called by the cron runner after a successful batch launch */
  async markRan(id: number, recurrence: string, scheduledTime: string, daysOfWeek: number[], dayOfMonth: number | null, endDate: Date | null) {
    const lastRunAt = new Date();
    let nextRunAt: Date | null = null;

    if (recurrence !== 'once') {
      nextRunAt = nextRunUtc(scheduledTime, recurrence, daysOfWeek, dayOfMonth);
      // Deactivate if we've passed the endDate
      if (endDate && nextRunAt > endDate) nextRunAt = null;
    }

    await this.prisma.scheduledCampaign.update({
      where: { id },
      data: {
        lastRunAt,
        nextRunAt: nextRunAt ?? undefined,
        active: nextRunAt !== null,
        runCount: { increment: 1 },
      },
    });
  }

  serialize(c: any) {
    return {
      id: c.id,
      campaignId: c.campaignId,
      name: c.name,
      agentId: c.agentId,
      agentName: c.agentName,
      fromPhoneNumber: c.fromPhoneNumber,
      contacts: c.contacts,
      recurrence: c.recurrence,
      scheduledTime: c.scheduledTime,
      daysOfWeek: c.daysOfWeek,
      dayOfMonth: c.dayOfMonth,
      startDate: c.startDate,
      endDate: c.endDate,
      nextRunAt: c.nextRunAt,
      lastRunAt: c.lastRunAt,
      runCount: c.runCount,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
