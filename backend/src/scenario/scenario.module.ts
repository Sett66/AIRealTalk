import { Module } from '@nestjs/common';
import { ScenarioService } from './scenario.service';

@Module({
  providers: [ScenarioService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
