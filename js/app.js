/* СТРАТЕГОС — движок приложения */
"use strict";

/* ---------- утилиты ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// перемешиваем варианты ответа при каждом показе, чтобы не запоминалась позиция
const prepQ = q => { const idx = shuffle([0, 1, 2, 3]); return Object.assign({}, q, { o: idx.map(i => q.o[i]), a: idx.indexOf(q.a) }); };
const todayStr = () => new Date().toISOString().slice(0, 10);
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return one; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few; return many; };

const MODULES = window.DATA_MODULES;
const QUESTIONS = window.DATA_QUESTIONS;
const CARDS = window.DATA_CARDS;
const CASES = window.DATA_CASES;
const modById = id => MODULES.find(m => m.id === id);
const conceptById = id => { for (const m of MODULES) { const c = m.concepts.find(c => c.id === id); if (c) return { ...c, mod: m }; } return null; };

/* ---------- состояние ---------- */
const DEFAULT_STATE = { answers: {}, cards: {}, exams: [], activity: {}, examDate: "", tutor: { key: "", model: "claude-sonnet-4-6", mode: "teacher", history: [] }, conceptsOpen: {} };
let S;
function loadState() {
  try { S = Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem("strategos_v1") || "{}")); }
  catch (e) { S = JSON.parse(JSON.stringify(DEFAULT_STATE)); }
  S.tutor = Object.assign({}, DEFAULT_STATE.tutor, S.tutor || {});
}
function save() { localStorage.setItem("strategos_v1", JSON.stringify(S)); }
function touchActivity(kind) { const d = todayStr(); S.activity[d] = (S.activity[d] || 0) + 1; save(); renderStreak(); }

function recordAnswer(q, correct) {
  const a = S.answers[q.id] || { r: 0, w: 0 };
  if (correct) a.r++; else a.w++;
  a.last = Date.now(); a.lastOk = correct;
  S.answers[q.id] = a; touchActivity("q"); save();
  if (window.trackDaily) trackDaily(correct);
}

