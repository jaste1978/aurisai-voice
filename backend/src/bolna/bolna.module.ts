import { Global, Module } from '@nestjs/common';
import { BolnaService } from './bolna.service';

@Global()
@Module({
  providers: [BolnaService],
  exports: [BolnaService],
})
export class BolnaModule {}
