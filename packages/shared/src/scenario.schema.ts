import { z } from 'zod';

export const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleEn: z.string(),
  role: z.string(),
  openingLine: z.string(),
  goals: z.array(z.string()),
  difficulty: z.enum(['B1', 'B2', 'B1-B2']),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

export const ScenarioListSchema = z.array(ScenarioSchema);

export type ScenarioList = z.infer<typeof ScenarioListSchema>;
