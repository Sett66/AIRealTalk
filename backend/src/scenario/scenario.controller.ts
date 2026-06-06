import { Controller, Get } from '@nestjs/common';
import { ScenarioListSchema, type ScenarioList } from '@airealtalk/shared';
import { ScenarioService } from './scenario.service';

@Controller()
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get('scenarios')
  listScenarios(): ScenarioList {
    return ScenarioListSchema.parse(this.scenarioService.listAll());
  }
}
