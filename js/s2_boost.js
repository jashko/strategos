/* Бустеры эффективности: спейсинг + «Сегодня», дрилл атрибуции авторов,
   открытые вопросы (конструктор + эталон + AI-проверка). Встроены в роутер. */
"use strict";

const DAY = 86400000;

/* ============ СПЕЙСИНГ (умное повторение) ============ */
function srsDeck() {
  const cards = [];
  S2.THEMES.forEach(t => t.concepts.forEach((c, i) => {
    cards.push({ id: "sc-" + t.id + "-" + i, topic: t.id, kind: "concept",
      front: c.name, sub: c.authors,
      back: (c.essence || "") + "\n\n🧲 " + (c.hook || "") + "\n\n⚠️ " + (c.trap || "") });
  }));
  ALL2().filter(q => q.part === 3).forEach(q => {
    cards.push({ id: "st-" + q.id, topic: q.topic, kind: "term",
      front: q.stem, sub: "часть 3 · впиши понятие",
      back: "✅ " + q.accept[0] + (q.needAuthor ? "\nАвтор: " + q.needAuthor : "") + (q.needElement ? "\nЭлемент: " + q.needElement : "") });
  });
  return cards;
}
function srsState(id) { s2init(); return S.s2.srs && S.s2.srs[id]; }
function srsDue() { const now = Date.now(); return srsDeck().filter(c => { const st = srsState(c.id); return st && st.due <= now; }); }
function srsNew() { return srsDeck().filter(c => !srsState(c.id)); }
function rateSRS(card, grade) {
  s2init(); if (!S.s2.srs) S.s2.srs = {};
  const st = S.s2.srs[card.id] || { ease: 2.5, ivl: 0, due: 0, reps: 0 };
  if (grade === 1) { st.ivl = 0; st.due = Date.now() + 10 * 60000; }
  else {
    st.ease = Math.max(1.3, st.ease + (grade === 3 ? -0.15 : grade === 5 ? 0.12 : 0));
    st.ivl = (st.reps === 0 || !st.ivl) ? (grade === 5 ? 3 : 1) : Math.round(st.ivl * (grade === 3 ? 1.25 : st.ease));
    st.due = Date.now() + st.ivl * DAY;
  }
  st.reps++; S.s2.srs[card.id] = st; touchActivity("srs"); save();
}
function weakestTopic() {
  let best = null, bestAcc = 2;
  S2.THEMES.forEach(t => { const s = themeStats(t.id); if (s.n >= 1 && s.acc < bestAcc) { bestAcc = s.acc; best = t.id; } });
  return best || (1 + Math.floor(Math.random() * 12));
}

/* ============ «СЕГОДНЯ» ============ */
let todaySes = null;
routes.today = () => {
  if (todaySes) return renderToday();
  s2init();
  const due = srsDue().length, fresh = srsNew().length;
  const wt = weakestTopic();
  const examDate = S.examDate;
  const days = examDate ? Math.ceil((new Date(examDate) - new Date(todayStr())) / DAY) : null;
  $("#main").innerHTML = `
  <h1 class="view-title">🗓 Сегодня</h1>
  <div class="view-sub">Дневная сессия по кривой забывания: повторяем то, что пора, и добиваем слабое.${days !== null ? (days > 0 ? ` До экзамена <b>${days} ${plural(days,"день","дня","дней")}</b>.` : days === 0 ? " <b>Экзамен сегодня — удачи!</b>" : "") : ""}</div>
  <div class="stat-row" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat"><div class="v" style="color:var(--bad)">${due}</div><div class="l">карточек к повторению</div></div>
    <div class="stat"><div class="v" style="color:var(--acc)">${fresh}</div><div class="l">новых концепций/терминов</div></div>
    <div class="stat"><div class="v" style="color:var(--warn)">${S2.themeById(wt).id}</div><div class="l">слабейшая тема: ${esc(S2.themeById(wt).short)}</div></div>
  </div>
  <div class="card">
    <b>План на сегодня</b>
    <ol style="margin:10px 0 0 20px;color:var(--tx2);font-size:14px;line-height:1.9">
      <li>Повторить <b>${Math.min(due, 25)}</b> карточек к сроку + <b>${Math.min(8, Math.max(0, 25 - due), fresh)}</b> новых (активное вспоминание)</li>
      <li>Добить вопросами слабейшую тему — <b>${esc(S2.themeById(wt).title)}</b></li>
    </ol>
    <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
      ${due + fresh > 0 ? `<button class="btn" onclick="App3.startToday()">Начать повторение →</button>` : `<span class="muted tiny">Карточки на сегодня повторены 🎉</span>`}
      <button class="btn ghost" onclick="App2.startPractice({topic:${wt}})">Сразу к слабой теме</button>
    </div>
  </div>
  <div class="tiny muted mt16">Спейсинг: верно вспомнил — интервал растёт (1→3→7+ дней); «не помню» — карточка вернётся через 10 минут. Так память держится к дате экзамена.</div>`;
};
function renderToday() {
  const c = todaySes.list[todaySes.idx];
  $("#main").innerHTML = `
  <div class="fc-stage">
    <div class="back-link" onclick="App3.quitToday()">← закончить</div>
    <div class="fc-meta"><span>${todaySes.idx + 1} / ${todaySes.list.length}</span><span class="pill">${c.kind === "term" ? "термин ч.3" : "тема " + c.topic}</span></div>
    <div class="fc" onclick="App3.flipToday()">
      <div class="front">${esc(c.front)}</div>
      <div class="tiny muted mt8">${esc(c.sub || "")}</div>
      ${todaySes.flip ? `<div class="back">${fmt(c.back).replace(/\n/g, "<br>")}</div>` : `<div class="tiny muted mt16">вспомни — потом нажми, чтобы перевернуть</div>`}
    </div>
    ${todaySes.flip ? `<div class="fc-btns">
      <button class="btn bad" onclick="App3.rateToday(1)">Не помню<br><span class="tiny">10 мин</span></button>
      <button class="btn warn" onclick="App3.rateToday(3)">Трудно</button>
      <button class="btn" onclick="App3.rateToday(4)">Помню</button>
      <button class="btn green" onclick="App3.rateToday(5)">Легко</button>
    </div>` : ""}
  </div>`;
}

