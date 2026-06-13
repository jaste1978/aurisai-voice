import { Module } from '@nestjs/common';
import { AgentConfigsService } from './agent-configs.service';
import { AgentConfigsController } from './agent-configs.controller';
import { GoogleChatService } from './google-chat.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AgentConfigsController],
  providers: [AgentConfigsService, GoogleChatService],
  exports: [AgentConfigsService, GoogleChatService],
})
export class AgentConfigsModule {}
