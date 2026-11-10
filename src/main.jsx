import React,{lazy,Suspense,useCallback,useEffect,useReducer,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AnimatePresence,MotionConfig,motion,useReducedMotion} from 'motion/react';
import {ArrowRight,ArrowLeft,Sun,Moon,Maximize,Minimize,Settings2,X,Download,Upload,Pencil,Check,House,Keyboard,Pause,Play,RotateCcw,List,VolumeX,Leaf,ChevronRight} from 'lucide-react';
import {STAGES,REGIONS,TABS,QUESTIONS} from './content';
import {emptyDocument,validateDocument,readLocal,exportDocument,STORAGE_KEY,completion} from './data';
import {CHAPTERS,ELEMENTS,initialSession,sessionReducer} from './presentation';
import './style.css';
const Scene=lazy(()=>import('./Scene'));
const ease=[.22,1,.36,1];
function safeSetting(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function TreeMark(){return <svg viewBox="0 0 30 38" fill="none" aria-hidden="true"><path d="M15 36V8M15 22 4 11M15 16 25 6M15 28 27 17M15 11 9 3M15 36 4 33M15 36 25 33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="15" cy="6" r="2.5" fill="currentColor"/></svg>;}
function App(){
  const reduced=useReducedMotion();
  const [session,dispatch]=useReducer(sessionReducer,undefined,initialSession);
  const [theme,setTheme]=useState(()=>safeSetting('growth-theme','dark'));
  const [region,setRegion]=useState('kharkiv'),[editing,setEditing]=useState(false),[paused,setPaused]=useState(false),[quality,setQuality]=useState(()=>safeSetting('growth-quality','high'));
  const [settings,setSettings]=useState(false),[modal,setModal]=useState(null),[incoming,setIncoming]=useState(null),[toast,setToast]=useState(''),[fullscreen,setFullscreen]=useState(false),[visible,setVisible]=useState(!document.hidden),[renderer,setRenderer]=useState('loading');
  const [data,setData]=useState(emptyDocument),[ready,setReady]=useState(false),[storageOk,setStorageOk]=useState(true);
  const fileRef=useRef(),settingsRef=useRef(),headingRef=useRef();
  const {phase,index,built,chapter}=session,current=QUESTIONS[index],stage=STAGES[current.stageIndex],intro=phase==='intro',question=phase==='question';
  const animate=!reduced&&!paused&&visible;
  const act=useCallback(action=>{dispatch(action);setEditing(false);setSettings(false);},[]);
  const next=useCallback(()=>{if(phase==='intro')act({type:'START'});else if(phase==='question')act({type:'ADVANCE'});else if(phase==='chapter')act({type:'CONTINUE'});},[phase,act]);
  const toggleTheme=useCallback(()=>setTheme(t=>t==='dark'?'light':'dark'),[]);
  const toggleFullscreen=useCallback(async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setToast('Повний екран недоступний у цьому вікні. Спробуйте F11.');}},[]);
  useEffect(()=>{const local=readLocal();if(local){setData(local);setReady(true);return;}const controller=new AbortController();fetch(`${import.meta.env.BASE_URL}data/presentation.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>{setData(validateDocument(value));setReady(true);}).catch(error=>{if(error.name!=='AbortError'){setReady(true);setToast('Відкрито порожній набір відповідей.');}});return()=>controller.abort();},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#061012':'#e9eee7';try{localStorage.setItem('growth-theme',theme);}catch{}},[theme]);
  useEffect(()=>{try{localStorage.setItem('growth-quality',quality);}catch{}},[quality]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));setStorageOk(true);}catch{setStorageOk(false);}},[data,ready]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{const f=()=>setFullscreen(!!document.fullscreenElement),v=()=>setVisible(!document.hidden);document.addEventListener('fullscreenchange',f);document.addEventListener('visibilitychange',v);return()=>{document.removeEventListener('fullscreenchange',f);document.removeEventListener('visibilitychange',v);};},[]);
  useEffect(()=>{if(phase!=='growing'||paused||!visible)return;const timer=setTimeout(()=>dispatch({type:'GROWTH_DONE'}),reduced?80:index<3?3000:3800);return()=>clearTimeout(timer);},[phase,index,paused,reduced,visible]);
  useEffect(()=>{if(!settings)return;const close=e=>{if(!settingsRef.current?.contains(e.target))setSettings(false);};window.addEventListener('pointerdown',close);return()=>window.removeEventListener('pointerdown',close);},[settings]);
  useEffect(()=>{const handle=e=>{
    if(e.key==='Escape'){if(modal||incoming){setModal(null);setIncoming(null);return;}if(settings){setSettings(false);return;}if(editing){setEditing(false);return;}act({type:'HOME'});return;}
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable||e.ctrlKey||e.metaKey||e.altKey||modal||incoming||settings)return;
    if(['ArrowRight','PageDown',' '].includes(e.key)){if(e.key===' '&&e.target.closest('button'))return;e.preventDefault();next();}
    else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();act({type:'BACK'});}
    else if(e.key==='Home'){e.preventDefault();act({type:'HOME'});}
    else if(e.key.toLowerCase()==='f')toggleFullscreen();else if(e.key.toLowerCase()==='t')toggleTheme();else if(e.key==='?')setModal('help');
    else if(['1','2','3','4'].includes(e.key)&&question){setRegion(TABS[Number(e.key)-1].id);setEditing(false);}
  };window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[act,next,modal,incoming,settings,editing,question,toggleTheme,toggleFullscreen]);
  useEffect(()=>{if(!modal&&!incoming)return;const dialog=document.querySelector('[role="dialog"]'),before=document.activeElement;dialog?.querySelector('button')?.focus();const trap=e=>{if(e.key!=='Tab')return;const items=dialog?.querySelectorAll('button,input,textarea,[href]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};window.addEventListener('keydown',trap);return()=>{window.removeEventListener('keydown',trap);before?.focus();};},[modal,incoming]);
  function update(value){setData(d=>({...d,answers:{...d.answers,[current.id]:{...d.answers[current.id],[region]:value}}}));}
  function download(){const blob=new Blob([exportDocument(data)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='growth-points-2027-answers.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Набір відповідей експортовано.');}
  async function importFile(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>500000)throw new Error('Максимальний розмір JSON — 500 КБ.');setIncoming({name:f.name,data:validateDocument(JSON.parse(await f.text()))});setSettings(false);}catch(error){setToast(error instanceof SyntaxError?'Не вдалося прочитати JSON.':error.message);}}
  const panelMotion={initial:{opacity:0,x:-25,filter:'blur(7px)'},animate:{opacity:1,x:0,filter:'blur(0px)'},exit:{opacity:0,x:-15,filter:'blur(7px)'},transition:{duration:.65,ease}};
  return <MotionConfig reducedMotion="user"><div className={`experience phase-${phase}`}>
    <div className="scene-stage"><Suspense fallback={<div className="scene-preloader"><span/><span/><span/></div>}><Scene {...{phase,index,built,theme,animate,reduced:!!reduced,quality,onRenderer:setRenderer}}/></Suspense></div>
    <div className="cinema-grain"/><div className="edge-shade"/>
    <header className="topbar">
      <button className="brand" onClick={()=>act({type:'HOME'})} aria-label="На початок"><TreeMark/><span>ТОЧКИ<br/><b>ЗРОСТАННЯ</b></span></button>
      <div className="chapter-compass" aria-label="Етапи зростання">{CHAPTERS.map((c,i)=><React.Fragment key={c.month}>{i>0&&<i/>}<span className={`${!intro&&(question||phase==='growing'?current.stageIndex:chapter)===i?'active':''}`}><small>{String(i+1).padStart(2,'0')}</small>{c.label}{c.range[1]<built.length&&<Check size={10}/>}</span></React.Fragment>)}</div>
      <div className="tools">
        <button className="icon-button" onClick={toggleTheme} aria-label={theme==='dark'?'Світла тема':'Темна тема'} title="Змінити тему · T">{theme==='dark'?<Sun/>:<Moon/>}</button>
        <button className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen?'Вийти з повного екрана':'Повний екран'}>{fullscreen?<Minimize/>:<Maximize/>}</button>
        <div ref={settingsRef} className="settings-wrap"><button className="icon-button" aria-label="Налаштування" aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><Settings2/></button>
          <AnimatePresence>{settings&&<motion.div className="settings-menu" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><span className="micro">ПРЕЗЕНТАЦІЯ</span>
            <button onClick={()=>setPaused(p=>!p)}>{paused?<Play/>:<Pause/>}{paused?'Продовжити анімацію':'Пауза анімації'}</button>
            <button onClick={()=>setQuality(q=>q==='high'?'eco':'high')}><Leaf/>{quality==='high'?'Ефекти: кінематографічні':'Ефекти: економні'}</button>
            <button onClick={()=>{setSettings(false);setModal('contents');}}><List/>Запитання й спільні рішення</button>
            <button onClick={download} disabled={!ready}><Download/>Експортувати відповіді</button>
            <button onClick={()=>fileRef.current.click()} disabled={!ready}><Upload/>Імпортувати відповіді</button>
            <button onClick={()=>{setSettings(false);setModal('help');}}><Keyboard/>Керування</button>
            <p>Відповіді зберігаються в цьому браузері. Для передачі колегам експортуйте JSON.</p>{renderer==='compatibility'&&<small>Зараз працює сумісний режим анімації.</small>}{reduced&&<small>Система обмежує рух: переходи скорочено.</small>}
          </motion.div>}</AnimatePresence>
        </div>
      </div>
    </header>
    <input type="file" accept=".json,application/json" hidden ref={fileRef} onChange={importFile}/>
    <main className="presentation-stage">
      <AnimatePresence mode="wait">
        {intro&&<motion.section key="intro" className="intro-copy" {...panelMotion}>
          <span className="intro-year">2027 <i/> НАСТУПНІ 90 ДНІВ</span>
          <h1 ref={headingRef} tabIndex={-1}>Точки<br/><em>зростання.</em></h1>
          <div className="intro-regions">{REGIONS.map(r=><span key={r.id}><i style={{background:r.color}}/>{r.label}</span>)}</div>
          <button className="primary-button start-button" onClick={next}>Почати<ArrowRight/></button>
        </motion.section>}
        {question&&<motion.section key={`question-${index}`} className="question-panel" {...panelMotion} onAnimationComplete={()=>headingRef.current?.focus({preventScroll:true})}>
          <div className="question-kicker"><span>{stage.month.toUpperCase()}</span><i/><span>{index<3?'КОРІНЬ':index<8?'ГІЛКА':'ПЛІД'} {String(current.questionIndex+1).padStart(2,'0')}</span><span className="question-number">{String(index+1).padStart(2,'0')} / 09</span></div>
          <div className="panel-scroll"><h1 ref={headingRef} tabIndex={-1}>{current.text}</h1>
            {current.detail&&<details className="question-detail"><summary>Про фокус-групи <ChevronRight size={12}/></summary><p>{current.detail}</p></details>}
            <div className="region-tabs" role="tablist" aria-label="Відповіді областей" onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const i=TABS.findIndex(t=>t.id===region),n=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;setRegion(TABS[n].id);setEditing(false);e.currentTarget.querySelectorAll('[role="tab"]')[n].focus();}}}>
              {TABS.map(t=><button role="tab" key={t.id} id={`tab-${t.id}`} aria-controls="answer-panel" aria-selected={region===t.id} tabIndex={region===t.id?0:-1} className={region===t.id?'active':''} style={{'--tab-color':t.color}} onClick={()=>{setRegion(t.id);setEditing(false);}}><i/>{t.label}{data.answers[current.id][t.id].trim()&&<Check size={10}/>}</button>)}
            </div>
            <div className={`answer-panel ${editing?'editing':''}`} role="tabpanel" id="answer-panel" aria-labelledby={`tab-${region}`}>
              <div className="answer-toolbar"><span>{region==='cluster'?'РІШЕННЯ КЛАСТЕРУ':'ВІДПОВІДЬ ОБЛАСТІ'}</span><button disabled={!ready} onClick={()=>setEditing(v=>!v)}>{editing?<Check/>:<Pencil/>}{editing?'Готово':data.answers[current.id][region]?'Редагувати':'Заповнити'}</button></div>
              {editing?<><textarea autoFocus key={`${current.id}-${region}`} maxLength={12000} value={data.answers[current.id][region]} onChange={e=>update(e.target.value)} placeholder={region==='cluster'?'Узгоджене рішення трьох областей…':current.hint} aria-label={`Відповідь: ${TABS.find(t=>t.id===region).label}`}/><div className="save-note">{storageOk?'Збережено в цьому браузері · Для передачі експортуйте JSON':'Збереження недоступне · Експортуйте JSON перед закриттям'}</div></>:data.answers[current.id][region].trim()?<div className="answer-text">{data.answers[current.id][region]}</div>:<button className="empty-answer" onClick={()=>setEditing(true)} disabled={!ready}><span className="answer-seed"/><span>Тут з’явиться ваша відповідь<small>Натисніть, щоб заповнити</small></span><Pencil size={14}/></button>}
            </div>
          </div>
          <div className="panel-bottom"><span className="element-caption"><i/>{ELEMENTS[index]}</span><button className="primary-button" onClick={next}>{built.includes(index)?'Далі':'Додати до дерева'}<ArrowRight/></button></div>
        </motion.section>}
        {phase==='growing'&&<motion.section key={`growth-${index}`} className="growth-caption" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.65}} aria-live="polite"><span className="micro">{stage.month.toUpperCase()} · {String(index+1).padStart(2,'0')}/09</span><h1>{ELEMENTS[index]}</h1><span className="growth-line"><i/></span><button onClick={()=>act({type:'GROWTH_DONE'})}>Пропустити анімацію <ArrowRight size={12}/></button></motion.section>}
        {phase==='chapter'&&<motion.section key={`chapter-${chapter}`} className="chapter-copy" {...panelMotion}><span className="chapter-eyebrow">{CHAPTERS[chapter].month} · {CHAPTERS[chapter].label}</span><h1>{CHAPTERS[chapter].title.split('\n').map((s,i)=><React.Fragment key={i}>{s}{i===0&&<br/>}</React.Fragment>)}</h1><p>{CHAPTERS[chapter].description}</p><button className="primary-button" onClick={next}>{CHAPTERS[chapter].next}<ArrowRight/></button></motion.section>}
        {phase==='finale'&&<motion.section key="finale" className="finale-copy" {...panelMotion}><span className="chapter-eyebrow">ТРИ ОБЛАСТІ · СПІЛЬНИЙ РЕЗУЛЬТАТ</span><h1>Разом<br/>вирощуємо<br/><em>спроможність.</em></h1><div className="finale-actions"><button className="primary-button" onClick={()=>setModal('contents')}>Спільні рішення<ArrowRight/></button><button className="text-button" onClick={()=>act({type:'START'})}><RotateCcw size={13}/>Від початку</button></div></motion.section>}
      </AnimatePresence>
    </main>
    <footer className="presentation-footer">
      <div className="footer-left">{intro?<span>ХАРКІВСЬКА · ЧЕРНІГІВСЬКА · СУМСЬКА</span>:<button onClick={()=>act({type:'BACK'})} disabled={phase==='growing'} aria-label="Попереднє запитання"><ArrowLeft size={14}/><span>Назад</span></button>}</div>
      {!intro&&<div className="growth-timeline" aria-label="Побудова дерева">{QUESTIONS.map((q,i)=><button key={q.id} style={{'--node-color':STAGES[q.stageIndex].color}} className={`${built.includes(i)?'built':''} ${index===i?'current':''}`} aria-label={`Запитання ${i+1}: ${q.title}`} aria-current={question&&index===i?'step':undefined} disabled={phase==='growing'||i>built.length} onClick={()=>act({type:'JUMP',index:i})}><span/></button>)}</div>}
      <div className="footer-right"><span className="built-count">{intro?'3 корені · 5 гілок · 1 плід':`${String(built.length).padStart(2,'0')} / 09`}</span><button aria-label="Керування" title="Керування · ?" onClick={()=>setModal('help')}><Keyboard size={14}/></button></div>
    </footer>
    <AnimatePresence>{toast&&<motion.div role="status" className="toast" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0,y:15}}>{toast}<button aria-label="Закрити повідомлення" onClick={()=>setToast('')}><X size={14}/></button></motion.div>}</AnimatePresence>
    <AnimatePresence>{(modal||incoming)&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>{setModal(null);setIncoming(null);}}><motion.section className={`modal ${modal==='contents'?'contents-modal':''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" aria-label="Закрити" onClick={()=>{setModal(null);setIncoming(null);}}><X/></button>
      {incoming?<><span className="micro">ІМПОРТ ВІДПОВІДЕЙ</span><h2 id="modal-title">Відкрити набір відповідей?</h2><p className="import-filename">{incoming.name}</p><p>Заповнено {completion(incoming.data).filled} із 27 відповідей областей. Цей файл замінить поточний набір у браузері.</p><div className="modal-actions"><button className="secondary-button" onClick={download}>Експортувати поточні</button><button className="primary-button" onClick={()=>{setData(incoming.data);setIncoming(null);setToast('Відповіді імпортовано.');}}>Застосувати<Check size={14}/></button></div></>:modal==='contents'?<><span className="micro">КОРІННЯ → КРОНА → ПЛІД</span><h2 id="modal-title">Спільні рішення</h2><div className="contents-stages">{STAGES.map((s,i)=><article key={s.id} style={{'--stage':s.color}}><h3><span>{s.number}</span>{s.month}</h3>{s.questions.map(q=>{const n=QUESTIONS.findIndex(v=>v.id===q.id);return <div className="contents-question" key={q.id}><button disabled={n>built.length||phase==='growing'} onClick={()=>{act({type:'JUMP',index:n});setRegion('cluster');setModal(null);}}><span>{q.title}</span><ArrowRight size={13}/></button><p>{data.answers[q.id].cluster||'Спільне рішення ще не додано.'}</p></div>;})}</article>)}</div></>:<><span className="micro">КЕРУВАННЯ ПРЕЗЕНТАЦІЄЮ</span><h2 id="modal-title">Вирощуємо крок за кроком</h2><p>Після обговорення запитання натисніть «Додати до дерева». Виросте новий елемент. Після останньої відповіді місяця сцена об’єднає їх у більшу частину дерева.</p><div className="shortcut-list">{[['→ / Page Down / Пробіл','Далі / додати елемент'],['← / Page Up','Повернутися до запитання'],['1 · 2 · 3 · 4','Області / спільне рішення'],['F','Повний екран'],['T','Тема'],['Esc / Home','На початок']].map(([key,label])=><div key={key}><span>{label}</span><kbd>{key}</kbd></div>)}</div><p>Повернення до запитань зберігає побудовані частини. «Почати» запускає нову побудову. Відповіді залишаються збереженими.</p><p>Для заповнення — кнопка «Заповнити». Для передачі колегам — експорт та імпорт JSON у налаштуваннях. Онлайн-синхронізації немає.</p></>}
    </motion.section></motion.div>}</AnimatePresence>
  </div></MotionConfig>;
}
createRoot(document.getElementById('root')).render(<App/>);
