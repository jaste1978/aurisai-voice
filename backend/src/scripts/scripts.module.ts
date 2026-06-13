import { Module } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScriptsService],
  controllers: [ScriptsController],
})
export class ScriptsModule {}
