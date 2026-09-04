import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.backfillCallOwners();
  }

  // One-time, idempotent: attribute any call that has no owner yet to the user
  // who owns its agent (via owned_agents). Safe to run on every boot — once every
  // legacy row is backfilled, the UPDATE matches nothing. New calls set user_id at
  // creation, so this only ever touches pre-existing / edge rows.
  private async backfillCallOwners() {
    try {
      const affected = await this.$executeRawUnsafe(`
        UPDATE "calls" c
        SET "user_id" = oa."user_id"
        FROM "owned_agents" oa
        WHERE c."agent_id" = oa."agent_id" AND c."user_id" IS NULL
      `);
      if (affected > 0) this.logger.log(`Backfilled owner on ${affected} legacy call(s).`);
    } catch (err: any) {
      // Column may not exist on the very first boot before `prisma db push` runs; ignore.
      this.logger.warn(`Call-owner backfill skipped: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
