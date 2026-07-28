import { parseQuery, executeSmartContext } from './lib/searchEngine';
import { DEFAULT_OLLAMA_MODEL, OLLAMA_MODEL_PROFILES, RECOMMENDED_OLLAMA_MODELS } from './config/ollamaModels';
import assert from 'assert';

function runTests() {
  console.log('Running tests for searchEngine...');

  // Test parseQuery
  const parsed = parseQuery('minecraft 1.20.1 fabric mods that depend on sodium');
  assert.strictEqual(parsed.facets.mc_version, '1.20.1');
  assert.strictEqual(parsed.facets.loader, 'fabric');
  assert.strictEqual(parsed.facets.dependency, 'sodium');
  assert.deepStrictEqual(parsed.keywords, ['minecraft', '1.20.1', 'fabric', 'depend', 'sodium']);

  // Test executeSmartContext
  const bundle = executeSmartContext('mods that depend on sodium');
  assert.ok(bundle.entities.length > 0, 'Should return entities');
  assert.ok(bundle.edges.length > 0, 'Should return edges');

  // Verify target is sodium
  const sodium = bundle.entities.find(e => e.type === 'Mod' && e.canonical.slug === 'sodium');
  assert.ok(sodium, 'Sodium should be in the context bundle');

  // Test local model contract
  assert.strictEqual(DEFAULT_OLLAMA_MODEL, 'gemma3:270m');
  assert.deepStrictEqual(RECOMMENDED_OLLAMA_MODELS, ['gemma3:270m', 'qwen2.5-coder:0.5b', 'smollm2:135m']);
  assert.strictEqual(OLLAMA_MODEL_PROFILES.length, 3);
  assert.ok(OLLAMA_MODEL_PROFILES.every(model => model.name.includes(':')), 'Every model must pin an explicit Ollama tag');

  console.log('All tests passed successfully.');
}

runTests();