/* ---------- прогресс ---------- */
function moduleStats(mid) {
  const qs = QUESTIONS.filter(q => q.m === mid);
  let seen = 0, r = 0, w = 0, lastOkSeen = 0;
  qs.forEach(q => { const a = S.answers[q.id]; if (a) { seen++; r += a.r; w += a.w; if (a.lastOk) lastOkSeen++; } });
  const acc = (r + w) ? r / (r + w) : 0;
  const coverage = qs.length ? seen / qs.length : 0;
  // готовность модуля: точность × вес покрытия (покрытие < 60% занижает уверенность)
  const score = Math.round(100 * acc * Math.min(1, coverage / 0.6 * 0.55 + 0.45 * (coverage >= 0.6 ? 1 : coverage / 0.6)));
  return { total: qs.length, seen, r, w, acc, coverage, score: (seen ? score : 0) };
}
function readiness() {
  const sts = MODULES.map(m => moduleStats(m.id));
  const avg = sts.reduce((s, x) => s + x.score, 0) / sts.length;
  return Math.round(avg);
}
function gradeFor(pct) { // шкала курса (Лекция 1)
  if (pct >= 96) return 10; if (pct >= 90) return 9; if (pct >= 80) return 8; if (pct >= 75) return 7;
  if (pct >= 70) return 6; if (pct >= 60) return 5; if (pct >= 50) return 4; if (pct >= 40) return 3; if (pct >= 30) return 2; return 1;
}
function weakConcepts(limit = 6) {
  const byConcept = {};
  QUESTIONS.forEach(q => {
    const a = S.answers[q.id]; if (!a || !q.concept) return;
    const k = q.concept; byConcept[k] = byConcept[k] || { r: 0, w: 0 };
    byConcept[k].r += a.r; byConcept[k].w += a.w;
  });
  return Object.entries(byConcept)
    .map(([cid, v]) => ({ cid, ...v, acc: v.r / (v.r + v.w), n: v.r + v.w }))
    .filter(x => x.n >= 2 && x.acc < 0.75)
    .sort((a, b) => a.acc - b.acc).slice(0, limit);
}
function streakDays() {
  let n = 0; const d = new Date();
  if (!S.activity[todayStr()]) d.setDate(d.getDate() - 1); // допускаем «сегодня ещё не занимался»
  while (true) { const k = d.toISOString().slice(0, 10); if (S.activity[k]) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function renderStreak() {
  const n = streakDays(); const el = $("#streak-box");
  if (el) el.innerHTML = n > 0 ? `🔥 Серия: <b>${n} ${plural(n, "день", "дня", "дней")}</b> подряд` : `Начни серию — занимайся каждый день 🔥`;
  const due = cardsDue().length; const b = $("#cards-due-badge"); if (b) b.textContent = due > 0 ? due : "";
}

/* ---------- карточки (SM-2 lite) ---------- */
function cardState(id) { return S.cards[id] || { ease: 2.5, ivl: 0, due: 0, reps: 0 }; }
function cardsDue() { const now = Date.now(); return CARDS.filter(c => { const st = S.cards[c.id]; return st && st.due <= now; }); }
function cardsNew() { return CARDS.filter(c => !S.cards[c.id]); }
function rateCard(card, grade) { // 1 снова · 3 сложно · 4 хорошо · 5 легко
  const st = cardState(card.id); const day = 86400000;
  if (grade === 1) { st.ivl = 0; st.due = Date.now() + 10 * 60000; }
  else {
    st.ease = Math.max(1.3, st.ease + (grade === 3 ? -0.15 : grade === 5 ? 0.12 : 0));
    if (st.reps === 0 || st.ivl === 0) st.ivl = grade === 5 ? 3 : 1;
    else st.ivl = Math.round(st.ivl * (grade === 3 ? 1.25 : st.ease));
    st.due = Date.now() + st.ivl * day;
  }
  st.reps++; S.cards[card.id] = st; touchActivity("card"); save();
}

/* ---------- роутер ---------- */
const routes = {};
function navigate() {
  const hash = (location.hash || "#dashboard").slice(1);
  const [view, arg] = hash.split("/");
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
  (routes[view] || routes.dashboard)(arg);
  window.scrollTo(0, 0);
  renderStreak();
}
window.addEventListener("hashchange", navigate);

/* ---------- ШТАБ ---------- */
routes.dashboard = () => {
  const rd = readiness();
  const grade = gradeFor(rd);
  const totalAns = Object.values(S.answers).reduce((s, a) => s + a.r + a.w, 0);
  const totalR = Object.values(S.answers).reduce((s, a) => s + a.r, 0);
  const acc = totalAns ? Math.round(100 * totalR / totalAns) : 0;
  const learned = Object.values(S.cards).filter(c => c.ivl >= 3).length;
  const lastExam = S.exams[S.exams.length - 1];
  const daysToExam = S.examDate ? Math.ceil((new Date(S.examDate) - new Date(todayStr())) / 86400000) : null;
  const ringColor = rd >= 80 ? "var(--acc2)" : rd >= 55 ? "var(--warn)" : "var(--bad)";
  const circ = 2 * Math.PI * 66;

  const weak = weakConcepts();
  const due = cardsDue().length, fresh = cardsNew().length;

  $("#main").innerHTML = `
  <h1 class="view-title">Штаб подготовки</h1>
  <div class="view-sub">Экзамен по стратегическому менеджменту · ${daysToExam !== null ? (daysToExam > 0 ? `до экзамена <b>${daysToExam} ${plural(daysToExam, "день", "дня", "дней")}</b>` : daysToExam === 0 ? "<b>экзамен сегодня — удачи! ⚔️</b>" : "экзамен позади 🎉") : "укажи дату экзамена ниже"}</div>

  <div class="dash-top">
    <div class="card ready-card">
      <div class="ring">
        <svg width="160" height="160"><circle cx="80" cy="80" r="66" stroke="var(--bg3)" stroke-width="13" fill="none"/>
        <circle cx="80" cy="80" r="66" stroke="${ringColor}" stroke-width="13" fill="none" stroke-linecap="round" stroke-dasharray="${(circ * rd / 100).toFixed(1)} ${circ.toFixed(1)}"/></svg>
        <div class="val"><b>${rd}%</b><span>готовность</span></div>
      </div>
      <div class="forecast">Прогноз оценки сейчас: <b>${rd > 0 ? grade + "/10" : "—"}</b><br><span class="tiny">шкала курса: 10 = 96–100%, 8 = 80–89%, порог = 50%</span></div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b>Готовность по модулям</b><span class="tiny muted">клик — к изучению</span></div>
      <div class="mod-bars">
        ${MODULES.map(m => { const st = moduleStats(m.id); return `
          <div class="mod-bar" onclick="location.hash='learn/${m.id}'">
            <div>${m.icon}</div>
            <div class="nm">${m.num}. ${esc(m.title)}</div>
            <div class="bar"><i style="width:${st.score}%;background:${m.color}"></i></div>
            <div class="pc">${st.seen ? st.score + "%" : "—"}</div>
          </div>`; }).join("")}
      </div>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat"><div class="v">${totalAns}</div><div class="l">ответов дано · точность ${acc}%</div></div>
    <div class="stat"><div class="v">${learned}/${CARDS.length}</div><div class="l">карточек закреплено</div></div>
    <div class="stat"><div class="v">${due}</div><div class="l">карточек к повторению (${fresh} новых)</div></div>
    <div class="stat"><div class="v">${lastExam ? Math.round(100 * lastExam.score / lastExam.total) + "%" : "—"}</div><div class="l">последний пробный экзамен${lastExam ? " · оценка " + gradeFor(Math.round(100 * lastExam.score / lastExam.total)) : ""}</div></div>
  </div>

  <div class="quick">
    <a href="#quiz"><div class="qi">🎯</div><div class="qt">Тест по модулю</div><div class="qd">10 вопросов с мгновенным разбором</div></a>
    <a href="#maze"><div class="qi">🌀</div><div class="qt">Лабиринт</div><div class="qd">адаптивная тренировка по слабым местам</div></a>
    <a href="#exam"><div class="qi">💀</div><div class="qt">Режим «Ночной кошмар»</div><div class="qd">36 вопросов · 54 минуты · как на экзамене</div></a>
  </div>

  <div class="grid g2 mt16">
    <div class="card">
      <b>⚠️ Слабые места</b>
      <div class="weak-list mt8">
        ${weak.length ? weak.map(wc => { const c = conceptById(wc.cid); return `
          <div class="weak-item"><span>${c ? esc(c.name) : wc.cid} <span class="tiny muted">(${c ? esc(c.mod.title) : ""})</span></span>
          <span class="pill" style="color:var(--bad)">${Math.round(wc.acc * 100)}%</span></div>`; }).join("")
        : `<div class="muted tiny">Пока нет данных — пройди пару тестов, и здесь появится карта твоих пробелов.</div>`}
      </div>
    </div>
    <div class="card">
      <b>⚙️ Настройки</b>
      <div class="exam-date-row mt8">
        <label class="tiny muted">Дата экзамена:</label>
        <input type="date" id="exam-date" value="${esc(S.examDate)}">
        <button class="btn sm ghost" onclick="App.saveExamDate()">Сохранить</button>
      </div>
      <div class="tiny muted mt8">Прогресс хранится локально в браузере. ${S.exams.length} ${plural(S.exams.length, "симуляция", "симуляции", "симуляций")} экзамена пройдено.</div>
      <div class="mt8"><button class="btn sm bad" onclick="App.resetAll()">Сбросить весь прогресс</button></div>
    </div>
  </div>`;
};

/* ---------- УЧИТЬ ---------- */
routes.learn = (mid) => {
  if (mid) return renderModule(mid);
  $("#main").innerHTML = `
  <h1 class="view-title">Изучение</h1>
  <div class="view-sub">12 модулей = 12 лекций курса. В каждом концепте — уровни глубины: определение → разбор → применение → критика → ловушка на экзамене.</div>
  <div class="mod-grid">
    ${MODULES.map(m => { const st = moduleStats(m.id); return `
      <div class="mod-card" onclick="location.hash='learn/${m.id}'">
        <div class="stripe" style="background:${m.color}"></div>
        <div class="ico">${m.icon}</div>
        <h3>${m.num}. ${esc(m.title)}</h3>
        <div class="sub">${esc(m.subtitle)}</div>
        <div class="meta">
          <span class="pill">${m.concepts.length} ${plural(m.concepts.length, "концепт", "концепта", "концептов")}</span>
          <span class="pill">${QUESTIONS.filter(q => q.m === m.id).length} вопросов</span>
          ${st.seen ? `<span class="pill" style="color:${m.color}">готовность ${st.score}%</span>` : ""}
        </div>
      </div>`; }).join("")}
  </div>`;
};

function renderModule(mid) {
  const m = modById(mid); if (!m) { location.hash = "learn"; return; }
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='learn'">← все модули</div>
  <h1 class="view-title">${m.icon} ${m.num}. ${esc(m.title)}</h1>
  <div class="view-sub">${esc(m.subtitle)} · <span class="tiny">${esc(m.authors)}</span></div>
  <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
    <button class="btn sm" onclick="App.startQuiz('${m.id}')">🎯 Тест по модулю</button>
    <button class="btn sm ghost" onclick="location.hash='tutor'">🤖 Обсудить с тренером</button>
  </div>
  ${m.concepts.map(c => `
    <div class="concept" id="cc-${c.id}">
      <div class="concept-head" onclick="App.toggleConcept('${c.id}')">
        <div><div class="t">${esc(c.name)}</div><div class="en">${esc(c.en)}</div></div>
        <div class="chev">▶</div>
      </div>
      <div class="concept-body">
        <div class="author-line">📖 ${esc(c.author)}</div>
        <div class="lvl"><div class="lvl-tag">Суть одной фразой</div><p>${esc(c.def)}</p></div>
        <div class="lvl"><div class="lvl-tag">Глубокий разбор</div><p>${esc(c.deep)}</p></div>
        <div class="lvl"><div class="lvl-tag">Как применять</div><p>${esc(c.apply)}</p></div>
        <div class="lvl crit"><div class="lvl-tag">Критика и границы</div><p>${esc(c.critique)}</p></div>
        <div class="lvl trap"><div class="lvl-tag">⚠️ Ловушка на экзамене</div><p>${esc(c.trap)}</p></div>
        <div class="lvl ex"><div class="lvl-tag">Примеры</div><p>${esc(c.example)}</p></div>
      </div>
    </div>`).join("")}`;
  // восстановить раскрытые
  m.concepts.forEach(c => { if (S.conceptsOpen[c.id]) { const el = document.getElementById("cc-" + c.id); if (el) el.classList.add("open"); } });
}

/* ---------- сессии вопросов (тест/лабиринт) ---------- */
let session = null;
function startSession(opts) {
  session = Object.assign({ idx: 0, answers: [], done: false }, opts);
  renderSession();
}
function pickQuizQuestions(mid, n = 10) {
  const pool = QUESTIONS.filter(q => q.m === mid);
  const unseen = pool.filter(q => !S.answers[q.id]);
  const wrong = pool.filter(q => S.answers[q.id] && !S.answers[q.id].lastOk);
  const rest = pool.filter(q => !unseen.includes(q) && !wrong.includes(q));
  return shuffle(unseen).concat(shuffle(wrong)).concat(shuffle(rest)).slice(0, n).map(prepQ);
}
function renderSession() {
  const q = session.list[session.idx];
  const m = modById(q.m);
  const answered = session.answers[session.idx];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="back-link" onclick="App.quitSession()">← выйти (${esc(session.title)})</div>
    <div class="q-progress">${session.list.map((_, i) => { const a = session.answers[i]; return `<i class="${i === session.idx ? "cur" : a ? (a.ok ? "ok" : "no") : ""}"></i>`; }).join("")}</div>
    <div class="q-card">
      <div class="q-meta">
        <span class="pill" style="color:${m.color}">${m.icon} ${esc(m.title)}</span>
        <span class="pill">${"⭐".repeat(q.d)} ${q.d === 1 ? "база" : q.d === 2 ? "средний" : "сложный"}</span>
        <span class="pill">${session.idx + 1} / ${session.list.length}</span>
      </div>
      <div class="q-text">${esc(q.q)}</div>
      ${q.o.map((opt, i) => {
        let cls = "opt";
        if (answered) { if (i === q.a) cls += answered.pick === i ? " sel-ok" : " reveal"; else if (i === answered.pick) cls += " sel-no"; }
        return `<button class="${cls}" ${answered ? "disabled" : ""} onclick="App.answer(${i})"><span class="hotkey-hint">${i + 1}</span>${"АБВГ"[i]}. ${esc(opt)}</button>`;
      }).join("")}
      ${answered ? `<div class="expl"><b>${answered.ok ? "✅ Верно!" : "❌ Неверно. Правильный ответ: " + "АБВГ"[q.a]}</b><br>${esc(q.e)}</div>` : ""}
      <div class="q-foot">
        <span class="tiny muted">${answered && q.concept ? `Концепт: <a href="#learn/${q.m}" onclick="App.openConceptLater('${q.concept}')">${esc((conceptById(q.concept) || {}).name || "")}</a>` : ""}</span>
        ${answered ? `<button class="btn" onclick="App.nextQ()">${session.idx + 1 < session.list.length ? "Дальше →" : "Результат"}</button>` : ""}
      </div>
    </div>
  </div>`;
}
function finishSession() {
  const right = session.answers.filter(a => a && a.ok).length;
  const total = session.list.length;
  const pct = Math.round(100 * right / total);
  const wrongQs = session.list.filter((q, i) => session.answers[i] && !session.answers[i].ok);
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="card result-hero">
      <div class="big" style="color:${pct >= 80 ? "var(--acc2)" : pct >= 60 ? "var(--warn)" : "var(--bad)"}">${right}/${total}</div>
      <div class="sub">${pct}% · ${pct >= 90 ? "Блестяще! ⚔️" : pct >= 75 ? "Сильно. Добивай пробелы." : pct >= 50 ? "База есть, но щели открыты." : "Пора в режим «Учить» — фундамент шатается."}</div>
      <div class="mt16" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn" onclick="${session.again}">Ещё раз</button>
        <button class="btn ghost" onclick="location.hash='dashboard'">В штаб</button>
      </div>
    </div>
    ${wrongQs.length ? `<div class="card mt16"><b>Разбор ошибок (${wrongQs.length})</b>
      ${wrongQs.map(q => `<div class="mt16"><div style="font-weight:700">${esc(q.q)}</div>
        <div class="tiny mt8" style="color:var(--acc2)">✔ ${"АБВГ"[q.a]}. ${esc(q.o[q.a])}</div>
        <div class="tiny muted mt8">${esc(q.e)}</div>
        ${q.concept ? `<div class="tiny mt8">📚 Повторить: <a href="#learn/${q.m}" onclick="App.openConceptLater('${q.concept}')">${esc((conceptById(q.concept) || {}).name || "")}</a></div>` : ""}</div>`).join("")}
    </div>` : ""}
  </div>`;
  session = null;
}

/* ---------- ТЕСТ ---------- */
routes.quiz = () => {
  if (session) return renderSession();
  $("#main").innerHTML = `
  <h1 class="view-title">Тест по модулю</h1>
  <div class="view-sub">10 вопросов с мгновенным разбором. Сначала — невиданные и заваленные вопросы.</div>
  <div class="choice-grid">
    ${MODULES.map(m => { const st = moduleStats(m.id); return `
      <div class="choice" onclick="App.startQuiz('${m.id}')">
        <b>${m.icon} ${m.num}. ${esc(m.title)}</b>
        <span>${st.seen}/${st.total} вопросов пройдено${st.seen ? " · точность " + Math.round(st.acc * 100) + "%" : ""}</span>
      </div>`; }).join("")}
    <div class="choice" style="border-color:var(--acc)" onclick="App.startQuizAll()">
      <b>🎲 Микс по всем модулям</b><span>случайные 12 вопросов со всего курса</span>
    </div>
  </div>`;
};

/* ---------- ЛАБИРИНТ ---------- */
routes.maze = () => {
  $("#main").innerHTML = `
  <h1 class="view-title">🌀 Лабиринт</h1>
  <div class="view-sub">Адаптивная тренировка: отвечаешь верно — вопросы сложнее, ошибаешься — система «подкапывает» слабые темы. 12 вопросов.</div>
  <div class="card">
    <p>Лабиринт сам выбирает, что спрашивать: приоритет — модулям с низкой готовностью и концептам, где ты ошибался. Сложность подстраивается под тебя (начало — со «среднего»).</p>
    <button class="btn mt16" onclick="App.startMaze()">Войти в лабиринт →</button>
  </div>`;
};
function mazePick(d, exclude) {
  // слабые модули в приоритете
  const stats = MODULES.map(m => ({ m: m.id, score: moduleStats(m.id).score }));
  const weakMods = stats.sort((a, b) => a.score - b.score).slice(0, 6).map(x => x.m);
  let pool = QUESTIONS.filter(q => q.d === d && !exclude.has(q.id));
  if (!pool.length) pool = QUESTIONS.filter(q => !exclude.has(q.id));
  const weighted = pool.filter(q => weakMods.includes(q.m));
  const unseenW = weighted.filter(q => !S.answers[q.id] || !S.answers[q.id].lastOk);
  const cand = unseenW.length ? unseenW : (weighted.length ? weighted : pool);
  const picked = cand[Math.floor(Math.random() * cand.length)];
  return picked ? prepQ(picked) : null;
}

/* ---------- ЭКЗАМЕН ---------- */
let exam = null;
routes.exam = () => {
  if (exam && !exam.finished) return renderExamQ();
  const last = S.exams.slice(-3).reverse();
  $("#main").innerHTML = `
  <h1 class="view-title">💀 Режим «Ночной кошмар»</h1>
  <div class="view-sub">Полная симуляция: 36 вопросов (по 3 из каждого модуля), 54 минуты, без подсказок. Разбор — после финиша. Оценка — по шкале курса.</div>
  <div class="card">
    <b>Правила боя</b>
    <ul style="margin:10px 0 0 20px; color:var(--tx2); font-size:14px; line-height:1.8">
      <li>Таймер не останавливается. По истечении — автосдача.</li>
      <li>Можно перемещаться между вопросами и менять ответы до сдачи.</li>
      <li>Шкала курса: 96–100% → 10 · 90–95% → 9 · 80–89% → 8 · 75–79% → 7 · 70–74% → 6 · 60–69% → 5 · 50–59% → 4 (порог сдачи).</li>
    </ul>
    <button class="btn bad mt16" onclick="App.startExam()">Начать экзамен ⚔️</button>
  </div>
  ${last.length ? `<div class="card mt16"><b>Прошлые симуляции</b>
    <table class="res-table"><tr><th>дата</th><th>результат</th><th>оценка</th></tr>
    ${last.map(e => `<tr><td>${e.date}</td><td>${e.score}/${e.total} (${Math.round(100 * e.score / e.total)}%)</td><td><b>${gradeFor(Math.round(100 * e.score / e.total))}/10</b></td></tr>`).join("")}</table></div>` : ""}`;
};
function buildExam() {
  let list = [];
  MODULES.forEach(m => {
    const pool = QUESTIONS.filter(q => q.m === m.id);
    const hard = shuffle(pool.filter(q => q.d === 3)).slice(0, 1);
    const rest = shuffle(pool.filter(q => !hard.includes(q))).slice(0, 2);
    list = list.concat(hard, rest);
  });
  return shuffle(list).map(prepQ);
}
function renderExamQ() {
  const q = exam.list[exam.idx];
  const picked = exam.picks[exam.idx];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="exam-bar">
      <b>Вопрос ${exam.idx + 1} / ${exam.list.length}</b>
      <span class="timer ${exam.remain < 300 ? "low" : ""}" id="exam-timer">${fmtTime(exam.remain)}</span>
      <button class="btn sm warn" onclick="App.submitExam(true)">Сдать работу</button>
    </div>
    <div class="q-card">
      <div class="q-text">${esc(q.q)}</div>
      ${q.o.map((opt, i) => `<button class="opt ${picked === i ? "sel-ok" : ""}" onclick="App.examPick(${i})"><span class="hotkey-hint">${i + 1}</span>${"АБВГ"[i]}. ${esc(opt)}</button>`).join("")}
      <div class="q-foot">
        <button class="btn ghost sm" ${exam.idx === 0 ? "disabled" : ""} onclick="App.examGo(${exam.idx - 1})">← Назад</button>
        <button class="btn sm" ${exam.idx >= exam.list.length - 1 ? "disabled" : ""} onclick="App.examGo(${exam.idx + 1})">Вперёд →</button>
      </div>
    </div>
    <div class="exam-nav">${exam.list.map((_, i) => `<button class="${exam.picks[i] != null ? "answered" : ""} ${i === exam.idx ? "cur" : ""}" onclick="App.examGo(${i})">${i + 1}</button>`).join("")}</div>
  </div>`;
}
function fmtTime(s) { const m = Math.floor(s / 60), ss = s % 60; return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; }
function examTick() {
  if (!exam || exam.finished) return;
  exam.remain--;
  const t = $("#exam-timer"); if (t) { t.textContent = fmtTime(exam.remain); t.classList.toggle("low", exam.remain < 300); }
  if (exam.remain <= 0) { App.submitExam(false); return; }
  exam.timer = setTimeout(examTick, 1000);
}
function examResults() {
  const byMod = {};
  let right = 0;
  exam.list.forEach((q, i) => {
    const ok = exam.picks[i] === q.a;
    if (ok) right++;
    byMod[q.m] = byMod[q.m] || { r: 0, t: 0 };
    byMod[q.m].t++; if (ok) byMod[q.m].r++;
    recordAnswer(q, ok);
  });
  const total = exam.list.length;
  const pct = Math.round(100 * right / total);
  const grade = gradeFor(pct);
  S.exams.push({ date: todayStr(), score: right, total, pct }); save();
  const weakest = Object.entries(byMod).map(([mid, v]) => ({ mid, acc: v.r / v.t, ...v })).sort((a, b) => a.acc - b.acc).slice(0, 3);
  const wrongQs = exam.list.map((q, i) => ({ q, i })).filter(x => exam.picks[x.i] !== x.q.a);

  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="card result-hero">
      <div class="grade-badge" style="color:${grade >= 8 ? "var(--acc2)" : grade >= 5 ? "var(--warn)" : "var(--bad)"}">${grade}/10</div>
      <div class="big" style="font-size:34px;margin-top:10px">${right}/${total} · ${pct}%</div>
      <div class="sub">${grade >= 9 ? "Боевая готовность подтверждена. Так и на экзамене! ⚔️" : grade >= 7 ? "Крепко. Добей слабые модули — и будет 9–10." : grade >= 4 ? "Сдал бы, но без блеска. Вперёд в лабиринт." : "Отступаем в «Учить» и перегруппировываемся."}</div>
    </div>
    <div class="card mt16">
      <b>По модулям</b>
      <table class="res-table"><tr><th>модуль</th><th>результат</th><th></th></tr>
      ${Object.entries(byMod).map(([mid, v]) => { const m = modById(mid); return `<tr><td>${m.icon} ${esc(m.title)}</td><td>${v.r}/${v.t}</td><td>${v.r === v.t ? "✅" : v.r / v.t >= 0.5 ? "⚠️" : "❌"}</td></tr>`; }).join("")}</table>
      <div class="mt16"><b>🎯 Куда бить дальше:</b>
        ${weakest.filter(w => w.acc < 1).map(w => { const m = modById(w.mid); return `<div class="weak-item mt8"><span>${m.icon} ${esc(m.title)}</span><a class="btn sm ghost" href="#learn/${m.id}">повторить</a></div>`; }).join("") || `<span class="muted tiny"> — нет провалов, можно шлифовать сложные вопросы.</span>`}
      </div>
    </div>
    ${wrongQs.length ? `<div class="card mt16"><b>Разбор ошибок (${wrongQs.length})</b>
      ${wrongQs.map(({ q, i }) => `<div class="mt16"><div style="font-weight:700">${i + 1}. ${esc(q.q)}</div>
        <div class="tiny mt8" style="color:var(--bad)">твой ответ: ${exam.picks[i] != null ? "АБВГ"[exam.picks[i]] + ". " + esc(q.o[exam.picks[i]]) : "—"}</div>
        <div class="tiny" style="color:var(--acc2)">верно: ${"АБВГ"[q.a]}. ${esc(q.o[q.a])}</div>
        <div class="tiny muted mt8">${esc(q.e)}</div></div>`).join("")}</div>` : ""}
    <div class="mt16" style="display:flex;gap:10px"><button class="btn" onclick="App.startExam()">Ещё одна симуляция</button><button class="btn ghost" onclick="location.hash='dashboard'">В штаб</button></div>
  </div>`;
  exam = null;
}

/* ---------- КАРТОЧКИ ---------- */
let fcSession = null;
routes.cards = () => {
  const due = cardsDue(), fresh = cardsNew();
  if (fcSession) return renderCard();
  $("#main").innerHTML = `
  <h1 class="view-title">🃏 Карточки</h1>
  <div class="view-sub">Интервальное повторение: сначала — что пора повторить, затем новые. Оценивай честно — алгоритм подстроит интервалы.</div>
  <div class="stat-row" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat"><div class="v" style="color:var(--bad)">${due.length}</div><div class="l">к повторению сейчас</div></div>
    <div class="stat"><div class="v" style="color:var(--acc)">${fresh.length}</div><div class="l">новых не изучено</div></div>
    <div class="stat"><div class="v" style="color:var(--acc2)">${Object.values(S.cards).filter(c => c.ivl >= 3).length}</div><div class="l">закреплено (интервал ≥ 3 дней)</div></div>
  </div>
  <div class="card">
    ${due.length + fresh.length ? `<p>Сессия: ${Math.min(20, due.length + Math.min(10, fresh.length))} карточек (${Math.min(due.length, 20)} повторений + ${Math.min(10, Math.max(0, 20 - due.length), fresh.length)} новых).</p>
    <button class="btn mt16" onclick="App.startCards()">Начать сессию →</button>`
    : `<p>Всё повторено! 🎉 Возвращайся позже — алгоритм назначит следующие повторения.</p>`}
  </div>`;
};
function renderCard() {
  const c = fcSession.list[fcSession.idx];
  const m = modById(c.m);
  if (window.startCardTimer && !fcSession.timerStarted) { startCardTimer(); fcSession.timerStarted = true; }
  $("#main").innerHTML = `
  <div class="fc-stage">
    <div class="back-link" onclick="App.quitCards()">← закончить</div>
    <div class="fc-meta"><span>${fcSession.idx + 1} / ${fcSession.list.length}</span><span id="card-timer" class="tiny muted" style="font-variant-numeric:tabular-nums">0:00</span><span class="pill" style="color:${m.color}">${m.icon} ${esc(m.title)}</span></div>
    <div class="fc" onclick="App.flipCard()">
      <div class="front">${esc(c.f)}</div>
      ${fcSession.flipped ? `<div class="back">${esc(c.b)}</div>` : `<div class="tiny muted mt16">нажми, чтобы перевернуть</div>`}
    </div>
    ${fcSession.flipped ? `<div class="fc-btns">
      <button class="btn bad" onclick="App.rate(1)">Снова<br><span class="tiny">&lt;10 мин</span></button>
      <button class="btn warn" onclick="App.rate(3)">Сложно</button>
      <button class="btn" onclick="App.rate(4)">Хорошо</button>
      <button class="btn green" onclick="App.rate(5)">Легко</button>
    </div>` : ""}
  </div>`;
}

/* ---------- КЕЙСЫ ---------- */
let caseSession = null;
routes.cases = (cid) => {
  if (cid && !caseSession) { const c = CASES.find(x => x.id === cid); if (c) { caseSession = { c, qs: c.questions.map(prepQ), idx: 0, answers: [] }; } }
  if (caseSession) return renderCase();
  $("#main").innerHTML = `
  <h1 class="view-title">🧩 Кейсы</h1>
  <div class="view-sub">Комплексные сценарии: каждый требует синтеза 3–5 концепций из разных лекций — как на экзамене.</div>
  <div class="choice-grid">
    ${CASES.map(c => `<div class="choice" onclick="location.hash='cases/${c.id}'">
      <b>${c.icon} ${esc(c.title)}</b>
      <span>${c.questions.length} вопросов · ${c.tags.map(t => esc(t)).join(" · ")}</span>
    </div>`).join("")}
  </div>`;
};
function renderCase() {
  const { c, idx } = caseSession;
  const q = caseSession.qs[idx];
  const answered = caseSession.answers[idx];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="back-link" onclick="App.quitCase()">← все кейсы</div>
    <h1 class="view-title" style="font-size:21px">${c.icon} ${esc(c.title)}</h1>
    <div class="case-context">${esc(c.context)}</div>
    <div class="q-progress">${c.questions.map((_, i) => { const a = caseSession.answers[i]; return `<i class="${i === idx ? "cur" : a ? (a.ok ? "ok" : "no") : ""}"></i>`; }).join("")}</div>
    <div class="q-card">
      <div class="q-meta"><span class="pill">Вопрос ${idx + 1} / ${c.questions.length}</span></div>
      <div class="q-text">${esc(q.q)}</div>
      ${q.o.map((opt, i) => {
        let cls = "opt";
        if (answered) { if (i === q.a) cls += answered.pick === i ? " sel-ok" : " reveal"; else if (i === answered.pick) cls += " sel-no"; }
        return `<button class="${cls}" ${answered ? "disabled" : ""} onclick="App.caseAnswer(${i})">${"АБВГ"[i]}. ${esc(opt)}</button>`;
      }).join("")}
      ${answered ? `<div class="expl"><b>${answered.ok ? "✅ Верно!" : "❌ Правильный ответ: " + "АБВГ"[q.a]}</b><br>${esc(q.e)}</div>` : ""}
      <div class="q-foot"><span></span>${answered ? `<button class="btn" onclick="App.caseNext()">${idx + 1 < c.questions.length ? "Дальше →" : "Завершить кейс"}</button>` : ""}</div>
    </div>
  </div>`;
}

/* ---------- AI-ТРЕНЕР ---------- */
const TUTOR_MODES = {
  teacher: { name: "👨‍🏫 Учитель", sys: "Объясняй понятно и структурно, с примерами компаний. Сначала суть в 1–2 фразах, затем разбор, в конце — мини-проверка понимания одним вопросом." },
  socrat: { name: "🏛 Сократ", sys: "Не давай готовых ответов. Веди студента наводящими вопросами к самостоятельному выводу. Если студент ошибается — задай вопрос, вскрывающий противоречие. Один вопрос за раз." },
  debate: { name: "⚔️ Дебаты", sys: "Займи позицию, ПРОТИВОПОЛОЖНУЮ мнению студента, и аргументированно атакуй (ссылаясь на теории курса и контрпримеры). Цель — научить видеть границы применимости теорий. Будь жёстким, но честным." },
  examiner: { name: "💀 Экзаменатор", sys: "Веди себя как строгий экзаменатор: задавай вопросы уровня экзамена по темам курса (по одному), оценивай ответы по 10-балльной шкале курса, указывай, чего не хватило до идеала, и задавай следующий вопрос. Начни с вопроса средней сложности." }
};
function tutorSystemPrompt() {
  const map = MODULES.map(m => `${m.num}. ${m.title}: ${m.concepts.map(c => c.name).join("; ")}`).join("\n");
  const weak = weakConcepts(5).map(w => (conceptById(w.cid) || {}).name).filter(Boolean).join(", ");
  return `Ты — AI-тренер по курсу «Стратегический менеджмент» (НИУ ВШЭ, 12 лекций, преподаватель Кнатько Д.М.). Готовишь студента к экзамену на 10/10. Отвечай по-русски, кратко и по делу (до ~250 слов), используй термины курса (англ. оригиналы в скобках).
Карта курса:\n${map}
${weak ? `Слабые места студента по статистике тренажёра: ${weak}. Учитывай их.` : ""}
Режим: ${TUTOR_MODES[S.tutor.mode].sys}`;
}
routes.tutor = () => {
  const t = S.tutor;
  $("#main").innerHTML = `
  <h1 class="view-title">🤖 AI-тренер</h1>
  <div class="view-sub">Личный тренер на Claude: знает структуру курса и твои слабые места. Нужен API-ключ Anthropic (хранится только в твоём браузере).</div>
  <div class="card" style="margin-bottom:14px">
    <div class="key-row">
      <input type="password" id="api-key" placeholder="sk-ant-..." value="${esc(t.key)}" style="flex:1;min-width:220px">
      <select id="api-model">
        <option value="claude-sonnet-4-6" ${t.model === "claude-sonnet-4-6" ? "selected" : ""}>Sonnet 4.6 (баланс)</option>
        <option value="claude-haiku-4-5-20251001" ${t.model === "claude-haiku-4-5-20251001" ? "selected" : ""}>Haiku 4.5 (быстрый)</option>
        <option value="claude-opus-4-8" ${t.model === "claude-opus-4-8" ? "selected" : ""}>Opus 4.8 (максимум)</option>
      </select>
      <button class="btn sm ghost" onclick="App.saveTutorCfg()">Сохранить</button>
    </div>
  </div>
  <div class="tutor-modes" style="margin-bottom:14px">
    ${Object.entries(TUTOR_MODES).map(([k, v]) => `<button class="${t.mode === k ? "active" : ""}" onclick="App.setTutorMode('${k}')">${v.name}</button>`).join("")}
  </div>
  <div class="chat">
    <div class="chat-msgs" id="chat-msgs">
      ${t.history.length ? t.history.map(m => `<div class="msg ${m.role === "user" ? "user" : "ai"}">${esc(m.content)}</div>`).join("") : `<div class="msg sys">Выбери режим и спроси что угодно: «Объясни VRIO для новичка», «Прогони меня по голубому океану», «Докажи, что Портер устарел» (в режиме дебатов — держись!).</div>`}
    </div>
    <div class="chat-input">
      <textarea id="chat-text" placeholder="Твой вопрос или ответ тренеру… (Ctrl+Enter — отправить)"></textarea>
      <button class="btn" id="chat-send" onclick="App.sendTutor()">➤</button>
    </div>
    <div style="display:flex;gap:8px"><button class="btn sm ghost" onclick="App.clearTutor()">Очистить диалог</button></div>
  </div>`;
  const ta = $("#chat-text");
  ta.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") App.sendTutor(); });
  const box = $("#chat-msgs"); box.scrollTop = box.scrollHeight;
};
async function callClaude(messages) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": S.tutor.key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: S.tutor.model, max_tokens: 1200, system: tutorSystemPrompt(), messages })
  });
  if (!resp.ok) { const err = await resp.text(); throw new Error(`API ${resp.status}: ${err.slice(0, 300)}`); }
  const data = await resp.json();
  return data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
}