/* ============ ДРИЛЛ АТРИБУЦИИ АВТОРОВ ============ */
function cleanAuthor(s) { return String(s).replace(/\(.*?\)/g, "").replace(/«.*?»/g, "").replace(/,?\s*\d{4}.*/, "").replace(/\s+/g, " ").trim(); }
function authorPool() {
  const out = [];
  S2.THEMES.forEach(t => t.concepts.forEach(c => {
    const a = cleanAuthor(c.authors);
    if (a && !/уточнить|практика|теория|совр|исследовани|организационн/i.test(a) && a !== "—")
      out.push({ concept: c.name, author: a, topic: t.id });
  }));
  return out;
}
let authSes = null;
routes.s2authors = () => {
  if (authSes) return renderAuth();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">🏷 Атрибуция авторов</h1>
  <div class="view-sub">Экзамен прямо оценивает указание авторов (части 2–3). Дрилл в обе стороны: кто автор концепции и что за концепция у автора.</div>
  <div class="card"><p>${authorPool().length} связок «автор ↔ концепция». Сессия — 14 быстрых вопросов в обе стороны.</p>
    <button class="btn mt16" onclick="App3.startAuth()">Начать дрилл →</button></div>`;
};
function buildAuthQuestions(n) {
  const pool = authorPool();
  const authors = [...new Set(pool.map(p => p.author))];
  const concepts = pool.map(p => p.concept);
  const qs = shuffle(pool).slice(0, n).map(p => {
    if (Math.random() < 0.5) { // кто автор?
      const distract = shuffle(authors.filter(a => a !== p.author)).slice(0, 3);
      const opts = shuffle([p.author, ...distract]);
      return { q: `Кто автор концепции «${p.concept}»?`, options: opts, correct: opts.indexOf(p.author), topic: p.topic, right: p.author };
    } else { // какая концепция у автора?
      const distract = shuffle(concepts.filter(cn => { const e = pool.find(x => x.concept === cn); return e && e.author !== p.author; })).slice(0, 3);
      const opts = shuffle([p.concept, ...distract]);
      return { q: `Какая концепция принадлежит автору ${p.author}?`, options: opts, correct: opts.indexOf(p.concept), topic: p.topic, right: p.concept };
    }
  });
  return qs;
}
function renderAuth() {
  const q = authSes.list[authSes.idx];
  const a = authSes.answers[authSes.idx];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="back-link" onclick="App3.quitAuth()">← выйти</div>
    <div class="q-progress">${authSes.list.map((_, i) => { const x = authSes.answers[i]; return `<i class="${i === authSes.idx ? "cur" : x ? (x.ok ? "ok" : "no") : ""}"></i>`; }).join("")}</div>
    <div class="q-card">
      <div class="q-meta"><span class="pill">${authSes.idx + 1}/${authSes.list.length}</span><span class="pill">тема ${q.topic}</span></div>
      <div class="q-text">${esc(q.q)}</div>
      ${q.options.map((o, i) => { let cls = "opt"; if (a) { if (i === q.correct) cls += " sel-ok"; else if (i === a.pick) cls += " sel-no"; } return `<button class="${cls}" ${a ? "disabled" : ""} onclick="App3.answerAuth(${i})">${esc(o)}</button>`; }).join("")}
      ${a ? `<div class="expl"><b>${a.ok ? "✅ Верно!" : "❌ Правильно: " + esc(q.right)}</b></div>
        <div class="q-foot"><span></span><button class="btn" onclick="App3.nextAuth()">${authSes.idx + 1 < authSes.list.length ? "Дальше →" : "Итог"}</button></div>` : ""}
    </div>
  </div>`;
}

