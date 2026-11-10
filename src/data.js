import { QUESTIONS, TABS } from './content.js';
export const STORAGE_KEY = 'growth-points-2027:v1';
export function emptyDocument() {
  return { schemaVersion: 1, title: 'Точки зростання · 2027', answers: Object.fromEntries(QUESTIONS.map(q => [q.id, Object.fromEntries(TABS.map(tab => [tab.id, '']))])) };
}
export function validateDocument(value) {
  if (!value || value.schemaVersion !== 1 || !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers)) throw new Error('Невірний формат. Виберіть JSON, експортований із цієї презентації.');
  const result = emptyDocument();
  for (const q of QUESTIONS) {
    const source = value.answers[q.id];
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`У файлі відсутнє запитання ${q.id}.`);
    for (const tab of TABS) {
      if (typeof source[tab.id] !== 'string' || source[tab.id].length > 12000) throw new Error(`Некоректна відповідь: ${q.id}, ${tab.label}. Максимум — 12 000 символів.`);
      result.answers[q.id][tab.id] = source[tab.id];
    }
  }
  return result;
}
export function completion(document, stageIndex = null) {
  const questions = stageIndex === null ? QUESTIONS : QUESTIONS.filter(q => q.stageIndex === stageIndex);
  const regionalTabs = TABS.filter(t => t.id !== 'cluster');
  const filled = questions.reduce((count, q) => count + regionalTabs.filter(t => document.answers[q.id][t.id].trim()).length, 0);
  return { filled, total: questions.length * regionalTabs.length };
}
export function readLocal() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? validateDocument(JSON.parse(raw)) : null; } catch { return null; }
}
export function exportDocument(document) {
  return JSON.stringify({ ...validateDocument(document), exportedAt: new Date().toISOString() }, null, 2);
}
