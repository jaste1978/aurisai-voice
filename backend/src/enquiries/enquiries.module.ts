import { Module } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { EnquiriesController } from './enquiries.controller';

@Module({
  providers: [EnquiriesService],
  controllers: [EnquiriesController],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
