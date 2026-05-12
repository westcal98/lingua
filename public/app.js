// ── Constants ──────────────────────────────────────────────────────────────
const SCHEMA_VERSION = 1;
const DB_NAME = 'LinguaDB';
const DB_VERSION = 1;

const LANGUAGES = [
  { code: 'es',    flag: '🇪🇸', name: 'Spanish',          native: 'Español',    persona: 'Elena',   personaDesc: 'A native speaker from Seville' },
  { code: 'es_mx', flag: '🇲🇽', name: 'Spanish (Mexico)', native: 'Español MX', persona: 'Carlos',  personaDesc: 'A native speaker from Mexico City' },
  { code: 'fr',    flag: '🇫🇷', name: 'French',           native: 'Français',   persona: 'Claire',  personaDesc: 'A native speaker from Paris' },
  { code: 'de',    flag: '🇩🇪', name: 'German',           native: 'Deutsch',    persona: 'Felix',   personaDesc: 'A native speaker from Munich' },
  { code: 'ja',    flag: '🇯🇵', name: 'Japanese',         native: '日本語',      persona: 'Yuki',    personaDesc: 'A native speaker from Tokyo' },
  { code: 'ko',    flag: '🇰🇷', name: 'Korean',           native: '한국어',      persona: 'Jisu',    personaDesc: 'A native speaker from Seoul' },
  { code: 'it',    flag: '🇮🇹', name: 'Italian',          native: 'Italiano',   persona: 'Marco',   personaDesc: 'A native speaker from Rome' },
  { code: 'pt',    flag: '🇧🇷', name: 'Portuguese',       native: 'Português',  persona: 'Ana',     personaDesc: 'A native speaker from São Paulo' },
  { code: 'zh',    flag: '🇨🇳', name: 'Mandarin',         native: '普通话',      persona: 'Wei',     personaDesc: 'A native speaker from Beijing' },
  { code: 'ar',    flag: '🇸🇦', name: 'Arabic',           native: 'العربية',    persona: 'Layla',   personaDesc: 'A native speaker from Cairo' },
  { code: 'ru',    flag: '🇷🇺', name: 'Russian',          native: 'Русский',    persona: 'Natasha', personaDesc: 'A native speaker from Moscow' },
];

const LEVELS = [
  { code: 'A1', label: 'Beginner',     color: '#22C55E' },
  { code: 'A2', label: 'Elementary',   color: '#84CC16' },
  { code: 'B1', label: 'Intermediate', color: '#F59E0B' },
  { code: 'B2', label: 'Upper-Int',    color: '#F97316' },
  { code: 'C1', label: 'Advanced',     color: '#EF4444' },
  { code: 'C2', label: 'Mastery',      color: '#A855F7' },
];

const LESSON_CATEGORIES = [
  { id: 'greetings',   icon: '👋', label: 'Greetings & Introductions' },
  { id: 'numbers',     icon: '🔢', label: 'Numbers & Time' },
  { id: 'family',      icon: '👨‍👩‍👧', label: 'Family & People' },
  { id: 'food',        icon: '🍽️', label: 'Food & Dining' },
  { id: 'travel',      icon: '✈️', label: 'Travel & Directions' },
  { id: 'shopping',    icon: '🛍️', label: 'Shopping & Money' },
  { id: 'work',        icon: '💼', label: 'Work & Career' },
  { id: 'health',      icon: '🏥', label: 'Health & Body' },
  { id: 'culture',     icon: '🎭', label: 'Culture & Society' },
  { id: 'news',        icon: '📰', label: 'News & Current Events' },
  { id: 'idioms',      icon: '🗣️', label: 'Idioms & Expressions' },
  { id: 'literature',  icon: '📚', label: 'Literature & Writing' },
];

const WRITING_PROMPTS = {
  A1: ['Describe yourself.', 'Write about your family.', 'What do you eat for breakfast?'],
  A2: ['Describe your daily routine.', 'Write about your hometown.', 'What are your hobbies?'],
  B1: ['Write about a recent trip.', 'Describe your ideal weekend.', 'What are your career goals?'],
  B2: ['Social media advantages/disadvantages.', 'A memorable life event.', 'Write about a cultural tradition.'],
  C1: ['Analyze a social/political issue.', 'Write a persuasive argument.', 'Technology and modern relationships.'],
  C2: ['Language and identity essay.', 'Argue both sides of an ethical dilemma.', 'Culture and language acquisition.'],
};

const SRS_INTERVALS = [1, 2, 4, 7, 14];

// ── State ───────────────────────────────────────────────────────────────────
let db = null;
let state = {
  profile: null,
  deck: [],
  lessons: [],
  settings: {},
};
let conversationHistory = [];
let currentWritePromptIndex = 0;
let currentLessonBrowseLevel = null;

