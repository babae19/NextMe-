import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const backend = read('backend/index.ts');
test('application has no platform SDK dependencies', () => {
  assert.ok(!backend.includes('@appdeploy/'));
});
test('referenced static illustrations are real PNG files', () => {
  for (const file of readdirSync(new URL('../src/', import.meta.url)).filter(f => f.endsWith('.tsx'))) {
    for (const [, name] of read('src/' + file).matchAll(/\.\/resources\/([\w.-]+\.png)/g)) {
      const bytes = readFileSync(new URL('../public/resources/' + name, import.meta.url));
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
    }
  }
});
test('relative frontend imports resolve in the recovered source', () => {
  for (const file of readdirSync(new URL('../src/', import.meta.url)).filter(f => /\.tsx?$/.test(f))) {
    for (const [, name] of read('src/' + file).matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) {
      assert.ok(['', '.ts', '.tsx', '.css'].some(ext => existsSync(new URL('../src/' + name + ext, import.meta.url))), file + ': ' + name);
    }
  }
});
test('browser workflow specifications contain named scenarios', () => {
  const scenarios = JSON.parse(read('tests/tests.json'));
  assert.ok(scenarios.length > 0);
  assert.equal(new Set(scenarios.map(s => s.name)).size, scenarios.length);
  for (const scenario of scenarios) assert.ok(scenario.name && scenario.covers.length);
});
