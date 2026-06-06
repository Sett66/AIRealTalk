import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AsrModule } from './asr/asr.module';
import { LlmModule } from './llm/llm.module';
import { ScenarioModule } from './scenario/scenario.module';
import { TtsModule } from './tts/tts.module';
import { HealthController } from './health.controller';
import { VoiceSessionGateway } from './voice-session.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AsrModule,
    LlmModule,
    ScenarioModule,
    TtsModule,
  ],
  controllers: [HealthController],
  providers: [VoiceSessionGateway],
})
export class AppModule {}