// ── IndexedDB ───────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      ['profile', 'deck', 'lessons', 'settings'].forEach(store => {
        if (!d.objectStoreNames.contains(store)) {
          d.createObjectStore(store, { keyPath: store === 'deck' ? 'id' : 'key' });
        }
      });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbClear(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Persistence ─────────────────────────────────────────────────────────────
function saveProfile() {
  localStorage.setItem('lingua_profile', JSON.stringify(state.profile));
  idbPut('profile', { key: 'main', ...state.profile }).catch(console.error);
}

function saveDeck() {
  localStorage.setItem('lingua_deck', JSON.stringify(state.deck));
  Promise.all(state.deck.map(card => idbPut('deck', card))).catch(console.error);
}

function saveLessons() {
  localStorage.setItem('lingua_lessons', JSON.stringify(state.lessons));
  idbPut('lessons', { key: 'main', list: state.lessons }).catch(console.error);
}

function saveSettings() {
  localStorage.setItem('lingua_settings', JSON.stringify(state.settings));
  idbPut('settings', { key: 'main', ...state.settings }).catch(console.error);
}

// ── Date Helpers ─────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── XP / Level ───────────────────────────────────────────────────────────────
function addXP(amount) {
  const prevLevel = getLevelFromXP(state.profile.xp);
  state.profile.xp += amount;
  const newLevel = getLevelFromXP(state.profile.xp);
  if (newLevel !== prevLevel) {
    const lvl = LEVELS.find(l => l.code === newLevel);
    showToast(`🎉 Level up! You reached ${newLevel} — ${lvl ? lvl.label : ''}!`);
    state.profile.level = newLevel;
  }
  saveProfile();
}

function getLevelFromXP(xp) {
  const idx = Math.min(Math.floor(xp / 500), 5);
  return LEVELS[idx].code;
}

function getXPWithinLevel(xp) {
  return xp % 500;
}

// ── Streak Logic ─────────────────────────────────────────────────────────────
function updateStreak() {
  const t = today();
  if (state.profile.lastDate === t) return;
  if (state.profile.lastDate === yesterday()) {
    state.profile.streak = (state.profile.streak || 0) + 1;
  } else {
    state.profile.streak = 1;
  }
  state.profile.lastDate = t;
  saveProfile();
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(g => console.log('[Lingua] Persistent storage:', g));
  }

  db = await openDB();

  const lsProfile = localStorage.getItem('lingua_profile');
  console.log('[Lingua] Storage check: LS has data:', !!lsProfile);

  if (lsProfile) {
    console.log('[Lingua] Seeding skipped — existing data found');
    state.profile  = JSON.parse(lsProfile);
    state.deck     = JSON.parse(localStorage.getItem('lingua_deck')    || '[]');
    state.lessons  = JSON.parse(localStorage.getItem('lingua_lessons') || '[]');
    state.settings = JSON.parse(localStorage.getItem('lingua_settings') || '{}');
  } else {
    // Try IDB
    const idbProfile = await idbGet('profile', 'main');
    if (idbProfile) {
      console.log('[Lingua] Seeding skipped — existing data found');
      const { key: _k, ...profile } = idbProfile;
      state.profile  = profile;
      const deckRows = await idbGetAll('deck');
      state.deck     = deckRows;
      const lessonsRow = await idbGet('lessons', 'main');
      state.lessons  = lessonsRow ? lessonsRow.list : [];
      const settingsRow = await idbGet('settings', 'main');
      const { key: _sk, ...settings } = settingsRow || { key: 'main' };
      state.settings = settings;
      // Sync back to LS
      localStorage.setItem('lingua_profile',  JSON.stringify(state.profile));
      localStorage.setItem('lingua_deck',     JSON.stringify(state.deck));
      localStorage.setItem('lingua_lessons',  JSON.stringify(state.lessons));
      localStorage.setItem('lingua_settings', JSON.stringify(state.settings));
    } else {
      console.log('[Lingua] First install — showing language select');
      showLanguageSelect();
      return;
    }
  }

  // Schema migration
  const sv = state.profile.schemaVersion || 0;
  if (sv < SCHEMA_VERSION) {
    console.log('[Lingua] Schema v1 — no migration needed');
    state.profile.schemaVersion = SCHEMA_VERSION;
    saveProfile();
  }

  updateStreak();
  console.log(`[Lingua] Init complete — profile loaded, deck has ${state.deck.length} cards`);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  showApp();
}

// ── Views ────────────────────────────────────────────────────────────────────
function showLanguageSelect() {
  hide('view-level-select');
  hide('app-wrapper');
  show('view-language-select');

  const grid = document.getElementById('language-grid');
  grid.innerHTML = '';
  LANGUAGES.forEach((lang, i) => {
    const card = document.createElement('div');
    card.className = 'lang-card';
    card.style.animationDelay = `${i * 35}ms`;
    card.innerHTML = `<div class="lang-flag">${lang.flag}</div>
      <div class="lang-name">${lang.name}</div>
      <div class="lang-native">${lang.native}</div>`;
    card.addEventListener('click', () => selectLanguage(lang.code));
    grid.appendChild(card);
  });
}

function selectLanguage(code) {
  const lang = LANGUAGES.find(l => l.code === code);
  hide('view-language-select');

  document.getElementById('level-lang-flag').textContent  = lang.flag;
  document.getElementById('level-lang-name').textContent  = lang.name;
  show('view-level-select');

  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.style.animationDelay = `${i * 50}ms`;
    card.innerHTML = `<div class="level-dot" style="background:${lvl.color}"></div>
      <span class="level-code" style="color:${lvl.color}">${lvl.code}</span>
      <span class="level-label-text">${lvl.label}</span>`;
    card.addEventListener('click', () => selectLevel(code, lvl.code));
    grid.appendChild(card);
  });
}

function selectLevel(langCode, levelCode) {
  state.profile = {
    language: langCode,
    level: levelCode,
    xp: 0,
    streak: 1,
    lastDate: today(),
    schemaVersion: SCHEMA_VERSION,
  };
  state.deck     = [];
  state.lessons  = [];
  state.settings = {};
  saveProfile();
  saveDeck();
  saveLessons();
  saveSettings();

  hide('view-level-select');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
  showApp();
}

function showApp() {
  hide('view-language-select');
  hide('view-level-select');
  show('app-wrapper');
  navigateTo('home');
}

function navigateTo(viewName) {
  ['home','learn','talk','cards','write','stats'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === viewName ? '' : 'none';
  });
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === viewName);
  });

  if (viewName === 'home')   renderDashboard();
  if (viewName === 'learn')  renderLessonBrowser();
  if (viewName === 'talk')   renderConversationPrestart();
  if (viewName === 'cards')  renderFlashcards();
  if (viewName === 'write')  renderWriting();
  if (viewName === 'stats')  renderStats();

  updateNavBadge();
}

function show(id) { const e = document.getElementById(id); if (e) e.style.display = ''; }
function hide(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }

// ── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];

  document.getElementById('home-lang-flag').textContent  = lang.flag;
  document.getElementById('home-level-badge').textContent = state.profile.level;
  document.getElementById('home-xp').textContent         = `✨ ${state.profile.xp} XP`;

  document.getElementById('streak-count').textContent   = state.profile.streak || 0;
  const mastered = state.deck.filter(c => c.box === 5).length;
  document.getElementById('mastered-count').textContent = mastered;

  const dueCount = getDueCards().length;
  document.getElementById('quick-talk-sub').textContent   = `Chat with ${lang.persona}`;
  document.getElementById('quick-cards-sub').textContent  = dueCount > 0 ? `${dueCount} due now` : 'All caught up!';
  const badge = document.getElementById('quick-cards-badge');
  if (dueCount > 0) { badge.textContent = dueCount; badge.style.display = ''; }
  else { badge.style.display = 'none'; }

  const xpInLevel = getXPWithinLevel(state.profile.xp);
  document.getElementById('lp-level-label').textContent = `${state.profile.level} — ${lvl.label}`;
  document.getElementById('lp-xp-label').textContent    = `${xpInLevel} / 500 XP`;
  document.getElementById('lp-bar').style.width         = `${(xpInLevel / 500) * 100}%`;
}

