import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { DemoService } from '../demo/demo.service';
import * as bcrypt from 'bcryptjs';

const TRIAL_DAYS = 14;
const TRIAL_PERMISSIONS = {
  dashboard: true,
  calls: { view: true, trigger: true },
  customers: { view: false, manage: false },
  bulk: { view: false, manage: false },
  agents: { view: true, manage: true },
};

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private demo: DemoService) {}

  // Step 1 of trial signup — email a verification code.
  async signupStart(email: string) {
    email = (email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Please enter a valid email.');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('An account with this email already exists. Please log in.');
    return this.demo.sendOtp({ email }); // sends the 6-digit code
  }

  // Step 2 — verify code, set password, create a 14-day trial account.
  async signupVerify(data: any) {
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim() || email.split('@')[0];
    const password = data.password || '';
    if (password.length < 6) throw new BadRequestException('Password must be at least 6 characters.');
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('An account with this email already exists. Please log in.');
    }
    await this.demo.checkOtp(email, data.otp); // throws if invalid

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        role: 'trial',
        isTrial: true,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000),
        agentLimit: 2,
        callLimit: 20,
        callsUsed: 0,
        permissions: TRIAL_PERMISSIONS,
      },
    });
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { success: true, token, user: this.serialize(user) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { success: true, token, user: this.serialize(user) };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { success: true, user: this.serialize(user) };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { success: true, message: 'Password changed successfully' };
  }

  serialize(user: any) {
    return {
      id: user.id,
      user_id: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      is_active: user.isActive,
      is_trial: user.isTrial,
      trial_ends_at: user.trialEndsAt,
      agent_limit: user.agentLimit,
      call_limit: user.callLimit,
      calls_used: user.callsUsed,
      created_at: user.createdAt,
    };
  }
}
