export const CHAPTERS = [
  { month: 'Січень', label: 'Коріння', title: 'Основа\nзакладена.', description: 'Команда. Пріоритети. Перші сесії.', next: 'Вирощувати крону', range: [0, 2] },
  { month: 'Лютий', label: 'Крона', title: 'Досвід стає\nспроможністю.', description: 'П’ять відповідей. Єдина система якості.', next: 'Побачити результат', range: [3, 7] },
  { month: 'Березень', label: 'Плід', title: 'Зростання стає\nвидимим.', description: 'Дані. Оцінка. Спільний результат.', next: 'Об’єднати все', range: [8, 8] },
];
export const ELEMENTS = ['Команда', 'Пріоритети', 'Пілотні сесії', 'Моніторинг', 'Обмін досвідом', 'Фокус-групи', 'Ключові повідомлення', 'Зворотний зв’язок', 'Дані та спроможність'];
export function initialSession() { return { phase: 'intro', index: 0, built: [], chapter: 0 }; }
const chapterFor = i => i < 3 ? 0 : i < 8 ? 1 : 2;
const isEnd = i => [2, 7, 8].includes(i);
export function sessionReducer(state, action) {
  switch (action.type) {
    case 'START': return { ...initialSession(), phase: 'question' };
    case 'HOME': return initialSession();
    case 'ADVANCE': {
      if (state.phase !== 'question') return state;
      if (state.built.includes(state.index)) return isEnd(state.index) ? { ...state, phase: 'chapter', chapter: chapterFor(state.index) } : { ...state, index: state.index + 1 };
      return { ...state, phase: 'growing', built: [...state.built, state.index], chapter: chapterFor(state.index) };
    }
    case 'GROWTH_DONE': return state.phase !== 'growing' ? state : isEnd(state.index) ? { ...state, phase: 'chapter' } : { ...state, phase: 'question', index: state.index + 1 };
    case 'CONTINUE': return state.phase !== 'chapter' ? state : state.index === 8 ? { ...state, phase: 'finale' } : { ...state, phase: 'question', index: state.index + 1 };
    case 'BACK': return ['growing', 'intro'].includes(state.phase) ? state : { ...state, phase: 'question', index: state.phase === 'question' ? Math.max(0, state.index - 1) : state.index };
    case 'JUMP': return Number.isInteger(action.index) && action.index >= 0 && action.index <= Math.min(8, state.built.length) && state.phase !== 'growing' ? { ...state, phase: 'question', index: action.index, chapter: chapterFor(action.index) } : state;
    default: return state;
  }
}
