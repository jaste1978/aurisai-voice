import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { BolnaModule } from './bolna/bolna.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { CallsModule } from './calls/calls.module';
import { AgentsModule } from './agents/agents.module';
import { BatchesModule } from './batches/batches.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ScriptsModule } from './scripts/scripts.module';
import { ReportTemplatesModule } from './report-templates/report-templates.module';
import { ScheduledCampaignsModule } from './scheduled-campaigns/scheduled-campaigns.module';
import { AgentConfigsModule } from './agent-configs/agent-configs.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { DemoModule } from './demo/demo.module';
import { TelegramModule } from './telegram/telegram.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { PublicApiModule } from './public-api/public-api.module';

// Only serve React static files when production build exists
const publicPath = join(__dirname, '..', 'public');
const staticModules = existsSync(publicPath)
  ? [ServeStaticModule.forRoot({
      rootPath: publicPath,
      exclude: ['/api/{*path}', '/webhooks/{*path}'],
    })]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global IP rate limit — blunts brute-force / flooding. 600 req/min/IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    ...staticModules,
    PrismaModule,
    BolnaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    CallsModule,
    AgentsModule,
    BatchesModule,
    WebhooksModule,
    ScriptsModule,
    ReportTemplatesModule,
    ScheduledCampaignsModule,
    AgentConfigsModule,
    EnquiriesModule,
    DemoModule,
    TelegramModule,
    MonitoringModule,
    ApiKeysModule,
    PublicApiModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