/* ---------- публичные действия ---------- */
window.App = {
  toggleConcept(id) { const el = document.getElementById("cc-" + id); el.classList.toggle("open"); S.conceptsOpen[id] = el.classList.contains("open"); save(); },
  openConceptLater(cid) { setTimeout(() => { const el = document.getElementById("cc-" + cid); if (el) { el.classList.add("open"); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 60); },
  saveExamDate() { S.examDate = $("#exam-date").value; save(); navigate(); },
  resetAll() { if (confirm("Точно сбросить весь прогресс? Это необратимо.")) { localStorage.removeItem("strategos_v1"); loadState(); navigate(); } },

  startQuiz(mid) { location.hash = "quiz"; startSession({ list: pickQuizQuestions(mid, 10), title: "тест: " + modById(mid).title, again: `App.startQuiz('${mid}')` }); },
  startQuizAll() { const list = shuffle(QUESTIONS).slice(0, 12).map(prepQ); startSession({ list, title: "микс по курсу", again: "App.startQuizAll()" }); },
  answer(i) {
    const q = session.list[session.idx];
    if (session.answers[session.idx]) return;
    const ok = i === q.a;
    session.answers[session.idx] = { pick: i, ok };
    recordAnswer(q, ok);
    if (session.maze) { // адаптация сложности и подбор следующего
      const nd = ok ? Math.min(3, session.d + 1) : Math.max(1, session.d - 1);
      session.d = nd;
      if (session.list.length < session.target) {
        const excl = new Set(session.list.map(x => x.id));
        const nq = mazePick(nd, excl); if (nq) session.list.push(nq);
      }
    }
    renderSession();
  },
  nextQ() { if (session.idx + 1 < session.list.length) { session.idx++; renderSession(); } else finishSession(); },
  quitSession() { session = null; navigate(); },

  startMaze() {
    const first = mazePick(2, new Set());
    startSession({ list: [first], title: "лабиринт", maze: true, d: 2, target: 12, again: "App.startMaze()" });
  },

  startExam() { exam = { list: buildExam(), picks: {}, idx: 0, remain: 54 * 60, finished: false }; location.hash = "exam"; renderExamQ(); examTick(); },
  examPick(i) { exam.picks[exam.idx] = i; if (exam.idx < exam.list.length - 1) exam.idx++; renderExamQ(); },
  examGo(i) { exam.idx = i; renderExamQ(); },
  submitExam(ask) {
    if (!exam) return;
    const unanswered = exam.list.filter((_, i) => exam.picks[i] == null).length;
    if (ask && unanswered > 0 && !confirm(`Без ответа: ${unanswered}. Точно сдать?`)) return;
    exam.finished = true; clearTimeout(exam.timer); examResults();
  },

  startCards() {
    const due = shuffle(cardsDue()).slice(0, 20);
    const fresh = shuffle(cardsNew()).slice(0, Math.min(10, Math.max(0, 20 - due.length)));
    const list = due.concat(fresh);
    if (!list.length) return;
    fcSession = { list, idx: 0, flipped: false };
    renderCard();
  },
  flipCard() { fcSession.flipped = !fcSession.flipped; renderCard(); },
  rate(g) {
    rateCard(fcSession.list[fcSession.idx], g);
    if (g === 1) fcSession.list.push(fcSession.list[fcSession.idx]);
    if (fcSession.idx + 1 < fcSession.list.length) { fcSession.idx++; fcSession.flipped = false; fcSession.timerStarted = false; renderCard(); }
    else { fcSession = null; navigate(); }
  },
  quitCards() { fcSession = null; navigate(); },

  caseAnswer(i) {
    const { idx } = caseSession;
    if (caseSession.answers[idx]) return;
    const q = caseSession.qs[idx];
    const ok = i === q.a;
    caseSession.answers[idx] = { pick: i, ok };
    touchActivity("case");
    renderCase();
  },
  caseNext() {
    const { c } = caseSession;
    if (caseSession.idx + 1 < c.questions.length) { caseSession.idx++; renderCase(); }
    else {
      const right = caseSession.answers.filter(a => a && a.ok).length;
      const total = c.questions.length;
      $("#main").innerHTML = `
      <div class="q-wrap"><div class="card result-hero">
        <div class="big" style="color:${right / total >= 0.8 ? "var(--acc2)" : "var(--warn)"}">${right}/${total}</div>
        <div class="sub">Кейс «${esc(c.title)}» пройден. ${right === total ? "Чистый синтез — экзаменатор бы прослезился. ⚔️" : "Перечитай разборы — кейсы любят повторение."}</div>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center"><button class="btn ghost" onclick="App.quitCase()">Все кейсы</button><button class="btn" onclick="location.hash='dashboard'">В штаб</button></div>
      </div></div>`;
      caseSession = null;
    }
  },
  quitCase() { caseSession = null; location.hash = "cases"; routes.cases(); },

  saveTutorCfg() { S.tutor.key = $("#api-key").value.trim(); S.tutor.model = $("#api-model").value; save(); routes.tutor(); },
  setTutorMode(k) { S.tutor.mode = k; save(); routes.tutor(); },
  clearTutor() { S.tutor.history = []; save(); routes.tutor(); },
  async sendTutor() {
    const ta = $("#chat-text"); const text = ta.value.trim(); if (!text) return;
    if (!S.tutor.key) { alert("Вставь API-ключ Anthropic (console.anthropic.com → API keys). Он хранится только в твоём браузере."); return; }
    S.tutor.history.push({ role: "user", content: text }); save();
    ta.value = "";
    const box = $("#chat-msgs");
    box.insertAdjacentHTML("beforeend", `<div class="msg user">${esc(text)}</div><div class="msg ai" id="ai-typing"><span class="spin"></span> думаю…</div>`);
    box.scrollTop = box.scrollHeight;
    $("#chat-send").disabled = true;
    try {
      const msgs = S.tutor.history.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const out = await callClaude(msgs);
      S.tutor.history.push({ role: "assistant", content: out }); save();
      const t = document.getElementById("ai-typing"); if (t) t.outerHTML = `<div class="msg ai">${esc(out)}</div>`;
      touchActivity("tutor");
    } catch (e) {
      const t = document.getElementById("ai-typing"); if (t) t.outerHTML = `<div class="msg sys">⚠️ ${esc(e.message)}</div>`;
      S.tutor.history.pop(); save();
    }
    $("#chat-send").disabled = false;
    box.scrollTop = box.scrollHeight;
  }
};

/* ---------- старт ---------- */
loadState();
navigate();
