import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AsrModule } from './asr/asr.module';
import { HealthController } from './health.controller';
import { VoiceSessionGateway } from './voice-session.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AsrModule,
  ],
  controllers: [HealthController],
  providers: [VoiceSessionGateway],
})
export class AppModule {}
