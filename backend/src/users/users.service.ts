import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  customers: { view: true, manage: false },
  calls: { view: true, trigger: false },
  bulk: { view: false, manage: false },
  users: { view: false, manage: false },
};

const ADMIN_PERMISSIONS = {
  dashboard: true,
  customers: { view: true, manage: true },
  calls: { view: true, trigger: true },
  bulk: { view: true, manage: true },
  users: { view: true, manage: true },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map(this.serialize);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async create(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use');
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hash,
        role: data.role || 'user',
        isActive: data.is_active !== undefined ? data.is_active : true,
        permissions: data.role === 'admin' ? ADMIN_PERMISSIONS : (data.permissions || DEFAULT_PERMISSIONS),
        createdBy: data.createdBy || null,
      },
    });
    return { success: true, data: this.serialize(user) };
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.role) updateData.role = data.role;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.permissions) updateData.permissions = data.permissions;

    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    return { success: true, data: this.serialize(user) };
  }

  async delete(id: number) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'User deleted' };
  }

  async seedAdmin() {
    const exists = await this.prisma.user.findUnique({ where: { email: 'admin@aurisaivoice.com' } });
    if (!exists) {
      const hash = await bcrypt.hash('Admin@123', 10);
      await this.prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@aurisaivoice.com',
          passwordHash: hash,
          role: 'admin',
          permissions: ADMIN_PERMISSIONS,
        },
      });
      console.log('✅ Default admin created: admin@aurisaivoice.com / Admin@123');
    }
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
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
