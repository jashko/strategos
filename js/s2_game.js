/* Геймификация и удержание внимания (под СДВГ): XP, уровни, дневные миссии, бейджи,
   фокус-спринт, «одна кнопка», гайд, библиотека кейсов. */
"use strict";

/* ---------- состояние игры ---------- */
function ginit() {
  s2init();
  if (S.s2.xp == null) S.s2.xp = 0;
  if (!S.s2.badges) S.s2.badges = {};
  if (!S.s2.quests) S.s2.quests = {};
  if (!S.s2.cases) S.s2.cases = {};
  if (S.s2.sprintBest == null) S.s2.sprintBest = 0;
}
const LEVELS = ["Новобранец", "Аналитик", "Тактик", "Стратег", "Магистр", "Гуру стратегии", "СТРАТЕГОС"];
function levelInfo() {
  ginit();
  const xp = S.s2.xp; let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = 100 * lvl; }
  return { lvl, title: LEVELS[Math.min(lvl - 1, LEVELS.length - 1)], xp, inLevel: xp - acc, need, pct: Math.round(100 * (xp - acc) / need) };
}
function showToast(msg, cls) {
  let t = document.getElementById("toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  const el = document.createElement("div"); el.className = "toast-item " + (cls || ""); el.innerHTML = msg;
  t.appendChild(el);
  setTimeout(() => { el.classList.add("show"); }, 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2200);
}
window.gxp = function (kind, ok) {
  ginit();
  const before = levelInfo().lvl;
  const base = { q: ok ? 10 : 3, card: 6, trap: ok ? 8 : 3, auth: ok ? 6 : 2, case: 12, ai: 15, sprint: 0 }[kind] || 5;
  S.s2.xp += base;
  questBump(kind);
  save();
  const after = levelInfo();
  if (after.lvl > before) { showToast(`🎉 Уровень ${after.lvl}: <b>${after.title}</b>!`, "lvl"); }
  else if (base >= 10) { showToast(`+${base} XP`, "xp"); }
  checkBadges();
  updateXpBar();
};
function updateXpBar() {
  const el = document.getElementById("xp-mini"); if (!el) return;
  const L = levelInfo();
  el.innerHTML = `<div class="xp-lvl">⭐ ${L.lvl} · ${esc(L.title)}</div><div class="xp-track"><i style="width:${L.pct}%"></i></div>`;
}

/* ---------- дневные миссии ---------- */
const QUEST_DEFS = [
  { id: "q", label: "Ответь на 12 вопросов", target: 12, xp: 50, hash: "s2practice", icon: "🧠" },
  { id: "card", label: "Повтори 15 карточек", target: 15, xp: 40, hash: "today", icon: "🗓" },
  { id: "trap", label: "Пройди 6 trap-drills", target: 6, xp: 35, hash: "traps", icon: "🎯" },
  { id: "case", label: "Разбери 2 кейса", target: 2, xp: 35, hash: "s2cases", icon: "🏢" },
  { id: "auth", label: "Дрилл авторов: 8 верных", target: 8, xp: 30, hash: "s2authors", icon: "🏷" }
];
function ensureQuests() {
  ginit(); const d = todayStr();
  if (!S.s2.quests[d]) {
    const n = QUEST_DEFS.length, start = parseInt(d.replace(/-/g, ""), 10) % n;
    const pick = [0, 1, 2].map(i => QUEST_DEFS[(start + i) % n]);
    S.s2.quests[d] = pick.map(q => ({ id: q.id, label: q.label, target: q.target, xp: q.xp, hash: q.hash, icon: q.icon, prog: 0, done: false }));
    // подчистить старые дни
    Object.keys(S.s2.quests).forEach(k => { if (k !== d) delete S.s2.quests[k]; });
    save();
  }
  return S.s2.quests[d];
}
function questBump(kind) {
  const qs = ensureQuests(); let changed = false;
  qs.forEach(q => {
    if (q.id === kind && !q.done) {
      q.prog++; changed = true;
      if (q.prog >= q.target) { q.done = true; S.s2.xp += q.xp; showToast(`✅ Миссия выполнена: <b>+${q.xp} XP</b>`, "quest"); }
    }
  });
  if (changed) save();
}

/* ---------- бейджи ---------- */
const BADGES = [
  { id: "first_exam", icon: "💀", name: "Первый бой", desc: "Пройти пробный экзамен" },
  { id: "streak7", icon: "🔥", name: "Неделя огня", desc: "7 дней подряд" },
  { id: "q100", icon: "💯", name: "Сотня", desc: "100 ответов" },
  { id: "all_themes", icon: "🗺", name: "Картограф", desc: "Затронуть все 12 тем" },
  { id: "sprint15", icon: "⚡", name: "Молния", desc: "15+ за фокус-спринт" },
  { id: "case10", icon: "🏢", name: "Кейс-хантер", desc: "Разобрать 10 кейсов" },
  { id: "lvl5", icon: "🧠", name: "Магистр", desc: "Достичь 5 уровня" },
  { id: "ai_used", icon: "🤖", name: "На проверку", desc: "Сдать ответ на AI-оценку" }
];
function earn(id) { ginit(); if (!S.s2.badges[id]) { S.s2.badges[id] = todayStr(); const b = BADGES.find(x => x.id === id); if (b) showToast(`🏅 Бейдж: <b>${b.icon} ${b.name}</b>`, "badge"); save(); } }
function checkBadges() {
  const totalAns = Object.values(S.s2.q || {}).reduce((s, x) => s + x.r + x.w, 0);
  if (totalAns >= 100) earn("q100");
  if (streakDays() >= 7) earn("streak7");
  const themes = new Set(Object.values(S.s2.q || {}).map(x => x.topic)); if (themes.size >= 12) earn("all_themes");
  if (Object.keys(S.s2.cases || {}).length >= 10) earn("case10");
  if (levelInfo().lvl >= 5) earn("lvl5");
  if ((S.s2.exams || []).length >= 1) earn("first_exam");
}

/* ---------- одна кнопка: что делать дальше ---------- */
function nextAction() {
  ginit();
  if (S.s2.xp === 0 && !Object.keys(S.s2.q).length) return { label: "Прочитай гайд (2 мин)", hash: "guide", why: "Старт: как тут всё устроено" };
  const due = (typeof srsDue === "function") ? srsDue().length : 0;
  if (due >= 5) return { label: `Повтори ${due} карточек`, hash: "today", why: "По кривой забывания — пора" };
  const q = ensureQuests().find(x => !x.done);
  if (q) return { label: q.label, hash: q.hash, why: "Дневная миссия" };
  // слабейшая тема
  let weak = null, acc = 2;
  S2.THEMES.forEach(t => { const s = themeStats(t.id); if (s.n >= 2 && s.acc < acc) { acc = s.acc; weak = t.id; } });
  if (weak) return { label: `Добей слабую тему: ${S2.themeById(weak).short}`, action: `App2.startPractice({topic:${weak}})`, why: "Самый низкий % верных" };
  if (!(S.s2.exams || []).length) return { label: "Пройди пробный экзамен", hash: "examhub", why: "Проверь себя по формату" };
  return { label: "Фокус-спринт 5 минут", hash: "sprint", why: "Быстрый разогрев" };
}
window.App4 = window.App4 || {};
App4.go = function () { const a = nextAction(); if (a.action) { /* eslint-disable no-eval */ (0, eval)(a.action); } else location.hash = a.hash; };

/* ---------- ГАЙД ---------- */
routes.guide = () => {
  ginit();
  const a = nextAction();
  $("#main").innerHTML = `
  <h1 class="view-title">🚀 Как заниматься (старт за 2 минуты)</h1>
  <div class="view-sub">Коротко и по делу: куда нажимать, в каком порядке и как сделать так, чтобы реально запомнилось.</div>

  <div class="card" style="border-color:var(--acc);margin-bottom:14px">
    <b>👇 Не знаешь, с чего начать? Жми одну кнопку — она сама выберет лучшее действие сейчас.</b>
    <div class="mt16"><button class="btn" onclick="App4.go()">▶ ${esc(a.label)}</button> <span class="tiny muted">${esc(a.why)}</span></div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <b>🧭 Маршрут подготовки (повторяй цикл)</b>
    <ol style="margin:10px 0 0 20px;line-height:2;font-size:14.5px">
      <li><b>🗓 Сегодня</b> — каждый день начинай отсюда: повтори карточки по кривой забывания (5–10 мин).</li>
      <li><b>📖 Концепции</b> — новую тему изучай через активное вспоминание: сначала вспомни, потом раскрой.</li>
      <li><b>🎯 Trap-drills</b> + <b>⚖️ Сравнения</b> — тренируй различение похожих концепций (это главный навык экзамена).</li>
      <li><b>🧠 Тренировка</b> — прогоняй вопросы по теме, читай разбор КАЖДОГО неверного варианта.</li>
      <li><b>🏢 Кейсы</b> + <b>🏷 Авторы</b> — учись применять концепции к реальным компаниям и помнить авторов.</li>
      <li><b>✍️ Открытые ч.4</b> — пиши развёрнутые ответы и сдавай на жёсткую AI-проверку (48% оценки!).</li>
      <li><b>💀 Экзамен</b> — раз в несколько дней полная симуляция на 90 минут.</li>
    </ol>
  </div>

  <div class="grid g2" style="margin-bottom:14px">
    <div class="card"><b>⚡ Режим под СДВГ (короткими рывками)</b>
      <ul style="margin:10px 0 0 18px;line-height:1.9;font-size:14px">
        <li>Не сиди час. Делай <b>5-минутный Фокус-спринт</b> — быстрые вопросы на время.</li>
        <li>Каждый день — <b>3 коротких миссии</b> (видны на Штабе). Закрыл → дофамин + XP.</li>
        <li>Копи <b>XP и уровни</b>, лови <b>бейджи</b>, держи <b>серию 🔥</b>.</li>
        <li>Меняй режимы: надоело читать — иди в спринт или trap-drills.</li>
      </ul>
      <button class="btn sm mt16" onclick="location.hash='sprint'">⚡ Запустить фокус-спринт</button>
    </div>
    <div class="card"><b>🧠 Почему это запоминается (а не «прочитал и забыл»)</b>
      <ul style="margin:10px 0 0 18px;line-height:1.9;font-size:14px">
        <li><b>Активное вспоминание</b>: сначала достаёшь из памяти сам — потом проверяешь.</li>
        <li><b>Спейсинг</b>: повторения по кривой забывания (1→3→7+ дней).</li>
        <li><b>Различение</b>: trap-drills и сравнения ставят похожие концепции рядом.</li>
        <li><b>Применение</b>: кейсы и открытые вопросы переводят теорию в навык.</li>
      </ul>
    </div>
  </div>

  <div class="card">
    <b>🎓 Формат экзамена (держи в голове)</b>
    <div class="tiny muted mt8">90 минут · 100 баллов · 4 части: 12 одиночных (24 б) + 6 множественных all-or-nothing (12 б) + 8 «впиши понятие» (16 б) + 4 открытых кейса (48 б). Оценка: 96–100→10, 90–95→9, 80–89→8, 75–79→7, 70–74→6, 60–69→5, 50–59→4. Экзамен оценивает РАЗЛИЧЕНИЕ похожих концепций и УКАЗАНИЕ АВТОРОВ.</div>
  </div>`;
};

/* ---------- ФОКУС-СПРИНТ ---------- */
let sprint = null;
routes.sprint = () => {
  if (sprint) return renderSprint();
  ginit();
  $("#main").innerHTML = `
  <h1 class="view-title">⚡ Фокус-спринт</h1>
  <div class="view-sub">5 минут, быстрые вопросы, мгновенный отклик. Идеально, когда трудно сосредоточиться надолго. Держи комбо!</div>
  <div class="card">
    <div class="stat-row" style="grid-template-columns:1fr 1fr;margin-bottom:0">
      <div class="stat"><div class="v">5:00</div><div class="l">на таймере</div></div>
      <div class="stat"><div class="v" style="color:var(--warn)">${S.s2.sprintBest}</div><div class="l">твой рекорд</div></div>
    </div>
    <p class="mt16">Отвечай как можно быстрее. Верный ответ = очко и +комбо. Поехали!</p>
    <button class="btn mt16" onclick="App4.startSprint()">⚡ Старт</button>
  </div>`;
};
function renderSprint() {
  const q = sprint.q;
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="exam-bar">
      <b>⚡ Спринт</b>
      <span>Очки: <b style="color:var(--acc2)">${sprint.score}</b> · Комбо: <b style="color:var(--warn)">${sprint.combo}🔥</b></span>
      <span class="timer ${sprint.remain < 30 ? "low" : ""}" id="sprint-timer">${fmt2(sprint.remain)}</span>
    </div>
    <div class="q-card">
      <div class="q-meta"><span class="pill">тема ${q.topic}</span></div>
      <div class="q-text">${esc(q.stem)}</div>
      ${q.options.map((o, i) => `<button class="opt" id="sp-${i}" onclick="App4.sprintAnswer(${i})">${"АБВГД"[i]}. ${esc(o)}</button>`).join("")}
    </div>
    <div class="tiny muted" style="text-align:center">быстрее → больше очков · <a onclick="App4.endSprint()" style="cursor:pointer">закончить</a></div>
  </div>`;
}
function sprintTick() {
  if (!sprint) return;
  sprint.remain--;
  const t = document.getElementById("sprint-timer"); if (t) { t.textContent = fmt2(sprint.remain); t.classList.toggle("low", sprint.remain < 30); }
  if (sprint.remain <= 0) return App4.endSprint();
  sprint.timer = setTimeout(sprintTick, 1000);
}
App4.startSprint = function () {
  const pool = ALL2().filter(q => q.part === 1);
  sprint = { queue: shuffle(pool), i: 0, score: 0, combo: 0, remain: 300, locked: false };
  sprint.q = sprint.queue[0];
  location.hash = "sprint"; renderSprint(); sprintTick();
};
App4.sprintAnswer = function (i) {
  if (!sprint || sprint.locked) return;
  sprint.locked = true;
  const q = sprint.q, ok = i === q.correct;
  const sel = document.getElementById("sp-" + i); if (sel) sel.classList.add(ok ? "sel-ok" : "sel-no");
  if (!ok) { const c = document.getElementById("sp-" + q.correct); if (c) c.classList.add("sel-ok"); }
  if (ok) { sprint.score++; sprint.combo++; } else { sprint.combo = 0; }
  s2Record(q.id, q.topic, 1, ok);
  setTimeout(() => {
    if (!sprint) return;
    sprint.i++; if (sprint.i >= sprint.queue.length) sprint.i = 0;
    sprint.q = sprint.queue[sprint.i]; sprint.locked = false;
    if (sprint.remain > 0) renderSprint();
  }, ok ? 450 : 1100);
};
App4.endSprint = function () {
  if (!sprint) return;
  clearTimeout(sprint.timer);
  const score = sprint.score;
  if (score > S.s2.sprintBest) S.s2.sprintBest = score;
  S.s2.xp += score * 5; if (score >= 15) earn("sprint15");
  save(); updateXpBar(); checkBadges();
  $("#main").innerHTML = `<div class="q-wrap"><div class="card result-hero">
    <div class="big" style="color:var(--acc2)">${score}</div>
    <div class="sub">очков за спринт · +${score * 5} XP${score >= S.s2.sprintBest ? " · 🏆 новый рекорд!" : ""}</div>
    <div class="mt16" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" onclick="App4.startSprint()">⚡ Ещё спринт</button><button class="btn ghost" onclick="location.hash='examhub'">В хаб</button></div>
  </div></div>`;
  sprint = null;
};

/* ---------- БИБЛИОТЕКА КЕЙСОВ ---------- */
const caseOpen = {};
routes.s2cases = (arg) => {
  ginit();
  if (arg === "random") { const c = S2.CASES[Math.floor(Math.random() * S2.CASES.length)]; caseOpen[c.id] = false; return renderCaseFocus(c.id); }
  const byT = {};
  S2.CASES.forEach(c => { (byT[c.topic] = byT[c.topic] || []).push(c); });
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">🏢 Библиотека кейсов</h1>
  <div class="view-sub">${S2.CASES.length} реальных кейсов (мир + Россия) сверх статей. Препод может спросить про любой — тренируйся: прочитай ситуацию, назови концепции и авторов, потом проверь.</div>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <button class="btn sm" onclick="location.hash='s2cases/random'">🎲 Случайный кейс</button>
  </div>
  ${S2.THEMES.map(t => byT[t.id] ? `
    <div style="margin:18px 0 8px;font-weight:800;color:var(--tx2)">${t.id}. ${esc(t.title)}</div>
    ${byT[t.id].map(c => caseCard(c)).join("")}` : "").join("")}`;
  reattachCases();
};
function caseCard(c) {
  const open = caseOpen[c.id];
  return `<div class="concept-card ${open ? "open" : ""}" id="case-${c.id}">
    <div class="cc-head" onclick="App4.revealCase('${c.id}')">
      <div style="flex:1"><div class="cc-name">${c.tag} ${esc(c.company)}</div></div>
      <span class="cc-toggle">${open ? "−" : "💭"}</span>
    </div>
    <div class="cc-body" style="${open ? "" : "display:none"}">
      <div class="block block-def"><div class="block-t">Ситуация</div><p>${esc(c.situation)}</p></div>
      ${open ? `<div class="block block-ex"><div class="block-t">🎯 Какие концепции применить</div><p>${fmt(c.analysis)}</p></div>
      <div class="hook"><span class="hook-ic">💡</span><div><b>Запомни:</b> ${esc(c.lesson)}</div></div>` : `<div class="cc-recall">Назови: <b>какие концепции и авторы</b> сюда подходят — потом проверь.</div>`}
    </div>`;
}
function reattachCases() {/* no-op, inline handlers */}
function renderCaseFocus(id) {
  const c = S2.CASES.find(x => x.id === id); caseOpen[id] = true;
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='s2cases'">← все кейсы</div>
  <h1 class="view-title" style="font-size:21px">${c.tag} ${esc(c.company)}</h1>
  <div class="case-context">${esc(c.situation)}</div>
  <div class="card"><b>🎯 Какие концепции применить</b><p class="mt8">${fmt(c.analysis)}</p>
    <div class="hook mt16"><span class="hook-ic">💡</span><div><b>Запомни:</b> ${esc(c.lesson)}</div></div></div>
  <div class="mt16"><button class="btn" onclick="location.hash='s2cases/random'">🎲 Ещё случайный</button> <button class="btn ghost" onclick="location.hash='s2cases'">Все кейсы</button></div>`;
  if (!S.s2.cases[id]) { S.s2.cases[id] = 1; if (window.gxp) gxp("case", true); }
}
App4.revealCase = function (id) {
  caseOpen[id] = !caseOpen[id];
  if (caseOpen[id] && !S.s2.cases[id]) { S.s2.cases[id] = 1; if (window.gxp) gxp("case", true); }
  routes.s2cases();
  const el = document.getElementById("case-" + id); if (el) el.scrollIntoView({ block: "center" });
};

/* инициализация бейджей/баров при загрузке */
ginit(); ensureQuests();
navigate();
