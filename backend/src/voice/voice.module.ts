import { Global, Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { BolnaProvider } from './providers/bolna.provider';
import { DograhProvider } from './providers/dograh.provider';

// Standalone provider-abstraction layer. BolnaModule is @Global, so BolnaProvider
// can inject BolnaService. Exported so the main call flow can adopt VoiceService
// later ("connect") without further wiring.
@Global()
@Module({
  providers: [VoiceService, BolnaProvider, DograhProvider],
  controllers: [VoiceController],
  exports: [VoiceService],
})
export class VoiceModule {}