// ── Lesson Browser ────────────────────────────────────────────────────────────
function renderLessonBrowser() {
  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  document.getElementById('learn-lang-sub').textContent = `${lang.flag} ${lang.name} curriculum`;

  if (!currentLessonBrowseLevel) currentLessonBrowseLevel = state.profile.level;

  const tabs = document.getElementById('level-tabs');
  tabs.innerHTML = '';
  LEVELS.forEach(lvl => {
    const btn = document.createElement('button');
    btn.className = `level-tab${lvl.code === currentLessonBrowseLevel ? ' active' : ''}`;
    btn.textContent = lvl.code;
    btn.addEventListener('click', () => {
      currentLessonBrowseLevel = lvl.code;
      renderLessonBrowser();
    });
    tabs.appendChild(btn);
  });

  const grid = document.getElementById('lesson-grid');
  grid.innerHTML = '';
  LESSON_CATEGORIES.forEach((cat, i) => {
    const key = `${state.profile.language}-${currentLessonBrowseLevel}-${cat.id}`;
    const done = state.lessons.includes(key);
    const card = document.createElement('div');
    card.className = `lesson-card${done ? ' completed' : ''}`;
    card.style.animationDelay = `${i * 35}ms`;
    card.innerHTML = `<div class="lesson-icon">${cat.icon}</div>
      <div class="lesson-info">
        <div class="lesson-title">${cat.label}</div>
        <div class="lesson-sub">${currentLessonBrowseLevel} · AI-Generated</div>
      </div>
      ${done ? '<div class="lesson-check">✅</div>' : ''}`;
    card.addEventListener('click', () => startLesson(cat, currentLessonBrowseLevel));
    grid.appendChild(card);
  });
}

// ── Lesson Flow ───────────────────────────────────────────────────────────────
async function startLesson(cat, level) {
  const overlay = document.getElementById('lesson-overlay');
  const content = document.getElementById('lesson-overlay-content');
  overlay.style.display = '';

  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = LEVELS.find(l => l.code === level) || LEVELS[0];

  // Phase 1: Loading
  content.innerHTML = `
    <div class="lesson-loading">
      <div class="loading-icon">${cat.icon}</div>
      <div class="loading-title">Generating your lesson…</div>
      <div class="loading-sub">Fresh AI content, just for you</div>
    </div>`;

  let lessonData;
  try {
    const res = await callAI({
      system: `You are a professional ${lang.name} language teacher. Respond ONLY with pure JSON — no markdown, no backticks, no explanations.`,
      user: `Create a '${cat.label}' lesson for ${lang.name} at ${level} (${lvl.label}) level. Return ONLY this exact JSON structure: {"title":"lesson title","intro":"1-2 engaging intro sentences","vocabulary":[{"id":"v1","word":"target word","translation":"English","pronunciation":"phonetic hint","example":"example sentence in ${lang.name}","example_translation":"English translation"}],"grammar":{"title":"grammar point title","explanation":"clear practical explanation","examples":[{"sentence":"${lang.name} example","translation":"English"}]},"exercises":[{"type":"multiple_choice","question":"Q?","options":["a","b","c","d"],"correct":0},{"type":"fill_blank","sentence":"sentence with ___ blank","answer":"missing word","hint":"part of speech"},{"type":"translate","prompt":"English phrase","answer":"${lang.name} translation"},{"type":"multiple_choice","question":"Q2?","options":["a","b","c","d"],"correct":2},{"type":"translate","prompt":"English phrase 2","answer":"${lang.name} translation 2"}],"cultural_note":"interesting cultural fact"} Include exactly 8 vocabulary items and 5 exercises. Make all content appropriate for ${level} level.`,
    });
    lessonData = typeof res === 'string' ? JSON.parse(res) : res;
  } catch (err) {
    content.innerHTML = `<div class="lesson-loading">
      <div class="loading-icon">⚠️</div>
      <div class="loading-title">Could not load lesson</div>
      <div class="loading-sub">${err.message}</div>
      <button class="btn-primary" onclick="document.getElementById('lesson-overlay').style.display='none'">Back</button>
      <button class="btn-primary" onclick="startLesson(${JSON.stringify(cat)}, '${level}')">Retry</button>
    </div>`;
    return;
  }

  showLessonVocab(content, lessonData, cat, level, lang, lvl);
}

function showLessonVocab(content, lessonData, cat, level, lang, lvl) {
  let idx = 0;
  const vocab = lessonData.vocabulary || [];
  function render() {
    const card = vocab[idx];
    content.innerHTML = `
      <div class="overlay-header">
        <button class="overlay-back" onclick="document.getElementById('lesson-overlay').style.display='none'">← Back</button>
      </div>
      <div class="lesson-phase">
        <div class="lesson-title-text">${lessonData.title || cat.label}</div>
        <div class="lesson-intro">${lessonData.intro || ''}</div>
        <div class="phase-counter">Vocabulary ${idx + 1}/${vocab.length}</div>
        <div class="phase-progress progress-bar-track">
          <div class="progress-bar-fill" style="width:${((idx+1)/vocab.length)*100}%"></div>
        </div>
        <div class="flashcard-wrap" id="fc-wrap">
          <div class="flashcard" id="fc">
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${card.word}</div>
              <div class="fc-pronunciation">${card.pronunciation ? '/' + card.pronunciation + '/' : ''}</div>
              <div class="fc-tap-hint">Tap to reveal</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <div class="fc-translation">${card.translation}</div>
              <div class="fc-example">${card.example || ''}</div>
              <div class="fc-example-en">${card.example_translation || ''}</div>
            </div>
          </div>
        </div>
        <div class="flashcard-nav">
          <button ${idx === 0 ? 'disabled' : ''} onclick="prevVocab()">← Prev</button>
          ${idx < vocab.length - 1
            ? `<button onclick="nextVocab()">Next →</button>`
            : `<button class="btn-next-green" onclick="showGrammarPhase()">Grammar →</button>`}
        </div>
      </div>`;

    document.getElementById('fc-wrap').addEventListener('click', () => {
      document.getElementById('fc').classList.toggle('flipped');
    });
  }

  window.prevVocab = () => { if (idx > 0) { idx--; render(); } };
  window.nextVocab = () => { if (idx < vocab.length - 1) { idx++; render(); } };
  window.showGrammarPhase = () => showLessonGrammar(content, lessonData, cat, level, lang, lvl);

  render();
}

