/**
 * Issue #06 verification: GET /scenarios returns 3 scenarios
 */
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function main() {
  const response = await fetch(`${API_URL}/scenarios`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const scenarios = await response.json();
  if (!Array.isArray(scenarios) || scenarios.length !== 3) {
    throw new Error(`Expected 3 scenarios, got ${scenarios.length}`);
  }

  const ids = scenarios.map((s) => s.id).sort();
  const expected = ['interview', 'meeting', 'restaurant'];
  if (JSON.stringify(ids) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected scenario ids: ${ids.join(', ')}`);
  }

  for (const scenario of scenarios) {
    if (!scenario.title || !scenario.titleEn) {
      throw new Error(`Scenario ${scenario.id} missing title fields`);
    }
    console.log(`✓ ${scenario.id}: ${scenario.title} / ${scenario.titleEn}`);
  }

  console.log('✓ GET /scenarios returns 3 scenarios');
}

main().catch((error) => {
  console.error('✗', error.message);
  process.exit(1);
});
