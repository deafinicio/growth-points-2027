import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, ArrowLeft, Sun, Moon, Maximize, Minimize, Settings2, X, Download, Upload, Pencil, Check, House, Keyboard, ChevronRight, Layers3, Orbit, TrendingUp, Pause, Play, Info, CheckCheck } from 'lucide-react';
import { STAGES, REGIONS, TABS, QUESTIONS, LAYOUTS } from './content';
import { emptyDocument, validateDocument, completion, readLocal, exportDocument, STORAGE_KEY } from './data';
import './style.css';
const Scene = lazy(() => import('./Scene'));
const ease = [.22, 1, .36, 1];
const layoutIcons = [Layers3, Orbit, TrendingUp];
function safeSetting(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function Mark() { return <svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 1 23 12H9L16 1Z" fill="currentColor"/><path d="M8 17H24L28 23H4L8 17Z" fill="currentColor" opacity=".65"/><path d="M3 28H29L32 34H0L3 28Z" fill="currentColor" opacity=".35"/></svg>; }
function App() {
  const reduced = useReducedMotion();
  const [theme, setTheme] = useState(() => safeSetting('growth-theme', 'dark'));
  const [layout, setLayout] = useState('pyramid');
  const [levels, setLevels] = useState(3);
  const [building, setBuilding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [screen, setScreen] = useState(-1);
  const [region, setRegion] = useState('kharkiv');
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [documentData, setDocumentData] = useState(emptyDocument);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const [incoming, setIncoming] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const fileRef = useRef();
  const headingRef = useRef();
  const settingsRef = useRef();
  const current = QUESTIONS[screen];
  const stage = current ? STAGES[current.stageIndex] : null;
  const home = screen === -1;
  const finale = screen === QUESTIONS.length;
  const animate = !paused && !reduced && home;
  const progress = completion(documentData);
  const go = useCallback(next => { setScreen(Math.max(-1, Math.min(QUESTIONS.length, next))); setEditing(false); setSettings(false); document.body.style.cursor = ''; }, []);
  const openStage = useCallback(index => go(QUESTIONS.findIndex(q => q.stageIndex === index)), [go]);
  const changeTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  const toggleFullscreen = useCallback(async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
    catch { setToast('Повноекранний режим недоступний у цьому вікні. Спробуйте F11.'); }
  }, []);
  useEffect(() => {
    const local = readLocal();
    if (local) { setDocumentData(local); setReady(true); return; }
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/presentation.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { setDocumentData(validateDocument(data)); setReady(true); }).catch(error => { if (error.name !== 'AbortError') { setReady(true); setToast('Відкрито порожню заготовку. Файл відповідей не завантажився.'); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101215' : '#f5f3ee';
    try { localStorage.setItem('growth-theme', theme); } catch { /* Theme remains usable for this session. */ }
  }, [theme]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(documentData)); setStorageOk(true); }
    catch { setStorageOk(false); }
  }, [documentData, ready]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 5000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    const handle = event => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') { setHelp(false); setSettings(false); setIncoming(null); if (!home) go(-1); return; }
      if (help || settings || incoming) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { if (event.key === ' ' && event.target.closest('button')) return; event.preventDefault(); go(screen + 1); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(screen - 1); }
      if (event.key === 'Home') { event.preventDefault(); go(-1); }
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
      if (event.key.toLowerCase() === 't') changeTheme();
      if (['1', '2', '3', '4'].includes(event.key) && current) setRegion(TABS[Number(event.key) - 1].id);
      if (event.key === '?') setHelp(true);
    };
    window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);
  }, [screen, home, go, current, help, settings, incoming, toggleFullscreen, changeTheme]);
  useEffect(() => { window.scrollTo({top:0,behavior:'instant'}); }, [screen]);
  useEffect(() => { if (!building) return; if (reduced) { setLevels(3); setBuilding(false); return; } const timers = [setTimeout(() => setLevels(2), 1200), setTimeout(() => setLevels(3), 2400), setTimeout(() => setBuilding(false), 3500)]; return () => timers.forEach(clearTimeout); }, [building, reduced]);
  useEffect(() => {
    if (!settings) return;
    const close = e => { if (!settingsRef.current?.contains(e.target)) setSettings(false); };
    window.addEventListener('pointerdown', close); return () => window.removeEventListener('pointerdown', close);
  }, [settings]);
  useEffect(() => {
    if (!(help || incoming)) return;
    const dialog = document.querySelector('[role="dialog"]');
    const previous = document.activeElement;
    dialog?.querySelector('button')?.focus();
    const trap = e => { if (e.key !== 'Tab') return; const items = dialog?.querySelectorAll('button, [href], input'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } };
    window.addEventListener('keydown', trap); return () => { window.removeEventListener('keydown', trap); previous?.focus(); };
  }, [help, incoming]);
  function updateAnswer(value) {
    setDocumentData(data => ({ ...data, answers: { ...data.answers, [current.id]: { ...data.answers[current.id], [region]: value } } }));
  }
  function download() {
    const blob = new Blob([exportDocument(documentData)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'growth-points-2027-answers.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Відповіді експортовано. Передайте JSON колегам або додайте до репозиторію.');
  }
  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { if (file.size > 500000) throw new Error('Файл завеликий. Максимальний розмір — 500 КБ.'); const value = validateDocument(JSON.parse(await file.text())); setIncoming({ data: value, name: file.name }); setSettings(false); }
    catch (error) { setToast(error instanceof SyntaxError ? 'Не вдалося прочитати JSON. Перевірте формат файлу.' : error.message); }
  }
  return <MotionConfig reducedMotion="user"><div className={`app ${home ? 'is-home' : 'is-detail'}`} style={{ '--stage-color': stage?.color || '#f4937c' }}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="grain"/>
    <header className="topbar">
      <button className="brand" onClick={() => go(-1)} aria-label="На головну"><Mark/><span>ТОЧКИ<br/><b>ЗРОСТАННЯ</b></span></button>
      <div className="edition"><span className="status-light"/>ПІВНІЧНО-СХІДНИЙ КЛАСТЕР<span className="edition-line"/>I КВАРТАЛ <b>2027</b></div>
      <div className="tools">
        <button className="icon-button" onClick={changeTheme} aria-label={theme === 'dark' ? 'Світла тема' : 'Темна тема'} title="Змінити тему · T">{theme === 'dark' ? <Sun/> : <Moon/>}</button>
        <button className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Вийти з повного екрана' : 'Повний екран'} title="Повний екран · F">{fullscreen ? <Minimize/> : <Maximize/>}</button>
        <div className="settings-wrap" ref={settingsRef}>
          <button className={`icon-button ${settings ? 'is-active' : ''}`} onClick={() => setSettings(v => !v)} aria-label="Налаштування" aria-expanded={settings}><Settings2/></button>
          <AnimatePresence>{settings && <motion.div className="settings-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <span className="micro">ПРЕЗЕНТАЦІЯ</span>
            <button onClick={() => setPaused(v => !v)}>{paused || reduced ? <Play/> : <Pause/>}{paused ? 'Увімкнути анімацію' : 'Призупинити анімацію'}{reduced && <small>Системне обмеження руху</small>}</button>
            <button onClick={download} disabled={!ready}><Download/>Експортувати відповіді</button>
            <button onClick={() => fileRef.current.click()} disabled={!ready}><Upload/>Імпортувати відповіді</button>
            <button onClick={() => { setHelp(true); setSettings(false); }}><Keyboard/>Керування презентацією</button>
            <p>Відповіді зберігаються в цьому браузері. Для передачі колегам використайте експорт.</p>
          </motion.div>}</AnimatePresence>
        </div>
      </div>
    </header>
    <input type="file" accept=".json,application/json" ref={fileRef} hidden onChange={importFile}/>
    <main>
    <AnimatePresence mode="wait">
    {home ? <motion.section className="home" key="home" onAnimationComplete={() => headingRef.current?.focus({preventScroll:true})} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: .45, ease }}>
      <div className="hero-copy">
        <motion.div className="eyebrow" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}><span className="tiny-cross"/>РАЗОМ ПЛАНУЄМО. РАЗОМ ДОСЯГАЄМО!</motion.div>
        <h1 ref={headingRef} tabIndex={-1}><span>Точки</span><span className="accent-word">зростання<span className="title-dot">.</span></span></h1>
        <p className="hero-subtitle">Великі зміни починаються<br/>з <strong>маленьких кроків.</strong></p>
        <div className="region-list">{REGIONS.map(r => <span key={r.id}><i style={{ background: r.color }}/>{r.label}</span>)}</div>
        <button className="primary-button" onClick={() => go(0)}>Почати презентацію<span><ArrowUpRight/></span></button>
        <div className="hero-meta"><span><b>90</b> днів зростання</span><i/><span><b>03</b> спільні етапи</span></div>
      </div>
      <div className="scene-zone">
        <div className="scene-coordinate top">ПРОСТІР МОЖЛИВОСТЕЙ <span>2027 / Q1</span></div>
        <div className="scene-inner"><Suspense fallback={<div className="scene-loading"><Mark/><span>Будуємо простір зростання…</span></div>}><Scene {...{ layout, theme, animate, selected, setSelected, onOpen: openStage, focus: false, levels }}/></Suspense></div>
        <div className="scene-caption"><span className="caption-line"/><p>{LAYOUTS.find(l => l.id === layout).description}</p></div>
        <div className="build-controls"><span>Рівні</span>{[1,2,3].map(n => <button key={n} aria-label={`Показати ${n} ${n === 1 ? 'рівень' : 'рівні'}`} aria-pressed={levels === n} className={levels === n ? 'active' : ''} onClick={() => { setBuilding(false); setLevels(n); }}>{String(n).padStart(2,'0')}</button>)}<button className="build-play" disabled={building} onClick={() => { setLevels(1); setBuilding(true); }}><Play size={10}/>{building ? 'Будуємо…' : 'Побудувати'}</button></div>
        <div className="layout-switch" aria-label="Композиція головної сцени">{LAYOUTS.map((l, i) => { const Icon = layoutIcons[i]; return <button key={l.id} className={layout === l.id ? 'active' : ''} aria-pressed={layout === l.id} onClick={() => setLayout(l.id)}><Icon/>{l.label}</button>; })}</div>
      </div>
      <div className="journey-title"><span className="micro">ВІД ОСНОВИ ДО РЕЗУЛЬТАТУ</span><span>Оберіть етап для дослідження <ArrowRight/></span></div>
      <div className="stage-cards">{STAGES.map((s, i) => <button key={s.id} className={`stage-card ${selected === i ? 'highlighted' : ''}`} style={{ '--card-color': s.color }} onClick={() => openStage(i)} onMouseEnter={() => setSelected(i)} onMouseLeave={() => setSelected(null)}>
        <div className="stage-card-top"><span className="stage-numeral">{s.number}</span><span className="stage-month">{s.month}<small>2027</small></span><ArrowUpRight/></div>
        <h2>{s.title}</h2><p>{s.description}</p><div className="stage-card-bottom"><span>{s.questions.length === 1 ? '1 запитання' : s.questions.length === 5 ? '5 запитань' : '3 запитання'}</span><span className="stage-dot"/><span>{s.range}</span></div>
      </button>)}</div>
    </motion.section> : finale ? <motion.section key="finale" className="finale" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .45 }}>
      <span className="eyebrow"><CheckCheck size={16}/> СПІЛЬНА ТРАЄКТОРІЯ · 90 ДНІВ</span>
      <h1 ref={headingRef} tabIndex={-1}>Маленькі кроки.<br/><em>Великі зміни.</em></h1>
      <p className="finale-intro">Три області. Спільний напрям руху.<br/>Від першої пілотної сесії — до підсумків кварталу.</p>
      <div className="synthesis">{STAGES.map((s, i) => <article key={s.id} style={{ '--card-color': s.color }}><span className="micro">{s.number} / {s.month.toUpperCase()}</span><h2>{s.outcome}</h2><div className="synthesis-answers">{s.questions.map(q => <div key={q.id}><strong>{q.title}</strong><p>{documentData.answers[q.id].cluster || 'Спільне рішення ще не сформульовано.'}</p></div>)}</div><button onClick={() => { openStage(i); setRegion('cluster'); }}>До спільних рішень <ArrowUpRight size={16}/></button></article>)}</div>
      <button className="primary-button" onClick={() => go(-1)}>Повернутися до основи<span><House/></span></button>
    </motion.section> : <motion.section key="detail" className="detail" onAnimationComplete={() => headingRef.current?.focus({preventScroll:true})} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: .4, ease }}>
      <div className="detail-heading"><button className="back-link" onClick={() => go(-1)}><ArrowLeft/>До загальної сцени</button><span className="detail-overline">ЕТАП {stage.number} <i/> {stage.month.toUpperCase()} 2027</span><span className="question-count">{screen + 1}<small> / 09</small></span></div>
      <div className="detail-body">
        <aside className="question-nav"><div className="detail-stage-number">{stage.number}<span>/{STAGES.length.toString().padStart(2, '0')}</span></div><span className="micro">{stage.eyebrow}</span><h2>{stage.title}</h2><nav aria-label="Запитання етапу">{stage.questions.map((q, i) => <button key={q.id} className={current.id === q.id ? 'active' : ''} aria-current={current.id === q.id ? 'step' : undefined} onClick={() => go(QUESTIONS.findIndex(item => item.id === q.id))}><span>{String(i + 1).padStart(2, '0')}</span>{q.title}<ChevronRight/></button>)}</nav><div className="stage-outcome"><span className="micro">ФОКУС ЕТАПУ</span><p>{stage.outcome}</p></div></aside>
        <div className="question-content"><AnimatePresence mode="wait"><motion.div key={current.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .24 }}>
          <span className="eyebrow">ЗАПИТАННЯ {String(current.questionIndex + 1).padStart(2, '0')} <span className="eyebrow-slash">/</span> {String(stage.questions.length).padStart(2, '0')}</span>
          <h1 ref={headingRef} tabIndex={-1}>{current.text}</h1>
          {current.detail && <details className="question-explainer"><summary><Info size={15}/>Що мається на увазі під фокус-групою?</summary><p>{current.detail}</p></details>}
          <div className="region-tabs" role="tablist" aria-label="Відповіді областей" onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); const i = TABS.findIndex(t => t.id === region); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4; setRegion(TABS[next].id); e.currentTarget.querySelectorAll('[role="tab"]')[next].focus(); } }}>
            {TABS.map((t, i) => <button key={t.id} id={`tab-${t.id}`} role="tab" aria-controls="answer-panel" aria-selected={region === t.id} tabIndex={region === t.id ? 0 : -1} className={region === t.id ? 'active' : ''} style={{ '--region-color': t.color }} onClick={() => { setRegion(t.id); setEditing(false); }}><i/>{t.label}{documentData.answers[current.id][t.id].trim() && <Check size={13}/>}</button>)}
          </div>
          <div className={`answer-panel ${editing ? 'is-editing' : ''}`} role="tabpanel" id="answer-panel" aria-labelledby={`tab-${region}`}>
            <div className="answer-topline"><span className="micro">{region === 'cluster' ? 'СПІЛЬНЕ РІШЕННЯ КЛАСТЕРУ' : `${TABS.find(t => t.id === region).label.toUpperCase()} ОБЛАСТЬ`}</span><button className="edit-button" disabled={!ready} onClick={() => setEditing(v => !v)}>{editing ? <Check/> : <Pencil/>}{editing ? 'Готово' : documentData.answers[current.id][region] ? 'Редагувати' : 'Заповнити'}</button></div>
            {editing ? <><textarea key={`${current.id}-${region}`} autoFocus value={documentData.answers[current.id][region]} maxLength={12000} onChange={e => updateAnswer(e.target.value)} placeholder={region === 'cluster' ? 'Сформулюйте узгоджене рішення трьох областей…' : current.hint} aria-label={`Відповідь: ${TABS.find(t => t.id === region).label}`}/><div className={`save-note ${!storageOk ? 'warning' : ''}`}><span>{storageOk ? 'Автоматично зберігається в цьому браузері · Для колег експортуйте JSON' : 'Браузер не зберігає зміни · Експортуйте JSON перед закриттям'}</span><span>{documentData.answers[current.id][region].length} / 12 000</span></div></> : documentData.answers[current.id][region].trim() ? <div className="answer-text">{documentData.answers[current.id][region]}</div> : <div className="empty-answer"><div className="empty-orbit"><span/><span/><span/></div><h3>{region === 'cluster' ? 'Тут з’явиться спільне рішення' : 'Простір для вашої відповіді'}</h3><p>{region === 'cluster' ? 'Після обговорення відповідей областей зафіксуйте узгоджений підхід кластеру.' : current.hint}</p><button onClick={() => setEditing(true)} disabled={!ready}>Додати відповідь <ArrowUpRight size={15}/></button></div>}
          </div>
        </motion.div></AnimatePresence></div>
      </div>
      <div className="detail-navigation"><button className="secondary-button" onClick={() => go(screen - 1)}><ArrowLeft/>{screen === 0 ? 'До основи' : 'Попереднє запитання'}</button><div className="question-dots">{QUESTIONS.map((q, i) => <button key={q.id} onClick={() => go(i)} className={screen === i ? 'active' : ''} style={{ '--dot-color': STAGES[q.stageIndex].color }} aria-label={`Запитання ${i + 1}: ${q.title}`} aria-current={screen === i ? 'step' : undefined}/>)}</div><button className="primary-button next-button" onClick={() => go(screen + 1)}>{screen === 8 ? 'До спільного результату' : current.questionIndex === stage.questions.length - 1 ? 'Наступний етап' : 'Наступне запитання'}<span><ArrowRight/></span></button></div>
    </motion.section>}
    </AnimatePresence>
    </main>
    <footer className="footer"><span className="footer-cluster">ХАРКІВСЬКА · ЧЕРНІГІВСЬКА · СУМСЬКА</span><div className="footer-progress" title="Заповнення відповідей трьох областей"><span className="progress-track"><i style={{ width: `${progress.filled / progress.total * 100}%` }}/></span><span>{progress.filled}/{progress.total} відповідей</span></div><button onClick={() => setHelp(true)}><Keyboard/> <span>Керування</span><kbd>?</kbd></button></footer>
    <AnimatePresence>{toast && <motion.div role="status" className="toast" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}>{toast}<button onClick={() => setToast('')} aria-label="Закрити повідомлення"><X size={16}/></button></motion.div>}</AnimatePresence>
    <AnimatePresence>{(help || incoming) && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setHelp(false); setIncoming(null); }}><motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ scale: .96, y: 15 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => { setHelp(false); setIncoming(null); }} aria-label="Закрити"><X/></button>
      {incoming ? <><span className="eyebrow">ІМПОРТ ВІДПОВІДЕЙ</span><h2 id="modal-title">Відкрити цей набір?</h2><p className="import-filename">{incoming.name}</p><p>У файлі заповнено {completion(incoming.data).filled} із 27 відповідей областей. Він замінить поточні відповіді в цьому браузері.</p><p>За потреби спершу експортуйте поточну версію.</p><div className="modal-actions"><button className="secondary-button" onClick={download}><Download size={16}/>Експортувати поточні</button><button className="primary-button" onClick={() => { setDocumentData(incoming.data); setIncoming(null); setToast('Відповіді імпортовано.'); }}>Застосувати<Check size={16}/></button></div></> : <><span className="eyebrow">УСЕ ПІД КОНТРОЛЕМ</span><h2 id="modal-title">Керування презентацією</h2><div className="shortcut-list">{[['→ / Page Down / Пробіл', 'Наступне запитання'], ['← / Page Up', 'Попереднє запитання'], ['Esc / Home', 'До загальної сцени'], ['1 · 2 · 3 · 4', 'Області / спільне рішення'], ['F', 'Повний екран'], ['T', 'Світла / темна тема']].map(([key, label]) => <div key={key}><span>{label}</span><kbd>{key}</kbd></div>)}</div><p>Натисніть на рівень 3D-фігури або картку місяця, щоб перейти до етапу. Кнопка «Заповнити» вмикає редагування відповіді.</p><p>Для спільної підготовки передавайте JSON через експорт та імпорт. Онлайн-синхронізації між браузерами немає.</p></>}
    </motion.div></motion.div>}</AnimatePresence>
  </div></MotionConfig>;
}
createRoot(document.getElementById('root')).render(<App/>);
