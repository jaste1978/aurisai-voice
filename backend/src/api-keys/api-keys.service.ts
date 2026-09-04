import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Admin-issued API keys. Each key acts as a real user account in our system, so
// every call placed through it is attributed to that account and visible in the
// dashboard / monitoring like any other call.
@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private sha256(v: string) { return crypto.createHash('sha256').update(v).digest('hex'); }

  // Create a key. If `userId` is given, attach to that account; otherwise create
  // a new partner user (name/email) to own the key. Returns the RAW key once.
  async create(opts: { userId?: number; name?: string; email?: string; createdBy?: number }) {
    let userId = opts.userId;
    let account: any;

    if (userId) {
      account = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!account) throw new BadRequestException('Target user not found');
    } else {
      const name = (opts.name || '').trim();
      if (!name) throw new BadRequestException('Provide a partner name (or an existing userId).');
      const email = (opts.email || '').trim().toLowerCase() ||
        `partner+${crypto.randomBytes(4).toString('hex')}@api.aurisaivoice.com`;
      if (await this.prisma.user.findUnique({ where: { email } })) {
        throw new BadRequestException('A user with this email already exists — pass its userId instead.');
      }
      // Partner user: full (non-trial) access, random unusable password (API-only).
      account = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
          role: 'partner',
          isTrial: false,
          permissions: { dashboard: true, calls: { view: true, trigger: true }, agents: { view: true, manage: true } },
          createdBy: opts.createdBy ?? null,
        },
      });
      userId = account.id;
    }

    const secret = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const rec = await this.prisma.apiKey.create({
      data: {
        name: opts.name || account.name || null,
        keyHash: this.sha256(secret),
        keyPrefix: secret.slice(0, 16),
        userId: userId!,
        createdBy: opts.createdBy ?? null,
      },
    });

    return { key: secret, apiKey: this.serialize(rec, account) };
  }

  async list() {
    const keys = await this.prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true } });
    return keys.map((k) => this.serialize(k, k.user));
  }

  async revoke(id: number) {
    const k = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!k) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.update({ where: { id }, data: { active: false } });
    return { success: true };
  }

  // Guard helper: resolve a raw key to its owning user, or null if invalid/revoked.
  async resolve(rawKey: string) {
    if (!rawKey || !rawKey.startsWith('sk_')) return null;
    const rec = await this.prisma.apiKey.findUnique({
      where: { keyHash: this.sha256(rawKey) },
      include: { user: true },
    });
    if (!rec || !rec.active || !rec.user?.isActive) return null;
    this.prisma.apiKey.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return { apiKey: rec, user: rec.user };
  }

  async bumpUsage(id: number) {
    await this.prisma.apiKey.update({ where: { id }, data: { callsMade: { increment: 1 } } }).catch(() => {});
  }

  serialize(k: any, user?: any) {
    return {
      id: k.id,
      key_id: k.keyId,
      name: k.name,
      key_prefix: k.keyPrefix + '…',
      account: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined,
      active: k.active,
      calls_made: k.callsMade,
      last_used_at: k.lastUsedAt,
      created_at: k.createdAt,
    };
  }
}
