import { parseQuery, executeSmartContext } from './lib/searchEngine';
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

  console.log('All tests passed successfully.');
}

runTests();