/* ============ ОТКРЫТЫЕ ВОПРОСЫ: КОНСТРУКТОР + ЭТАЛОН + AI ============ */
const openCases = () => ALL2().filter(q => q.part === 4);
routes.s2open = (cid) => {
  if (cid) return renderOpen(cid);
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">✍️ Открытые вопросы (часть 4)</h1>
  <div class="view-sub">Часть 4 = 48% оценки. Конструктор заставляет назвать концепцию + автора + факт на каждый пункт рубрики; затем — эталон и проверка через ИИ.</div>
  <div class="choice-grid">
    ${openCases().map(q => `<div class="choice" onclick="location.hash='s2open/${q.id}'">
      <b>${esc(q.case)}: ${esc(q.framework)}</b><span>${q.must.length} пунктов рубрики · 12 баллов</span></div>`).join("")}
  </div>`;
};
let openState = {};
function renderOpen(cid) {
  const q = openCases().find(x => x.id === cid); if (!q) { location.hash = "s2open"; return; }
  const st = openState[cid] || (openState[cid] = { fields: q.must.map(() => ""), showModel: false, ai: null, aiLoading: false });
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='s2open'">← все кейсы</div>
  <h1 class="view-title" style="font-size:21px">✍️ ${esc(q.case)}: ${esc(q.framework)}</h1>
  <div class="case-context">${esc(q.stem)}</div>
  <div class="card">
    <b>🧱 Конструктор ответа</b>
    <div class="tiny muted mt8">На каждый пункт рубрики — твой тезис с <b>концепцией + автором + фактом кейса</b>. Это и есть скелет ответа на 12 баллов.</div>
    ${q.must.map((m, i) => `<div class="constructor-row">
      <div class="cr-label">${i + 1}. ${esc(m)}</div>
      <textarea rows="2" placeholder="Твой тезис: концепция + автор + факт…" oninput="App3.openField('${cid}',${i},this.value)">${esc(st.fields[i])}</textarea>
      ${st.showModel ? `<div class="model-line"><b>Эталон:</b> ${esc((q.model && q.model[i]) || "—")}</div>` : ""}
    </div>`).join("")}
    <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="App3.toggleModel('${cid}')">${st.showModel ? "Скрыть эталон" : "📋 Показать эталон"}</button>
      <button class="btn sm" onclick="App3.aiCheck('${cid}')" ${st.aiLoading ? "disabled" : ""}>${st.aiLoading ? "Проверяю…" : "🤖 Проверить через ИИ"}</button>
    </div>
    <div class="tiny mt8" style="color:var(--bad)"><b>Не допусти ошибок:</b> ${q.errors.join(" · ")}</div>
    ${st.aiLoading ? `<div class="ai-box mt16"><span class="spin"></span> ИИ оценивает ответ по рубрике курса…</div>` : ""}
    ${st.ai ? `<div class="ai-box mt16"><div class="ai-head">🤖 Оценка ИИ</div><div class="ai-body">${fmt(st.ai).replace(/\n/g, "<br>")}</div></div>` : ""}
  </div>`;
}
async function callClaudeS2(system, userText) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": S.tutor.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: S.tutor.model || "claude-sonnet-4-6", max_tokens: 1100, system, messages: [{ role: "user", content: userText }] })
  });
  if (!resp.ok) throw new Error("API " + resp.status + ": " + (await resp.text()).slice(0, 200));
  const data = await resp.json();
  return data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
}

