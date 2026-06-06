import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ScenarioSchema, type Scenario } from '@airealtalk/shared';

const DEFAULT_SCENARIO_ID = 'interview';

const SCENARIO_IDS = ['interview', 'restaurant', 'meeting'] as const;

@Injectable()
export class ScenarioService {
  private readonly logger = new Logger(ScenarioService.name);
  private readonly cache = new Map<string, Scenario>();

  getById(id: string = DEFAULT_SCENARIO_ID): Scenario {
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const filePath = join(__dirname, '..', 'scenarios', `${id}.json`);
    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf-8');
    } catch {
      throw new NotFoundException(`Scenario not found: ${id}`);
    }

    const scenario = ScenarioSchema.parse(JSON.parse(raw));
    this.cache.set(id, scenario);
    this.logger.log(`Loaded scenario: ${scenario.id}`);
    return scenario;
  }

  listAll(): Scenario[] {
    return SCENARIO_IDS.map((id) => this.getById(id));
  }
}
