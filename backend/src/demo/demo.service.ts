import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';

const OTP_TTL_MIN = 10;          // OTP valid for 10 minutes
const LINK_TTL_HOURS = 24;       // demo link valid for 24 hours
const SEND_COOLDOWN_SEC = 45;    // min gap between OTP sends to same contact
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_CALLS_PER_LINK = 3;    // how many demo calls one link can place
const CALL_COOLDOWN_SEC = 90;    // min gap between demo calls on a link

@Injectable()
export class DemoService {
  constructor(private prisma: PrismaService, private bolna: BolnaService) {}

  private now() { return new Date(); }
  private code() { return String(Math.floor(100000 + Math.random() * 900000)); }
  private isUuid(t: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t || ''); }

  async sendOtp(data: any) {
    const email = (data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Please enter a valid email address.');
    }
    // cooldown: block rapid re-sends to the same email
    const recent = await this.prisma.demoSession.findFirst({
      where: { contact: email, createdAt: { gt: new Date(Date.now() - SEND_COOLDOWN_SEC * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new BadRequestException(`Please wait a moment before requesting another code.`);
    }

    const otp = this.code();
    await this.prisma.demoSession.create({
      data: {
        channel: 'email',
        contact: email,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
      },
    });

    await this.sendOtpEmail(email, otp);
    return { success: true, message: 'OTP sent. Check your email.' };
  }

  async verifyOtp(data: any) {
    const email = (data.email || '').trim().toLowerCase();
    const otp = (data.otp || '').trim();
    const session = await this.prisma.demoSession.findFirst({
      where: { contact: email, verified: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!session || !session.otpCode || !session.otpExpiresAt) {
      throw new BadRequestException('Please request an OTP first.');
    }
    if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please request a new code.');
    }
    if (session.otpExpiresAt < this.now()) {
      throw new BadRequestException('This code has expired. Please request a new one.');
    }
    if (session.otpCode !== otp) {
      await this.prisma.demoSession.update({ where: { id: session.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    const linkExpiresAt = new Date(Date.now() + LINK_TTL_HOURS * 3600 * 1000);
    const updated = await this.prisma.demoSession.update({
      where: { id: session.id },
      data: { verified: true, verifiedAt: this.now(), linkExpiresAt, otpCode: null },
    });

    const base = process.env.DEMO_LINK_BASE || 'https://www.aurisaivoice.com/demo.html';
    return {
      success: true,
      token: updated.token,
      demo_url: `${base}?token=${updated.token}`,
      expires_at: linkExpiresAt,
    };
  }

  // Verify an email OTP without issuing a demo link — reused by trial signup.
  // Throws BadRequestException on failure; returns true on success.
  async checkOtp(email: string, otp: string): Promise<boolean> {
    email = (email || '').trim().toLowerCase();
    otp = (otp || '').trim();
    const session = await this.prisma.demoSession.findFirst({
      where: { contact: email, verified: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!session || !session.otpCode || !session.otpExpiresAt) throw new BadRequestException('Please request an OTP first.');
    if (session.attempts >= MAX_VERIFY_ATTEMPTS) throw new BadRequestException('Too many attempts. Please request a new code.');
    if (session.otpExpiresAt < this.now()) throw new BadRequestException('This code has expired. Please request a new one.');
    if (session.otpCode !== otp) {
      await this.prisma.demoSession.update({ where: { id: session.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect code. Please try again.');
    }
    await this.prisma.demoSession.update({ where: { id: session.id }, data: { verified: true, verifiedAt: this.now(), otpCode: null } });
    return true;
  }

  // validate a demo link/token (used by the demo page on load)
  async session(token: string) {
    const s = this.isUuid(token) ? await this.prisma.demoSession.findUnique({ where: { token } }) : null;
    if (!s || !s.verified || !s.linkExpiresAt) {
      return { success: true, valid: false, reason: 'invalid' };
    }
    if (s.linkExpiresAt < this.now()) {
      return { success: true, valid: false, reason: 'expired' };
    }
    return {
      success: true,
      valid: true,
      expires_at: s.linkExpiresAt,
      calls_remaining: Math.max(0, MAX_CALLS_PER_LINK - s.callsCount),
    };
  }

  async call(data: any) {
    const token = (data.token || '').trim();
    let phone = (data.phone_number || '').replace(/[^\d+]/g, '');
    if (phone && !phone.startsWith('+')) phone = '+91' + phone.replace(/^0+/, '');
    if (!/^\+\d{10,15}$/.test(phone)) {
      throw new BadRequestException('Please enter a valid phone number with country code.');
    }
    const s = this.isUuid(token) ? await this.prisma.demoSession.findUnique({ where: { token } }) : null;
    if (!s || !s.verified || !s.linkExpiresAt) throw new BadRequestException('Invalid demo link. Please verify again.');
    if (s.linkExpiresAt < this.now()) throw new BadRequestException('This demo link has expired. Please verify again.');
    if (s.callsCount >= MAX_CALLS_PER_LINK) throw new BadRequestException('You have used all demo calls for this link.');
    if (s.lastCallAt && s.lastCallAt > new Date(Date.now() - CALL_COOLDOWN_SEC * 1000)) {
      throw new BadRequestException('A call was just placed. Please wait a minute before trying again.');
    }

    const agentId = process.env.DEMO_AGENT_ID;
    if (!agentId) throw new BadRequestException('Demo agent is not configured.');

    const res = await this.bolna.triggerCall(phone, agentId, `demo-${s.id}`, {
      customerName: 'Website Visitor',
      purpose: 'website_demo',
      language: 'hi',
    });

    await this.prisma.demoSession.update({
      where: { id: s.id },
      data: { callsCount: { increment: 1 }, lastCallAt: this.now(), lastPhone: phone },
    });

    // record it in the calls table so it shows in the admin & gets poller updates
    const execId = res?.execution_id || res?.run_id || null;
    await this.prisma.call.create({
      data: {
        phoneNumber: phone,
        status: 'in_progress',
        agentId,
        agentName: 'Website Demo',
        callStartTime: this.now(),
        ...(execId && { bolnaExecutionId: execId }),
      },
    }).catch(() => {});

    return {
      success: true,
      message: 'Call placed! Your phone will ring shortly.',
      execution_id: res?.execution_id || res?.run_id || null,
      calls_remaining: Math.max(0, MAX_CALLS_PER_LINK - (s.callsCount + 1)),
    };
  }

  private async sendOtpEmail(to: string, otp: string) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'AurisAI <onboarding@resend.dev>';
    if (!key) {
      // No provider configured — surface the code so the flow is still testable.
      throw new BadRequestException('Email service is not configured. (Set RESEND_API_KEY.)');
    }
    const html = `<div style="max-width:480px;margin:auto;font:15px/1.6 Arial,sans-serif;color:#1a1410">
      <h2 style="font-weight:600">Your AurisAI demo code</h2>
      <p>Use this code to unlock your live AI call demo:</p>
      <p style="font:700 30px/1 Arial;letter-spacing:8px;color:#FF7A50;margin:18px 0">${otp}</p>
      <p style="color:#888;font-size:13px">This code expires in ${OTP_TTL_MIN} minutes. If you didn't request it, ignore this email.</p>
      <p style="color:#888;font-size:13px">— AurisAI · Hear It Out</p>
    </div>`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: `${otp} is your AurisAI demo code`, html }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Resend OTP send failed:', r.status, detail);
      throw new BadRequestException('Could not send the OTP email. Please try again.');
    }
  }
}