/* ============ ОБРАБОТЧИКИ ============ */
window.App3 = {
  /* Сегодня */
  startToday() {
    const due = shuffle(srsDue()).slice(0, 25);
    const fresh = shuffle(srsNew()).slice(0, Math.min(8, Math.max(0, 25 - due.length)));
    const list = due.concat(fresh);
    if (!list.length) return;
    todaySes = { list, idx: 0, flip: false }; renderToday();
  },
  flipToday() { todaySes.flip = !todaySes.flip; renderToday(); },
  rateToday(g) {
    rateSRS(todaySes.list[todaySes.idx], g);
    if (g === 1) todaySes.list.push(todaySes.list[todaySes.idx]);
    if (todaySes.idx + 1 < todaySes.list.length) { todaySes.idx++; todaySes.flip = false; renderToday(); }
    else {
      const wt = weakestTopic();
      $("#main").innerHTML = `<div class="fc-stage"><div class="card result-hero"><div class="big" style="color:var(--acc2)">🎉</div>
        <div class="sub">Карточки на сегодня повторены. Закрепи слабейшую тему — <b>${esc(S2.themeById(wt).title)}</b>.</div>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" onclick="App2.startPractice({topic:${wt}})">К слабой теме →</button><button class="btn ghost" onclick="location.hash='examhub'">В хаб</button></div></div></div>`;
      todaySes = null;
    }
  },
  quitToday() { todaySes = null; location.hash = "today"; routes.today(); },

  /* Авторы */
  startAuth() { authSes = { list: buildAuthQuestions(14), idx: 0, answers: [] }; location.hash = "s2authors"; renderAuth(); },
  answerAuth(i) {
    if (authSes.answers[authSes.idx]) return;
    const q = authSes.list[authSes.idx]; const ok = i === q.correct;
    authSes.answers[authSes.idx] = { pick: i, ok };
    s2Record("auth-" + authSes.idx + "-" + q.topic, q.topic, 3, ok); renderAuth();
  },
  nextAuth() {
    if (authSes.idx + 1 < authSes.list.length) { authSes.idx++; renderAuth(); }
    else {
      const r = authSes.answers.filter(a => a && a.ok).length, n = authSes.list.length;
      $("#main").innerHTML = `<div class="q-wrap"><div class="card result-hero"><div class="big" style="color:${r/n>=0.8?"var(--acc2)":"var(--warn)"}">${r}/${n}</div>
        <div class="sub">${r/n>=0.8?"Авторов знаешь твёрдо! ⚔️":"Авторов лучше всего учить через карточки «Сегодня» и банк концепций."}</div>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center"><button class="btn" onclick="App3.startAuth()">Ещё раз</button><button class="btn ghost" onclick="location.hash='examhub'">В хаб</button></div></div></div>`;
      authSes = null;
    }
  },
  quitAuth() { authSes = null; location.hash = "examhub"; },

  /* Открытые */
  openField(cid, i, v) { openState[cid].fields[i] = v; },
  toggleModel(cid) { openState[cid].showModel = !openState[cid].showModel; renderOpen(cid); },
  async aiCheck(cid) {
    if (!S.tutor.key) { alert("Для AI-проверки вставь API-ключ Anthropic в разделе «AI-тренер» (хранится только в браузере)."); return; }
    const q = openCases().find(x => x.id === cid);
    const st = openState[cid];
    const answer = st.fields.map((f, i) => `(${i + 1}) ${f || "[пусто]"}`).join("\n");
    if (!st.fields.some(f => f.trim())) { alert("Сначала заполни хотя бы пару пунктов конструктора."); return; }
    st.aiLoading = true; st.ai = null; renderOpen(cid);
    const system = "Ты — строгий, но доброжелательный экзаменатор ВШБ НИУ ВШЭ по стратегическому менеджменту. Оцениваешь ответ на открытый вопрос (12 баллов) по критериям курса: корректность применения концепций С УКАЗАНИЕМ АВТОРОВ, логика аргументации, использование фактов кейса, отсутствие методологических ошибок. Отвечай по-русски, кратко и предметно.";
    const user = `КЕЙС: ${q.case}. ВОПРОС: ${q.stem}\n\nРУБРИКА (что должно прозвучать):\n${q.must.map((m, i) => (i + 1) + ". " + m).join("\n")}\n\nТИПИЧНЫЕ ОШИБКИ: ${q.errors.join("; ")}\n\nОТВЕТ СТУДЕНТА:\n${answer}\n\nДай оценку строго в формате:\n**Балл: X/12**\n**Засчитано:** какие пункты рубрики и авторы названы верно.\n**Пропущено:** каких концепций/авторов/фактов не хватает.\n**Ошибки:** методологические ошибки, если есть.\n**Как улучшить:** 1–3 конкретных совета.`;
    try { st.ai = await callClaudeS2(system, user); touchActivity("ai"); }
    catch (e) { st.ai = "⚠️ Ошибка: " + e.message; }
    st.aiLoading = false; renderOpen(cid);
  }
};

/* перерисовать с учётом новых маршрутов (на случай прямого захода по hash) */
navigate();