function showLessonGrammar(content, lessonData, cat, level, lang, lvl) {
  const g = lessonData.grammar || {};
  const examples = (g.examples || []).map(ex => `
    <div class="grammar-example">
      <div class="grammar-sentence">${ex.sentence}</div>
      <div class="grammar-translation">${ex.translation}</div>
    </div>`).join('');

  content.innerHTML = `
    <div class="overlay-header">
      <button class="overlay-back" onclick="document.getElementById('lesson-overlay').style.display='none'">← Back</button>
    </div>
    <div class="lesson-phase">
      <div class="grammar-card">
        <div class="grammar-title">${g.title || 'Grammar'}</div>
        <div class="grammar-explanation">${g.explanation || ''}</div>
        <div class="grammar-examples">${examples}</div>
      </div>
      ${lessonData.cultural_note ? `<div class="cultural-note">${lessonData.cultural_note}</div>` : ''}
      <button class="btn-primary btn-full" onclick="showExercisesPhase()">Practice Exercises →</button>
    </div>`;

  window.showExercisesPhase = () => showLessonExercises(content, lessonData, cat, level, lang, lvl);
}

function showLessonExercises(content, lessonData, cat, level, lang, lvl) {
  const exercises = lessonData.exercises || [];
  let idx = 0;
  let score = 0;
  let answered = false;

  function renderExercise() {
    const ex = exercises[idx];
    let inner = '';

    if (ex.type === 'multiple_choice') {
      const opts = ex.options.map((opt, i) => `
        <button class="exercise-option" data-idx="${i}" onclick="checkMC(${i}, ${ex.correct})">${opt}</button>`).join('');
      inner = `<div class="exercise-question">${ex.question}</div>
        <div class="exercise-options">${opts}</div>`;
    } else if (ex.type === 'fill_blank') {
      inner = `<div class="exercise-question">${ex.sentence.replace('___', '<span style="color:var(--amber)">___</span>')}</div>
        <div class="exercise-input-wrap">
          <div class="muted" style="font-size:0.8rem">Hint: ${ex.hint || ''}</div>
          <input id="ex-input" class="exercise-input" type="text" placeholder="Fill in the blank…" oninput="toggleCheck()" autocomplete="off">
          <button id="ex-check-btn" class="btn-check" disabled onclick="checkInput('${escAttr(ex.answer)}')">Check Answer</button>
          <div id="ex-result"></div>
        </div>`;
    } else if (ex.type === 'translate') {
      inner = `<div class="exercise-question">Translate: <em>${ex.prompt}</em></div>
        <div class="exercise-input-wrap">
          <input id="ex-input" class="exercise-input" type="text" placeholder="Type your translation…" oninput="toggleCheck()" autocomplete="off">
          <button id="ex-check-btn" class="btn-check" disabled onclick="checkInput('${escAttr(ex.answer)}')">Check Answer</button>
          <div id="ex-result"></div>
        </div>`;
    }

    content.innerHTML = `
      <div class="overlay-header">
        <button class="overlay-back" onclick="document.getElementById('lesson-overlay').style.display='none'">← Back</button>
      </div>
      <div class="lesson-phase">
        <div class="phase-counter">Exercise ${idx + 1}/${exercises.length} · Score: ${score}/${idx}</div>
        <div class="phase-progress progress-bar-track">
          <div class="progress-bar-fill" style="width:${((idx+1)/exercises.length)*100}%"></div>
        </div>
        <div class="exercise-card">${inner}</div>
        <div id="next-btn-wrap"></div>
      </div>`;

    const inp = document.getElementById('ex-input');
    if (inp) inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const btn = document.getElementById('ex-check-btn');
        if (btn && !btn.disabled) btn.click();
      }
    });
    answered = false;
  }

  window.toggleCheck = () => {
    const btn = document.getElementById('ex-check-btn');
    const inp = document.getElementById('ex-input');
    if (btn && inp) btn.disabled = inp.value.trim().length === 0;
  };

  window.checkMC = (selected, correct) => {
    if (answered) return;
    answered = true;
    const opts = document.querySelectorAll('.exercise-option');
    opts.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      else if (i === selected) btn.classList.add('wrong');
    });
    if (selected === correct) score++;
    showNextBtn();
  };

  window.checkInput = (answer) => {
    if (answered) return;
    answered = true;
    const inp = document.getElementById('ex-input');
    const btn = document.getElementById('ex-check-btn');
    if (!inp) return;
    const userVal = inp.value.trim().toLowerCase().replace(/[^\w\s]/g,'');
    const correctVal = answer.trim().toLowerCase().replace(/[^\w\s]/g,'');
    const correct = userVal === correctVal;
    if (correct) { score++; inp.classList.add('correct'); }
    else { inp.classList.add('wrong'); }
    if (btn) btn.disabled = true;
    const res = document.getElementById('ex-result');
    if (res) {
      res.className = `exercise-result ${correct ? 'correct' : 'wrong'}`;
      res.textContent = correct ? '✅ Correct!' : `❌ Correct answer: ${answer}`;
    }
    showNextBtn();
  };

  function showNextBtn() {
    const wrap = document.getElementById('next-btn-wrap');
    if (!wrap) return;
    if (idx < exercises.length - 1) {
      wrap.innerHTML = `<button class="btn-primary btn-full" onclick="nextExercise()">Next →</button>`;
    } else {
      wrap.innerHTML = `<button class="btn-primary btn-full" onclick="showCompletePhase()">See Results →</button>`;
    }
  }

  window.nextExercise = () => { idx++; renderExercise(); };
  window.showCompletePhase = () => showLessonComplete(content, lessonData, cat, level, lang, lvl, score, exercises.length);

  renderExercise();
}

