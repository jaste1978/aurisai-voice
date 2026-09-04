import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiDocsController } from './public-api-docs.controller';
import { CallsModule } from '../calls/calls.module';
import { AgentsModule } from '../agents/agents.module';

// ApiKeysModule (guard + service) and PrismaModule are @Global.
@Module({
  imports: [CallsModule, AgentsModule],
  controllers: [PublicApiController, PublicApiDocsController],
})
export class PublicApiModule {}
