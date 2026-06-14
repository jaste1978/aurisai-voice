import { Module } from '@nestjs/common';
import { DemoService } from './demo.service';
import { DemoController } from './demo.controller';

@Module({
  providers: [DemoService],
  controllers: [DemoController],
})
export class DemoModule {}
