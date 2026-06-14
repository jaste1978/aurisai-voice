import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
})
export class AppModule {}
