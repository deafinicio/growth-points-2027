import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUESTIONS, STAGES, TABS } from '../src/content.js';
import { emptyDocument, validateDocument, exportDocument, completion } from '../src/data.js';
test('all 9 source questions and 3 regional answer slots per question are present', () => {
  assert.deepEqual(STAGES.map(s => s.questions.length), [3, 5, 1]);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 9);
  const bundled = validateDocument(JSON.parse(readFileSync(new URL('../public/data/presentation.json', import.meta.url), 'utf8')));
  assert.deepEqual(completion(bundled), { filled: 0, total: 27 });
});
test('export and import preserve Ukrainian, newlines, and all regional and joint answers', () => {
  const data = emptyDocument();
  for (const q of QUESTIONS) for (const tab of TABS) data.answers[q.id][tab.id] = `${q.id} ${tab.label}\nДії: якість, зв’язок, ґрунтовність.`;
  assert.deepEqual(validateDocument(JSON.parse(exportDocument(data))), data);
  assert.deepEqual(completion(data), { filled: 27, total: 27 });
  assert.deepEqual(completion(data, 1), { filled: 15, total: 15 });
});
test('malformed imports cannot silently erase or partially load answers', () => {
  for (const value of [null, {}, { schemaVersion: 2, answers: {} }, { schemaVersion: 1, answers: [] }]) assert.throws(() => validateDocument(value));
  const missing = emptyDocument(); delete missing.answers['feb-3']; assert.throws(() => validateDocument(missing));
  const wrong = emptyDocument(); wrong.answers['jan-1'].kharkiv = 42; assert.throws(() => validateDocument(wrong));
  const oversized = emptyDocument(); oversized.answers['mar-1'].sumy = 'a'.repeat(12001); assert.throws(() => validateDocument(oversized));
});
test('joint decisions and whitespace do not inflate regional completion', () => {
  const data = emptyDocument(); data.answers['jan-1'].cluster = 'Узгоджено'; data.answers['jan-1'].sumy = '  \n';
  assert.equal(completion(data).filled, 0);
  data.answers['jan-1'].kharkiv = 'Відповідь'; assert.equal(completion(data).filled, 1);
});