function showLessonComplete(content, lessonData, cat, level, lang, lvl, score, total) {
  const xpEarned = 50 + score * 10;
  const vocabCount = (lessonData.vocabulary || []).length;

  content.innerHTML = `
    <div class="overlay-header">
      <button class="overlay-back" onclick="document.getElementById('lesson-overlay').style.display='none'">← Back</button>
    </div>
    <div class="lesson-complete">
      <div class="complete-emoji">🎉</div>
      <div class="complete-title">Lesson Complete!</div>
      <div class="complete-score">Score: ${score}/${total}</div>
      <div class="xp-earned-card">
        <div class="xp-earned-num">+${xpEarned} XP</div>
        <div class="xp-earned-label">earned this lesson</div>
      </div>
      <div class="muted">${vocabCount} words added to your deck</div>
      <div class="complete-actions">
        <button class="btn-primary btn-full" onclick="saveLessonAndContinue(${JSON.stringify(lessonData).replace(/"/g,'&quot;')}, '${level}', '${cat.id}', ${xpEarned})">Save &amp; Continue</button>
        <button class="btn-ghost btn-full" onclick="document.getElementById('lesson-overlay').style.display='none'">Back</button>
      </div>
    </div>`;
}

window.saveLessonAndContinue = (lessonData, level, catId, xpEarned) => {
  const key = `${state.profile.language}-${level}-${catId}`;
  if (!state.lessons.includes(key)) {
    state.lessons.push(key);
    saveLessons();
  }

  const t = today();
  (lessonData.vocabulary || []).forEach(v => {
    const exists = state.deck.find(c => c.word === v.word && c.language === state.profile.language);
    if (!exists) {
      state.deck.push({
        id: `${v.word}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        word: v.word,
        translation: v.translation,
        pronunciation: v.pronunciation || '',
        example: v.example || '',
        example_translation: v.example_translation || '',
        box: 1,
        nextReview: t,
        language: state.profile.language,
        addedDate: t,
      });
    }
  });
  saveDeck();

  addXP(xpEarned);
  updateNavBadge();

  document.getElementById('lesson-overlay').style.display = 'none';
  renderLessonBrowser();
};

function escAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Conversation ──────────────────────────────────────────────────────────────
function renderConversationPrestart() {
  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];

  const prestart = document.getElementById('talk-prestart');
  const chat     = document.getElementById('talk-chat');
  prestart.style.display = '';
  chat.style.display = 'none';

  document.getElementById('talk-flag').textContent         = lang.flag;
  document.getElementById('talk-persona-name').textContent = lang.persona;
  document.getElementById('talk-persona-desc').textContent = lang.personaDesc;

  const levelNote = {
    A1: `Translations included for support`,
    A2: `Translations included for support`,
    B1: `All in ${lang.name}! (with hints for complex phrases)`,
    B2: `All in ${lang.name}!`,
    C1: `All in ${lang.name}!`,
    C2: `All in ${lang.name}!`,
  }[state.profile.level] || `All in ${lang.name}!`;

  document.getElementById('talk-level-note').textContent = levelNote;
  document.getElementById('chat-persona-title').textContent = `${lang.flag} ${lang.persona}`;
}

async function startConversation() {
  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];

  document.getElementById('talk-prestart').style.display = 'none';
  document.getElementById('talk-chat').style.display = '';
  const messages = document.getElementById('chat-messages');
  messages.innerHTML = '';
  conversationHistory = [];

  const systemPrompt = buildConversationSystem(lang, lvl);
  showTypingIndicator(messages);

  try {
    const reply = await callAI({
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Please greet me and start a friendly conversation.' }],
    });
    removeTypingIndicator(messages);
    conversationHistory.push({ role: 'user', content: 'Please greet me and start a friendly conversation.' });
    conversationHistory.push({ role: 'assistant', content: reply });
    appendMessage(messages, reply, 'ai');
  } catch (err) {
    removeTypingIndicator(messages);
    appendMessage(messages, `⚠️ Error: ${err.message}`, 'ai');
  }
}

function buildConversationSystem(lang, lvl) {
  return `You are ${lang.persona}, a native ${lang.name} speaker. You are having a natural, friendly conversation with someone learning ${lang.name} at ${lvl.code} (${lvl.label}) level.

LEVEL GUIDELINES — FOLLOW EXACTLY:
A1: Use very simple sentences. After every ${lang.name} sentence, add the English translation in parentheses.
A2: Mostly simple ${lang.name}. Translate key/difficult words in parentheses.
B1: Primarily ${lang.name}. Translate only complex phrases. Discuss familiar topics.
B2: Entirely ${lang.name} except rare cultural clarifications. Rich vocabulary.
C1-C2: Entirely ${lang.name}. Natural idioms. Complex topics.

CONVERSATION STYLE: Be warm, conversational, encouraging. When learner makes grammar errors, naturally use the correct form in your own response without pointing it out (unless asked). Ask follow-up questions. Keep responses to 2-4 sentences. Occasionally share cultural insights naturally. You are a friend, not a teacher — but you want them to improve.`;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];

  const messages = document.getElementById('chat-messages');
  appendMessage(messages, text, 'user');
  conversationHistory.push({ role: 'user', content: text });
  showTypingIndicator(messages);

  try {
    const reply = await callAI({
      system: buildConversationSystem(lang, lvl),
      messages: conversationHistory,
    });
    removeTypingIndicator(messages);
    conversationHistory.push({ role: 'assistant', content: reply });
    appendMessage(messages, reply, 'ai');
  } catch (err) {
    removeTypingIndicator(messages);
    appendMessage(messages, `⚠️ ${err.message}`, 'ai');
  }
}

function appendMessage(container, text, role) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator(container) {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typing-indicator';
  div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(container) {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ── Flashcards (SRS) ──────────────────────────────────────────────────────────
function getDueCards() {
  const t = today();
  return state.deck.filter(c => c.language === state.profile.language && c.nextReview <= t);
}

function renderFlashcards() {
  const container = document.getElementById('cards-content');
  const due = getDueCards();

  const leitnerCounts = [1,2,3,4,5].map(b => state.deck.filter(c => c.language === state.profile.language && c.box === b).length);
  const leitnerLabels = ['Learning','Reviewing','Familiar','Known','Mastered'];
  const leitnerSummary = leitnerCounts.map((cnt, i) => `
    <div class="leitner-row">
      <span class="leitner-box">Box ${i+1}</span>
      <span class="leitner-label">${leitnerLabels[i]}</span>
      <span class="leitner-count">${cnt}</span>
    </div>`).join('');

  if (state.deck.filter(c => c.language === state.profile.language).length === 0) {
    container.innerHTML = `
      <div class="srs-empty">
        <div class="srs-empty-icon">📭</div>
        <div class="srs-empty-title">No cards yet</div>
        <div class="muted">Complete a lesson to add vocabulary to your deck.</div>
      </div>`;
    return;
  }

  if (due.length === 0) {
    const next = state.deck.filter(c => c.language === state.profile.language)
      .map(c => c.nextReview).sort()[0];
    container.innerHTML = `
      <div class="srs-empty">
        <div class="srs-empty-icon">✨</div>
        <div class="srs-empty-title">All caught up!</div>
        <div class="muted">Next review: ${next || '—'}</div>
      </div>
      <div class="section-label" style="padding: 0 0 8px">Your Deck</div>
      <div class="leitner-summary">${leitnerSummary}</div>`;
    return;
  }

  startSRSSession(container, due, leitnerSummary);
}

function startSRSSession(container, due, leitnerSummary) {
  let idx = 0;
  let xpGained = 0;

  function renderCard() {
    const card = due[idx];
    const dots = [1,2,3,4,5].map(b => `<div class="srs-box-dot${card.box === b ? ' active' : ''}"></div>`).join('');

    container.innerHTML = `
      <div class="srs-session">
        <div class="srs-counter">${idx + 1} / ${due.length} due</div>
        <div class="phase-progress progress-bar-track">
          <div class="progress-bar-fill" style="width:${((idx+1)/due.length)*100}%"></div>
        </div>
        <div class="srs-box-indicator">${dots}</div>
        <div class="flashcard-wrap" id="fc-wrap">
          <div class="flashcard" id="fc">
            <div class="flashcard-face flashcard-front">
              <div class="fc-word">${card.word}</div>
              <div class="fc-pronunciation">${card.pronunciation ? '/' + card.pronunciation + '/' : ''}</div>
              <div class="fc-tap-hint">Tap to reveal</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <div class="fc-translation">${card.translation}</div>
              <div class="fc-example">${card.example || ''}</div>
              <div class="fc-example-en">${card.example_translation || ''}</div>
            </div>
          </div>
        </div>
        <div id="srs-rating-wrap" style="display:none" class="srs-rating">
          <button class="srs-btn again" onclick="rateCard('again')">✗ Again</button>
          <button class="srs-btn got-it" onclick="rateCard('got-it')">✓ Got It</button>
          <button class="srs-btn easy"   onclick="rateCard('easy')">★ Easy</button>
        </div>
      </div>
      <div class="section-label" style="padding: 12px 0 8px">Your Deck</div>
      <div class="leitner-summary">${leitnerSummary}</div>`;

    document.getElementById('fc-wrap').addEventListener('click', () => {
      document.getElementById('fc').classList.toggle('flipped');
      document.getElementById('srs-rating-wrap').style.display = '';
    });
  }

  window.rateCard = (rating) => {
    const card = due[idx];
    const cardInState = state.deck.find(c => c.id === card.id);
    if (!cardInState) return;

    if (rating === 'again') {
      cardInState.box = 1;
    } else {
      cardInState.box = Math.min((cardInState.box || 1) + 1, 5);
      xpGained += 5;
      addXP(5);
    }
    cardInState.nextReview = addDays(today(), SRS_INTERVALS[cardInState.box - 1]);
    saveDeck();
    updateNavBadge();

    idx++;
    if (idx < due.length) {
      renderCard();
    } else {
      container.innerHTML = `
        <div class="srs-complete">
          <div class="srs-empty-icon">🏆</div>
          <div class="srs-empty-title">Session Complete!</div>
          <div class="muted">Reviewed ${due.length} cards</div>
          <div class="xp-earned-card">
            <div class="xp-earned-num">+${xpGained} XP</div>
            <div class="xp-earned-label">from this session</div>
          </div>
          <button class="btn-primary" onclick="renderFlashcards()">Review Again</button>
        </div>`;
    }
  };

  renderCard();
}

// ── Writing Practice ──────────────────────────────────────────────────────────
function renderWriting() {
  const lang = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl  = state.profile.level;
  document.getElementById('write-lang-sub').textContent = `${lang.flag} AI feedback on your ${lang.name} writing`;

  const prompts = WRITING_PROMPTS[lvl] || WRITING_PROMPTS['B1'];
  currentWritePromptIndex = currentWritePromptIndex % prompts.length;
  document.getElementById('write-prompt-card').textContent = prompts[currentWritePromptIndex];

  const textarea = document.getElementById('write-textarea');
  const charCount = document.getElementById('write-char-count');
  const submitBtn = document.getElementById('write-submit-btn');
  const feedback  = document.getElementById('write-feedback');

  textarea.value = '';
  charCount.textContent = '0 characters';
  submitBtn.disabled = true;
  feedback.style.display = 'none';
  feedback.textContent = '';
  submitBtn.textContent = 'Get AI Feedback →';
}

async function submitWriting() {
  const lang    = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl     = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];
  const text    = document.getElementById('write-textarea').value.trim();
  const btn     = document.getElementById('write-submit-btn');
  const feedback = document.getElementById('write-feedback');

  if (text.length < 10) return;

  btn.disabled = true;
  btn.textContent = '⏳ Analyzing…';
  feedback.style.display = 'none';

  try {
    const result = await callAI({
      system: `You are an expert ${lang.name} language tutor. Be encouraging, specific, and constructive.`,
      user: `A learner at ${lvl.code} (${lvl.label}) level in ${lang.name} wrote:\n\n'${text}'\n\nProvide feedback with exactly these sections:\n✏️ CORRECTED VERSION\n[corrected text with changes in [brackets]]\n\n📝 CORRECTIONS\n[numbered list of what was wrong and why]\n\n⭐ SCORE: X/10\n[one-sentence note]\n\n💡 TIPS TO IMPROVE\n[2-3 specific actionable tips]`,
    });

    feedback.textContent = result;
    feedback.style.display = '';
    addXP(30);
    btn.textContent = 'Write Again';
    btn.disabled = false;
    btn.onclick = () => renderWriting();
  } catch (err) {
    feedback.textContent = `⚠️ Error: ${err.message}`;
    feedback.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Get AI Feedback →';
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function renderStats() {
  const lang     = LANGUAGES.find(l => l.code === state.profile.language) || LANGUAGES[0];
  const lvl      = LEVELS.find(l => l.code === state.profile.level) || LEVELS[0];
  const mastered = state.deck.filter(c => c.language === state.profile.language && c.box === 5).length;
  const learned  = state.deck.filter(c => c.language === state.profile.language).length;
  const doneLessons = state.lessons.filter(k => k.startsWith(state.profile.language + '-')).length;

  document.getElementById('stats-lang-label').textContent = `${lang.flag} ${lang.name} learning journey`;

  const statsData = [
    { value: state.profile.streak || 0, label: 'Day Streak 🔥', color: 'var(--amber)' },
    { value: state.profile.xp || 0,     label: 'Total XP',       color: 'var(--gold)' },
    { value: learned,                    label: 'Words Learned',  color: 'var(--info)' },
    { value: mastered,                   label: 'Mastered ⭐',     color: 'var(--success)' },
    { value: doneLessons,                label: 'Lessons Done',   color: '#A855F7' },
    { value: state.profile.level,        label: 'Current Level',  color: 'var(--amber)' },
  ];

  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = statsData.map(s => `
    <div class="stat-card">
      <div class="stat-value" style="color:${s.color}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  const currentIdx = LEVELS.findIndex(l => l.code === state.profile.level);
  const journey = document.getElementById('cefr-journey');
  journey.innerHTML = LEVELS.map((l, i) => {
    let circleStyle = '';
    let extra = '';
    if (i < currentIdx) {
      circleStyle = `background:${l.color}`;
      extra = '<span class="muted" style="font-size:0.75rem">✓</span>';
    } else if (i === currentIdx) {
      circleStyle = `border-color:${l.color}`;
      extra = '<span class="cefr-here">← here</span>';
    } else {
      circleStyle = '';
    }
    const cls = i < currentIdx ? 'filled' : i === currentIdx ? 'outlined' : 'future';
    return `
      <div class="cefr-row${i === currentIdx ? ' current' : ''}">
        <div class="cefr-circle ${cls}" style="${circleStyle}"></div>
        <span class="cefr-code" style="color:${i <= currentIdx ? l.color : 'var(--dim)'}">${l.code}</span>
        <span class="cefr-name">${l.label}</span>
        ${extra}
      </div>`;
  }).join('');

  const total = state.deck.filter(c => c.language === state.profile.language).length;
  const boxLabels = ['Box 1 — Learning','Box 2 — Reviewing','Box 3 — Familiar','Box 4 — Known','Box 5 — Mastered'];
  const breakdown = document.getElementById('vocab-breakdown');
  if (total === 0) {
    breakdown.innerHTML = `<div class="muted" style="font-size:0.85rem;padding:8px 0">Complete lessons to add words to your deck.</div>`;
  } else {
    breakdown.innerHTML = [1,2,3,4,5].map(b => {
      const cnt = state.deck.filter(c => c.language === state.profile.language && c.box === b).length;
      const pct = total > 0 ? (cnt / total) * 100 : 0;
      return `<div class="vb-row">
        <span class="vb-label">${boxLabels[b-1].split(' — ')[1]}</span>
        <div class="vb-track"><div class="vb-fill" style="width:${pct}%"></div></div>
        <span class="vb-count">${cnt}</span>
      </div>`;
    }).join('');
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
function openSettings() {
  show('settings-overlay');
  renderSettings();
}

function closeSettings() {
  hide('settings-overlay');
}

async function renderSettings() {
  const content = document.getElementById('settings-content');
  let storageInfo = { usage: 0, quota: 1 };
  if (navigator.storage && navigator.storage.estimate) {
    storageInfo = await navigator.storage.estimate();
  }
  const usedMB  = ((storageInfo.usage || 0) / (1024 * 1024)).toFixed(2);
  const totalMB = ((storageInfo.quota  || 0) / (1024 * 1024)).toFixed(0);
  const pct     = storageInfo.quota ? Math.min(100, ((storageInfo.usage || 0) / storageInfo.quota) * 100) : 0;

  content.innerHTML = `
    <!-- HOW TO INSTALL -->
    <div class="settings-section">
      <div class="settings-section-title">How to Install</div>
      <div class="settings-info-card">
        <h4>📱 Android</h4>Chrome → ⋮ menu → "Add to Home Screen"
        <h4 style="margin-top:10px">🍎 iOS</h4>Safari → Share → "Add to Home Screen"
        <div style="margin-top:8px;color:var(--muted);font-size:0.78rem">Use the installed app shortcut, not a browser bookmark. Avoid Brave with "Clear Data on Exit" — use Chrome instead.</div>
      </div>
    </div>

    <!-- HOW TO USE -->
    <div class="settings-section">
      <div class="settings-section-title">How to Use</div>
      <div class="settings-info-card">
        <b>📚 Learn</b> — Browse 12 lesson topics at any CEFR level. AI generates fresh content every time.<br><br>
        <b>💬 Talk</b> — Have a real conversation with a native speaker AI. Adjusts to your level automatically.<br><br>
        <b>🃏 Cards</b> — Spaced repetition flashcards. Review words added from lessons.<br><br>
        <b>✍️ Write</b> — Practice writing and get instant AI corrections, scores, and improvement tips.<br><br>
        <b>📊 Stats</b> — Track your streak, XP, mastered words, and progress through A1→C2 levels.
      </div>
    </div>

    <!-- CHANGE LANGUAGE / LEVEL -->
    <div class="settings-section">
      <div class="settings-section-title">Change Language / Level</div>
      <div class="settings-row">
        <div><div class="settings-label">Language</div></div>
        <select id="settings-lang-select" class="settings-select">
          ${LANGUAGES.map(l => `<option value="${l.code}"${l.code === state.profile.language ? ' selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Level</div></div>
        <select id="settings-level-select" class="settings-select">
          ${LEVELS.map(l => `<option value="${l.code}"${l.code === state.profile.level ? ' selected' : ''}>${l.code} — ${l.label}</option>`).join('')}
        </select>
      </div>
      <button class="btn-primary btn-full" onclick="applyLangLevelChange()" style="margin-top:10px">Apply Changes</button>
    </div>

    <!-- EXPORT / IMPORT -->
    <div class="settings-section">
      <div class="settings-section-title">Backup</div>
      <button class="btn-export" onclick="exportData()">Export My Data</button>
      <div style="margin-top:10px">
        <label class="btn-import">
          Import from JSON
          <input type="file" accept=".json" style="display:none" onchange="importData(event)">
        </label>
      </div>
    </div>

    <!-- STORAGE -->
    <div class="settings-section">
      <div class="settings-section-title">Storage</div>
      <div class="settings-info-card">
        ${usedMB} MB used of ${totalMB} MB available
        <div class="storage-bar">
          <div class="storage-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    </div>

    <!-- CHANGELOG -->
    <div class="settings-section">
      <div class="settings-section-title">What's New</div>
      <div class="changelog-list">
        <div class="changelog-item"><span class="changelog-ver">v1.0</span> — Initial release. 10 languages, A1-C2 levels, AI lessons, SRS flashcards, conversation, writing feedback, full progress tracking.</div>
      </div>
    </div>

    <!-- REMOVE ALL DATA -->
    <div class="settings-section">
      <div class="settings-section-title">Danger Zone</div>
      <button class="btn-danger" onclick="confirmRemoveData()">Remove All Data</button>
    </div>
  `;
}

window.applyLangLevelChange = () => {
  const newLang  = document.getElementById('settings-lang-select').value;
  const newLevel = document.getElementById('settings-level-select').value;

  const langChanged = newLang !== state.profile.language;
  if (langChanged) {
    if (!confirm(`Changing language will reset your vocabulary deck. Continue?`)) return;
    state.deck = [];
    state.lessons = [];
    saveDeck();
    saveLessons();
  }

  state.profile.language = newLang;
  state.profile.level    = newLevel;
  saveProfile();
  closeSettings();
  showToast('✅ Language and level updated!');
  navigateTo('home');
};

window.exportData = () => {
  const data = {
    profile:  state.profile,
    deck:     state.deck,
    lessons:  state.lessons,
    settings: state.settings,
    exportDate: today(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lingua-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importData = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('Import backup? This will overwrite your current data.')) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.profile)  { state.profile  = data.profile;  saveProfile(); }
      if (data.deck)     { state.deck     = data.deck;     saveDeck(); }
      if (data.lessons)  { state.lessons  = data.lessons;  saveLessons(); }
      if (data.settings) { state.settings = data.settings; saveSettings(); }
      closeSettings();
      showToast('✅ Data imported successfully!');
      navigateTo('home');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
};

window.confirmRemoveData = () => {
  if (!confirm('Remove ALL data? This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? All progress will be lost.')) return;
  localStorage.clear();
  Promise.all(['profile','deck','lessons','settings'].map(s => idbClear(s)))
    .then(() => { location.reload(); })
    .catch(() => location.reload());
};

// ── Nav Badge ────────────────────────────────────────────────────────────────
function updateNavBadge() {
  const due    = getDueCards().length;
  const badge  = document.getElementById('cards-nav-badge');
  if (!badge) return;
  if (due > 0) { badge.textContent = due; badge.style.display = ''; }
  else { badge.style.display = 'none'; }
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('congrats-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = '';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ── AI API ────────────────────────────────────────────────────────────────────
async function callAI({ system, user, messages }) {
  const msgs = messages || (user ? [{ role: 'user', content: user }] : []);
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system,
    messages: msgs,
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const text = data.content?.[0]?.text || '';

  // For lesson generation, strip any markdown wrappers if present
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    const lines = trimmed.split('\n');
    const start = lines.findIndex((l, i) => i > 0 || l.startsWith('```'));
    const end   = lines.lastIndexOf('```');
    if (end > start) {
      return lines.slice(start + 1, end).join('\n');
    }
  }
  return text;
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Bottom nav
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Quick action cards on dashboard
  document.addEventListener('click', e => {
    const card = e.target.closest('[data-nav]');
    if (card && card.dataset.nav) navigateTo(card.dataset.nav);
  });

  // Conversation
  document.getElementById('start-conversation-btn').addEventListener('click', startConversation);
  document.getElementById('chat-send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-back-btn').addEventListener('click', () => {
    document.getElementById('talk-chat').style.display = 'none';
    document.getElementById('talk-prestart').style.display = '';
    conversationHistory = [];
  });
  document.getElementById('chat-reset-btn').addEventListener('click', () => {
    conversationHistory = [];
    document.getElementById('chat-messages').innerHTML = '';
    startConversation();
  });
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Writing
  const textarea  = document.getElementById('write-textarea');
  const charCount = document.getElementById('write-char-count');
  const submitBtn = document.getElementById('write-submit-btn');
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
    submitBtn.disabled = len < 10;
  });
  submitBtn.addEventListener('click', submitWriting);
  document.getElementById('write-new-prompt-btn').addEventListener('click', () => {
    const lvl = state.profile.level;
    const prompts = WRITING_PROMPTS[lvl] || WRITING_PROMPTS['B1'];
    currentWritePromptIndex = (currentWritePromptIndex + 1) % prompts.length;
    document.getElementById('write-prompt-card').textContent = prompts[currentWritePromptIndex];
  });

  // Settings
  document.getElementById('settings-open-btn').addEventListener('click', openSettings);
  document.getElementById('settings-close-btn').addEventListener('click', closeSettings);
  document.getElementById('settings-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('settings-overlay')) closeSettings();
  });

  init();
});
