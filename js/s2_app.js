/* Экзамен ВШБ — движок 4-частного формата, trap-drills, банк концепций, прогресс.
   Встраивается в роутер app.js (общие routes, S, save, esc, shuffle, plural, $). */
"use strict";

const S2_LET5 = "АБВГД", S2_LET6 = "АБВГДЕ";
const ALL2 = () => S2.DEMO.concat(S2.BANK);
// мини-форматтер: **жирный** и *курсив* (после экранирования)
const fmt = s => esc(s || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
const revealed = {}; // состояние «раскрыто» для активного вспоминания

/* ---- состояние ---- */
function s2init() {
  if (!S.s2) S.s2 = { q: {}, exams: [], traps: {} };
  if (!S.s2.q) S.s2.q = {};
  if (!S.s2.exams) S.s2.exams = [];
  if (!S.s2.traps) S.s2.traps = {};
}
function s2Record(qid, topic, part, ok) {
  s2init();
  const r = S.s2.q[qid] || { r: 0, w: 0, topic, part };
  if (ok) r.r++; else r.w++;
  r.lastOk = ok; r.topic = topic; r.part = part;
  S.s2.q[qid] = r; touchActivity("s2"); save();
  if (window.gxp) gxp(qid.indexOf("trap-") === 0 ? "trap" : qid.indexOf("auth-") === 0 ? "auth" : "q", ok);
}
function themeStats(topic) {
  let r = 0, w = 0, seen = 0;
  Object.values(S.s2.q).forEach(x => { if (x.topic === topic) { r += x.r; w += x.w; seen++; } });
  const acc = (r + w) ? r / (r + w) : 0;
  return { r, w, seen, acc, n: r + w };
}
function partStats(part) {
  let r = 0, w = 0;
  Object.values(S.s2.q).forEach(x => { if (x.part === part) { r += x.r; w += x.w; } });
  return { r, w, acc: (r + w) ? r / (r + w) : 0, n: r + w };
}

/* ---- проверка part 3 (впиши понятие) ---- */
function s2norm(s) { return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9 ]/gi, " ").replace(/\s+/g, " ").trim(); }
function s2lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function fillOk(input, accept) {
  const n = s2norm(input); if (!n || n.length < 2) return false;
  return accept.some(a => {
    const na = s2norm(a); if (!na) return false;
    if (n === na) return true;
    if (na.length >= 5 && (n.includes(na) || na.includes(n))) return true;
    return s2lev(n, na) <= Math.max(1, Math.floor(na.length * 0.2));
  });
}
const setEq = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();

/* ================= ХАБ ЭКЗАМЕНА ================= */
routes.examhub = () => {
  s2init();
  const last = S.s2.exams[S.s2.exams.length - 1];
  const weak = [];
  Object.values(S.s2.q).forEach(x => { if (x.w > 0 && x.lastOk === false) weak.push(x); });

  const heat = S2.THEMES.map(t => {
    const st = themeStats(t.id);
    const c = !st.n ? "#222b3a" : st.acc >= 0.8 ? "#2f7d4f" : st.acc >= 0.6 ? "#8a7a2a" : st.acc >= 0.4 ? "#9a5a2a" : "#8a2f3f";
    return `<div class="heat-cell" style="background:${c}" title="${esc(t.title)}: ${st.n ? Math.round(st.acc*100)+'% ('+st.n+')' : 'нет данных'}" onclick="location.hash='s2concepts/${t.id}'">
      <span class="ht-n">${t.id}</span><span class="ht-acc">${st.n ? Math.round(st.acc*100)+"%" : "—"}</span></div>`;
  }).join("");

  const L = (typeof levelInfo === "function") ? levelInfo() : null;
  const quests = (typeof ensureQuests === "function") ? ensureQuests() : [];
  const na = (typeof nextAction === "function") ? nextAction() : null;
  const earned = (typeof BADGES !== "undefined") ? BADGES.filter(b => S.s2.badges && S.s2.badges[b.id]) : [];
  $("#main").innerHTML = `
  <h1 class="view-title">🎓 Экзамен ВШБ — тренажёр</h1>
  <div class="view-sub">Формат реального экзамена: 90 минут, 100 баллов, 4 части. Реальный экзамен ТЯЖЕЛЕЕ демо — тренируемся с запасом.</div>

  ${L ? `<div class="card game-bar" style="margin-bottom:14px">
    <div class="game-top">
      <div class="xp-block"><div class="xp-lvl">⭐ Уровень ${L.lvl} · ${esc(L.title)}</div><div class="xp-track"><i style="width:${L.pct}%"></i></div><div class="tiny muted">${L.inLevel}/${L.need} XP до следующего уровня · всего ${L.xp} XP</div></div>
      ${na ? `<div class="next-action"><div class="tiny muted">Не знаешь, с чего начать?</div><button class="btn" onclick="App4.go()">▶ ${esc(na.label)}</button><div class="tiny muted">${esc(na.why)}</div></div>` : ""}
    </div>
    <div class="quests">
      ${quests.map(q => `<div class="quest ${q.done ? "done" : ""}" onclick="location.hash='${q.hash}'">
        <span class="q-ic">${q.done ? "✅" : q.icon}</span>
        <div style="flex:1"><div class="tiny" style="font-weight:600">${esc(q.label)}</div><div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, Math.round(100 * q.prog / q.target))}%;background:${q.done ? "var(--acc2)" : "var(--acc)"}"></i></div></div>
        <span class="tiny muted">${Math.min(q.prog, q.target)}/${q.target}${q.done ? "" : " ·+" + q.xp}</span>
      </div>`).join("")}
    </div>
    ${earned.length ? `<div class="badges">${earned.map(b => `<span class="badge-chip" title="${esc(b.desc)}">${b.icon} ${esc(b.name)}</span>`).join("")}</div>` : `<div class="tiny muted" style="margin-top:8px">🏅 Бейджи появятся по мере прогресса (${BADGES.length} всего)</div>`}
  </div>` : ""}

  <div class="grid g2">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
        <div><b>💀 Полная симуляция</b><div class="tiny muted mt8">12 одиночных + 6 множественных + 8 «впиши понятие» + 4 открытых.<br>Таймер 90 мин · автопроверка ч.1–3 · самопроверка ч.4.</div></div>
      </div>
      <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn bad" onclick="App2.startExam('demo')">Демо-вариант</button>
        <button class="btn" onclick="App2.startExam('mix')">Случайный вариант</button>
      </div>
      ${last ? `<div class="tiny muted mt16">Последний результат: <b style="color:var(--tx)">${last.total}/100</b> · оценка ${gradeFor(last.total)}/10 · ${last.date}</div>` : ""}
    </div>
    <div class="card">
      <b>🔥 Тепловая карта тем</b>
      <div class="tiny muted mt8">Где проседаешь (клик — к концепциям темы):</div>
      <div class="heat-grid mt8">${heat}</div>
      <div class="heat-legend tiny muted mt8"><span style="color:#3fae6a">■</span> ≥80 &nbsp; <span style="color:#c2a93a">■</span> 60–79 &nbsp; <span style="color:#c2772a">■</span> 40–59 &nbsp; <span style="color:#c23f56">■</span> &lt;40 &nbsp; <span style="color:#5f6b7d">■</span> нет данных</div>
    </div>
  </div>

  <div class="card mt16" style="border-color:var(--acc);cursor:pointer" onclick="location.hash='today'">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><b>🗓 Сегодня</b> <span class="tiny muted">— дневная сессия по кривой забывания</span>
        <div class="tiny muted mt8">К повторению: <b style="color:var(--bad)">${srsDue().length}</b> · новых: <b style="color:var(--acc)">${srsNew().length}</b></div></div>
      <button class="btn sm" onclick="event.stopPropagation();location.hash='today'">Открыть план →</button>
    </div>
  </div>

  <div class="quick mt16">
    <a href="#s2open"><div class="qi">✍️</div><div class="qt">Открытые вопросы (ч.4)</div><div class="qd">48% оценки · конструктор + эталон + проверка ИИ</div></a>
    <a href="#traps"><div class="qi">🎯</div><div class="qt">Trap-drills</div><div class="qd">различение путаемых концепций — ядро экзамена</div></a>
    <a href="#s2authors"><div class="qi">🏷</div><div class="qt">Атрибуция авторов</div><div class="qd">кто автор? / что за концепция?</div></a>
    <a href="#s2cases"><div class="qi">🏢</div><div class="qt">Библиотека кейсов</div><div class="qd">реальные компании · «спросят любой»</div></a>
    <a href="#sprint"><div class="qi">⚡</div><div class="qt">Фокус-спринт</div><div class="qd">5 минут · быстрые вопросы · под СДВГ</div></a>
    <a href="#s2practice"><div class="qi">🧠</div><div class="qt">Тренировка по темам</div><div class="qd">банк с разбором дистракторов</div></a>
    <a href="#s2concepts"><div class="qi">📖</div><div class="qt">Банк концепций</div><div class="qd">активное вспоминание · крючки памяти</div></a>
    <a href="#s2compare"><div class="qi">⚖️</div><div class="qt">Сравнения пар</div><div class="qd">X vs Y — как не перепутать</div></a>
  </div>

  ${weak.length ? `<div class="card mt16"><b>📌 Что повторить</b><div class="tiny muted mt8">Реально заваленные вопросы:</div>
    <div class="weak-list mt8">${weak.slice(0, 8).map(x => { const q = ALL2().find(q => q.id === x.id); const t = S2.themeById(x.topic); return q ? `<div class="weak-item"><span>${esc(q.framework)} <span class="tiny muted">(тема ${x.topic}: ${esc(t ? t.short : "")})</span></span><span class="pill" style="color:var(--bad)">ч.${x.part}</span></div>` : ""; }).join("")}</div></div>` : ""}

  <div class="card mt16">
    <b>Шкала и структура</b>
    <div class="tiny muted mt8">Ч.1 — 12×2 = 24 балла · Ч.2 — 6×2 = 12 (только за полностью верный набор) · Ч.3 — 8×2 = 16 · Ч.4 — 4×12 = 48. Итого 100. Оценка: 96–100→10, 90–95→9, 80–89→8, 75–79→7, 70–74→6, 60–69→5, 50–59→4 (порог).</div>
  </div>`;
};

/* ================= БАНК КОНЦЕПЦИЙ ================= */
routes.s2concepts = (tid) => {
  if (tid) return s2ThemeDetail(+tid);
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">📖 Банк концепций</h1>
  <div class="view-sub">Учим через активное вспоминание: сначала пробуешь вспомнить сам, потом проверяешь. По каждой концепции — суть, крючок для памяти, ловушка и пример.</div>
  <div class="card" style="margin-bottom:14px;border-color:var(--teal);cursor:pointer" onclick="location.hash='s2compare'">
    <b>⚖️ Сравнение путаемых пар</b>
    <div class="tiny muted mt8">Таблицы «X vs Y» бок о бок (${S2.COMPARE.length} пар): чем отличаются и как не перепутать на экзамене.</div>
  </div>
  <div class="mod-grid">
    ${S2.THEMES.map(t => `<div class="mod-card" onclick="location.hash='s2concepts/${t.id}'">
      <div class="stripe" style="background:var(--acc)"></div>
      <h3>${t.id}. ${esc(t.title)}</h3>
      <div class="sub">${esc(t.short)}</div>
      <div class="meta"><span class="pill">${t.concepts.length} концепц.</span>${S2.comparesByTopic(t.id).length ? `<span class="pill" style="color:var(--teal)">${S2.comparesByTopic(t.id).length} сравн.</span>` : ""}</div>
    </div>`).join("")}
  </div>`;
};
function s2ThemeDetail(tid) {
  const t = S2.themeById(tid); if (!t) { location.hash = "s2concepts"; return; }
  const allOpen = t.concepts.every((_, i) => revealed[tid + "-" + i]);
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='s2concepts'">← все темы</div>
  <h1 class="view-title">${t.id}. ${esc(t.title)}</h1>
  <div class="view-sub">${esc(t.short)} · <span class="tiny">сначала вспомни — потом раскрой</span></div>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <button class="btn sm" onclick="App2.startPractice({topic:${t.id}})">🧠 Вопросы по теме</button>
    <button class="btn sm ghost" onclick="App2.startTraps(${t.id})">🎯 Trap-drills</button>
    ${S2.comparesByTopic(tid).length ? `<button class="btn sm ghost" onclick="location.hash='s2compare/${tid}'">⚖️ Сравнения (${S2.comparesByTopic(tid).length})</button>` : ""}
    <button class="btn sm ghost" onclick="App2.revealAll(${tid},${allOpen ? "false" : "true"})">${allOpen ? "Скрыть всё" : "Раскрыть всё"}</button>
  </div>
  ${t.concepts.map((c, i) => {
    const open = revealed[tid + "-" + i];
    return `<div class="concept-card ${open ? "open" : ""}" id="cc2-${tid}-${i}">
      <div class="cc-head" onclick="App2.reveal(${tid},${i})">
        <div style="flex:1">
          <div class="cc-name">${esc(c.name)}</div>
          <div class="cc-auth">📖 ${esc(c.authors)}</div>
        </div>
        <span class="pill">ч. ${esc(c.part)}</span>
        <span class="cc-toggle">${open ? "−" : "💭"}</span>
      </div>
      ${open ? `
        <div class="cc-body">
          <div class="essence">${fmt(c.essence)}</div>
          <div class="hook"><span class="hook-ic">🧲</span><div><b>Как запомнить:</b> ${fmt(c.hook)}</div></div>
          <div class="block block-def"><div class="block-t">Определение</div><p>${fmt(c.def)}</p></div>
          <div class="block block-trap"><div class="block-t">⚠️ Ловушка</div><p>${fmt(c.trap)}</p></div>
          ${c.confusable && c.confusable.length ? `<div class="tiny muted" style="margin:10px 0">Путают с: ${c.confusable.map(x => `<span class="pill">${esc(x)}</span>`).join(" ")}</div>` : ""}
          <div class="block block-ex"><div class="block-t">📌 Пример</div><p>${fmt(c.mini)}</p></div>
        </div>`
      : `<div class="cc-recall">Вспомни: <b>суть · крючок · ловушку · пример</b> — затем нажми, чтобы проверить</div>`}
    </div>`;
  }).join("")}`;
}

/* ===== СРАВНЕНИЯ ПУТАЕМЫХ ПАР ===== */
routes.s2compare = (arg) => {
  const topic = arg ? +arg : 0;
  const list = topic ? S2.comparesByTopic(topic) : S2.COMPARE;
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='s2concepts'">← банк концепций</div>
  <h1 class="view-title">⚖️ Сравнение путаемых пар</h1>
  <div class="view-sub">${topic ? "Тема " + topic + ". " : ""}Главный навык экзамена — различить похожие концепции. Смотри различие построчно и запомни «как не перепутать».</div>
  ${topic ? `<div class="tiny muted" style="margin-bottom:14px"><a onclick="location.hash='s2compare'" style="cursor:pointer">← показать все ${S2.COMPARE.length} пар</a></div>` : ""}
  ${list.map(cmp => `
    <div class="card cmp-card">
      <table class="cmp-table">
        <tr><th class="cmp-aspect"></th>
          <th class="cmp-a">${esc(cmp.a)}<div class="cmp-auth">${esc(cmp.aA)}</div></th>
          <th class="cmp-b">${esc(cmp.b)}<div class="cmp-auth">${esc(cmp.aB)}</div></th></tr>
        ${cmp.rows.map(r => `<tr><td class="cmp-aspect">${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}
      </table>
      <div class="cmp-rule"><b>🎯 Как не перепутать:</b> ${esc(cmp.rule)}</div>
    </div>`).join("")}`;
};

/* ================= TRAP-DRILLS ================= */
let trapSes = null;
routes.traps = () => {
  if (trapSes) return renderTrap();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">🎯 Trap-drills</h1>
  <div class="view-sub">«Выбери более точную концепцию». Тренирует главный навык экзамена — различать похожие концепции в конкретной ситуации.</div>
  <div class="card"><p>${S2.TRAPS.length} упражнений на путаемые пары: ОЭ vs эмерджентная, компетенция vs ригидность, голубой океан vs провальная зона, Ур.2 vs Ур.3, CSV vs филантропия, VRIO без O vs нехватка ресурсов, CAGE-дистанции и др.</p>
    <button class="btn mt16" onclick="App2.startTraps()">Начать (${S2.TRAPS.length}) →</button></div>`;
};
function renderTrap() {
  const d = trapSes.list[trapSes.idx];
  const ans = trapSes.answers[trapSes.idx];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="back-link" onclick="App2.quitTraps()">← выйти</div>
    <div class="q-progress">${trapSes.list.map((_, i) => { const a = trapSes.answers[i]; return `<i class="${i === trapSes.idx ? "cur" : a ? (a.ok ? "ok" : "no") : ""}"></i>`; }).join("")}</div>
    <div class="q-card">
      <div class="q-meta"><span class="pill">${esc(d.pair)}</span><span class="pill">${trapSes.idx + 1}/${trapSes.list.length}</span></div>
      <div class="q-text">${esc(d.scenario)}</div>
      <div class="tiny muted" style="margin-bottom:10px">Какая концепция точнее?</div>
      ${d.options.map((o, i) => {
        let cls = "opt";
        if (ans) { if (i === d.correct) cls += " sel-ok"; else if (i === ans.pick) cls += " sel-no"; }
        return `<button class="${cls}" ${ans ? "disabled" : ""} onclick="App2.answerTrap(${i})">${esc(o)}</button>`;
      }).join("")}
      ${ans ? `<div class="expl"><b>${ans.ok ? "✅ Точно!" : "❌ Точнее: " + esc(d.options[d.correct])}</b><br>${esc(d.why)}</div>
        <div class="q-foot"><span></span><button class="btn" onclick="App2.nextTrap()">${trapSes.idx + 1 < trapSes.list.length ? "Дальше →" : "Итог"}</button></div>` : ""}
    </div>
  </div>`;
}

/* ================= ТРЕНИРОВКА ПО ТЕМАМ ================= */
routes.s2practice = () => {
  if (prSes) return renderPractice();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">🧠 Тренировка по темам</h1>
  <div class="view-sub">Банк вопросов с фильтром. После ответа — почему верно И почему неверен каждый дистрактор.</div>
  <div class="card">
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <label class="tiny muted">Тема<br><select id="pr-topic"><option value="0">все темы</option>${S2.THEMES.map(t => `<option value="${t.id}">${t.id}. ${esc(t.title)}</option>`).join("")}</select></label>
      <label class="tiny muted">Часть<br><select id="pr-part"><option value="0">части 1–3</option><option value="1">часть 1 (одиночный)</option><option value="2">часть 2 (множественный)</option><option value="3">часть 3 (впиши)</option></select></label>
      <button class="btn" onclick="App2.startPractice({topic:+document.getElementById('pr-topic').value, part:+document.getElementById('pr-part').value})">Начать →</button>
    </div>
    <div class="tiny muted mt16">Доступно: ${ALL2().filter(q => q.part <= 3).length} вопросов частей 1–3 (банк расширяется).</div>
  </div>`;
};
let prSes = null;
function renderPractice() {
  const q = prSes.list[prSes.idx];
  const ans = prSes.answers[prSes.idx];
  const t = S2.themeById(q.topic);
  let body = "";
  if (q.part === 1) {
    body = q.options.map((o, i) => {
      let cls = "opt";
      if (ans) { if (i === q.correct) cls += " sel-ok"; else if (i === ans.pick) cls += " sel-no"; }
      return `<button class="${cls}" ${ans ? "disabled" : ""} onclick="App2.answerPr(${i})">${S2_LET5[i]}. ${esc(o)}</button>`;
    }).join("");
  } else if (q.part === 2) {
    const sel = prSes.sel || [];
    body = q.options.map((o, i) => {
      let cls = "opt opt-check";
      if (ans) { if (q.correct.includes(i)) cls += " sel-ok"; else if (sel.includes(i)) cls += " sel-no"; }
      else if (sel.includes(i)) cls += " checked";
      return `<button class="${cls}" ${ans ? "disabled" : ""} onclick="App2.togglePr(${i})">${S2_LET6[i]}. ${esc(o)}</button>`;
    }).join("");
    if (!ans) body += `<button class="btn mt8" onclick="App2.submitPr()">Проверить</button>`;
  } else {
    body = `<input type="text" id="pr-fill" placeholder="Впишите понятие${q.needAuthor ? " и автора" : ""}…" ${ans ? "disabled" : ""} value="${ans ? esc(ans.text) : ""}" style="width:100%">
      ${q.needAuthor ? `<div class="tiny muted mt8">Требуется указать и автора: ${esc(q.needAuthor)}</div>` : ""}
      ${q.needElement ? `<div class="tiny muted mt8">Требуется конкретный элемент: ${esc(q.needElement)}</div>` : ""}
      ${!ans ? `<button class="btn mt8" onclick="App2.submitFill()">Проверить</button>` : ""}`;
  }
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="back-link" onclick="App2.quitPractice()">← выйти</div>
    <div class="q-progress">${prSes.list.map((_, i) => { const a = prSes.answers[i]; return `<i class="${i === prSes.idx ? "cur" : a ? (a.ok ? "ok" : "no") : ""}"></i>`; }).join("")}</div>
    <div class="q-card">
      <div class="q-meta"><span class="pill" style="color:var(--acc)">тема ${q.topic}: ${esc(t ? t.short : "")}</span><span class="pill">часть ${q.part}</span><span class="pill">${"⭐".repeat(q.difficulty || 3)}</span></div>
      <div class="q-text">${esc(q.stem)}</div>
      ${body}
      ${ans ? s2Explain(q, ans) : ""}
      ${ans ? `<div class="q-foot"><span class="tiny muted">${(q.authors || []).filter(a => a !== "—").length ? "Авторы: " + q.authors.filter(a => a !== "—").join(", ") : ""}</span><button class="btn" onclick="App2.nextPr()">${prSes.idx + 1 < prSes.list.length ? "Дальше →" : "Итог"}</button></div>` : ""}
    </div>
  </div>`;
  if (q.part === 3 && !ans) { const el = $("#pr-fill"); if (el) { el.focus(); el.onkeydown = e => { if (e.key === "Enter") App2.submitFill(); }; } }
}
function s2Explain(q, ans) {
  let h = `<div class="expl"><b>${ans.ok ? "✅ Верно!" : "❌ " + (q.part === 3 ? "Правильно: " + (q.accept[0] || "") : "Неверно")}</b><br>${esc(q.rationale_correct || "")}</div>`;
  if ((q.part === 1 || q.part === 2) && q.rationale_distractors) {
    h += `<div class="tiny muted mt8"><b>Почему неверны другие:</b><ul style="margin:6px 0 0 18px">${q.options.map((o, i) => {
      const isCorrect = q.part === 1 ? i === q.correct : q.correct.includes(i);
      const r = q.rationale_distractors[i];
      return (!isCorrect && r) ? `<li><b>${(q.part === 1 ? S2_LET5 : S2_LET6)[i]}</b> — ${esc(r)}</li>` : "";
    }).join("")}</ul></div>`;
  }
  return h;
}

/* ================= ЭКЗАМЕН (90 мин) ================= */
let ex2 = null;
function buildExam2(mode) {
  const pool = mode === "demo" ? S2.DEMO : ALL2();
  const pick = (part, n) => { const arr = shuffle(pool.filter(q => q.part === part)); return (mode === "demo" ? S2.DEMO.filter(q => q.part === part) : arr).slice(0, n); };
  const p4 = (mode === "demo" ? S2.DEMO : ALL2()).filter(q => q.part === 4).slice(0, 4);
  const list = [].concat(pick(1, 12), pick(2, 6), pick(3, 8), p4);
  return list;
}
routes.examrun = () => { if (ex2) return renderExam2(); location.hash = "examhub"; };
function renderExam2() {
  const q = ex2.list[ex2.idx];
  const a = ex2.ans[q.id];
  let body = "";
  if (q.part === 1) {
    body = q.options.map((o, i) => `<button class="opt ${a === i ? "sel-ok" : ""}" onclick="App2.exPick(${i})">${S2_LET5[i]}. ${esc(o)}</button>`).join("");
  } else if (q.part === 2) {
    const sel = a || [];
    body = `<div class="tiny muted" style="margin-bottom:8px">Верных может быть несколько; количество не сообщается.</div>` +
      q.options.map((o, i) => `<button class="opt opt-check ${sel.includes(i) ? "checked" : ""}" onclick="App2.exToggle(${i})">${S2_LET6[i]}. ${esc(o)}</button>`).join("");
  } else if (q.part === 3) {
    body = `<input type="text" id="ex-fill" placeholder="Впишите понятие${q.needAuthor ? " и автора" : ""}…" value="${a ? esc(a) : ""}" oninput="App2.exFill(this.value)" style="width:100%">
      ${q.needAuthor ? `<div class="tiny muted mt8">Не забудьте автора.</div>` : ""}${q.needElement ? `<div class="tiny muted mt8">Укажите конкретный элемент модели.</div>` : ""}`;
  } else {
    body = `<div class="case-context">${esc(q.case ? "Кейс: " + q.case : "")}</div>
      <textarea id="ex-open" rows="8" placeholder="Развёрнутый ответ (~0,5–1 страница): концепции + авторы + факты кейса…" oninput="App2.exOpen(this.value)" style="width:100%">${a && a.text ? esc(a.text) : ""}</textarea>
      <div class="tiny muted mt8">Проверка — самооценка после сдачи: откроется каркас эталонного ответа.</div>`;
  }
  const partName = { 1: "Часть 1 · одиночный выбор", 2: "Часть 2 · множественный (all-or-nothing)", 3: "Часть 3 · впиши понятие", 4: "Часть 4 · открытый вопрос" }[q.part];
  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="exam-bar">
      <b>Q${ex2.idx + 1}/${ex2.list.length}</b>
      <span class="tiny muted">${partName}</span>
      <span class="timer ${ex2.remain < 300 ? "low" : ""}" id="ex2-timer">${fmt2(ex2.remain)}</span>
      <button class="btn sm warn" onclick="App2.submitExam(true)">Сдать</button>
    </div>
    <div class="q-card">
      <div class="q-text">${esc(q.stem)}</div>
      ${body}
      <div class="q-foot">
        <button class="btn ghost sm" ${ex2.idx === 0 ? "disabled" : ""} onclick="App2.exGo(${ex2.idx - 1})">← Назад</button>
        <button class="btn sm" ${ex2.idx >= ex2.list.length - 1 ? "disabled" : ""} onclick="App2.exGo(${ex2.idx + 1})">Вперёд →</button>
      </div>
    </div>
    <div class="exam-nav">${ex2.list.map((qq, i) => { const ans = ex2.ans[qq.id]; const done = qq.part === 2 ? (ans && ans.length) : qq.part === 4 ? (ans && ans.text) : (ans != null && ans !== ""); return `<button class="${done ? "answered" : ""} ${i === ex2.idx ? "cur" : ""}" onclick="App2.exGo(${i})">${i + 1}</button>`; }).join("")}</div>
  </div>`;
}
function fmt2(s) { const m = Math.floor(s / 60), ss = s % 60; return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; }
function ex2Tick() {
  if (!ex2 || ex2.done) return;
  ex2.remain--;
  const t = $("#ex2-timer"); if (t) { t.textContent = fmt2(ex2.remain); t.classList.toggle("low", ex2.remain < 300); }
  if (ex2.remain <= 0) return App2.submitExam(false);
  ex2.timer = setTimeout(ex2Tick, 1000);
}
function examResults2() {
  const byPart = { 1: { e: 0, m: 0 }, 2: { e: 0, m: 0 }, 3: { e: 0, m: 0 }, 4: { e: 0, m: 0 } };
  const byTheme = {};
  const addTheme = (t, e, m) => { byTheme[t] = byTheme[t] || { e: 0, m: 0 }; byTheme[t].e += e; byTheme[t].m += m; };
  ex2.list.forEach(q => {
    const a = ex2.ans[q.id];
    let earned = 0; const max = q.part === 4 ? 12 : 2;
    let ok = false;
    if (q.part === 1) { ok = a === q.correct; earned = ok ? 2 : 0; s2Record(q.id, q.topic, 1, ok); }
    else if (q.part === 2) { ok = a && setEq(a, q.correct); earned = ok ? 2 : 0; s2Record(q.id, q.topic, 2, !!ok); }
    else if (q.part === 3) { ok = a && fillOk(a, q.accept); earned = ok ? 2 : 0; s2Record(q.id, q.topic, 3, !!ok); }
    else { const sc = (ex2.self && ex2.self[q.id]) || 0; earned = sc; ok = sc / 12 >= 0.6; s2Record(q.id, q.topic, 4, ok); }
    byPart[q.part].e += earned; byPart[q.part].m += max;
    addTheme(q.topic, earned, max);
  });
  const total = Math.round(byPart[1].e + byPart[2].e + byPart[3].e + byPart[4].e);
  const grade = gradeFor(total);
  S.s2.exams.push({ date: todayStr(), total, parts: { 1: byPart[1].e, 2: byPart[2].e, 3: byPart[3].e, 4: byPart[4].e } }); save();

  const weakThemes = Object.entries(byTheme).map(([t, v]) => ({ t: +t, acc: v.m ? v.e / v.m : 0 })).filter(x => x.acc < 0.75).sort((a, b) => a.acc - b.acc).slice(0, 4);

  $("#main").innerHTML = `
  <div class="q-wrap">
    <div class="card result-hero">
      <div class="grade-badge" style="color:${grade >= 8 ? "var(--acc2)" : grade >= 5 ? "var(--warn)" : "var(--bad)"}">${grade}/10</div>
      <div class="big" style="font-size:34px;margin-top:10px">${total}/100</div>
      <div class="sub">${grade >= 8 ? "Сильно. Уровень выше демо. ⚔️" : grade >= 6 ? "Порог взят уверенно — добей слабые темы." : grade >= 4 ? "Сдал бы, но впритык. В trap-drills и банк." : "Ниже порога — нужна проработка концепций."}</div>
    </div>
    <div class="card mt16"><b>По частям</b>
      <table class="res-table"><tr><th>часть</th><th>балл</th><th>макс</th></tr>
      <tr><td>1 · одиночный выбор</td><td>${byPart[1].e}</td><td>24</td></tr>
      <tr><td>2 · множественный (all-or-nothing)</td><td>${byPart[2].e}</td><td>12</td></tr>
      <tr><td>3 · впиши понятие</td><td>${byPart[3].e}</td><td>16</td></tr>
      <tr><td>4 · открытые (самооценка)</td><td>${byPart[4].e}</td><td>48</td></tr></table>
    </div>
    ${weakThemes.length ? `<div class="card mt16"><b>🎯 Слабые темы</b>${weakThemes.map(w => { const t = S2.themeById(w.t); return `<div class="weak-item mt8"><span>${w.t}. ${esc(t.title)}</span><a class="btn sm ghost" href="#s2concepts/${w.t}">повторить</a></div>`; }).join("")}</div>` : ""}
    <div class="card mt16"><b>Разбор частей 1–3</b>
      ${ex2.list.filter(q => q.part <= 3).map((q, i) => {
        const a = ex2.ans[q.id];
        let ok, your;
        if (q.part === 1) { ok = a === q.correct; your = a != null ? S2_LET5[a] : "—"; }
        else if (q.part === 2) { ok = a && setEq(a, q.correct); your = a && a.length ? a.map(x => S2_LET6[x]).join("") : "—"; }
        else { ok = a && fillOk(a, q.accept); your = a || "—"; }
        const corr = q.part === 1 ? S2_LET5[q.correct] : q.part === 2 ? q.correct.map(x => S2_LET6[x]).join("") : q.accept[0];
        return `<div class="mt16"><div style="font-weight:600">${esc(q.stem.slice(0, 120))}${q.stem.length > 120 ? "…" : ""}</div>
          <div class="tiny mt8" style="color:${ok ? "var(--acc2)" : "var(--bad)"}">${ok ? "✅" : "❌"} твой ответ: ${esc(String(your))}${ok ? "" : " · верно: " + esc(String(corr))}</div>
          <div class="tiny muted mt8">${esc(q.rationale_correct || "")}</div></div>`;
      }).join("")}
    </div>
    <div class="card mt16"><b>Часть 4 — эталонные каркасы</b><div class="tiny muted mt8">Сверь свой ответ; баллы ты выставил сам.</div>
      ${ex2.list.filter(q => q.part === 4).map(q => `<div class="mt16"><div style="font-weight:700">${esc(q.case)}: ${esc(q.framework)}</div>
        <div class="tiny mt8"><b>Должно прозвучать:</b><ul style="margin:4px 0 0 18px">${q.must.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>
        <div class="tiny mt8" style="color:var(--bad)"><b>Типичные ошибки:</b> ${q.errors.join(" · ")}</div>
        <div class="tiny muted mt8">Твоя самооценка: ${(ex2.self && ex2.self[q.id]) || 0}/12</div></div>`).join("")}
    </div>
    <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" onclick="App2.startExam('mix')">Новый вариант</button><button class="btn ghost" onclick="location.hash='examhub'">В хаб</button></div>
  </div>`;
  ex2 = null;
}
/* самопроверка части 4 перед итогом */
function renderSelfCheck() {
  const opens = ex2.list.filter(q => q.part === 4);
  ex2.self = ex2.self || {};
  $("#main").innerHTML = `
  <div class="q-wrap">
    <h1 class="view-title">Самопроверка части 4</h1>
    <div class="view-sub">Отметь пункты, которые ты реально раскрыл в своём ответе. Балл (из 12) считается по доле раскрытых пунктов.</div>
    ${opens.map(q => {
      const checked = (ex2.selfChecks && ex2.selfChecks[q.id]) || [];
      return `<div class="card" style="margin-bottom:14px">
        <b>${esc(q.case)}: ${esc(q.framework)}</b>
        <div class="tiny muted mt8">${esc(q.stem)}</div>
        <div class="mt8"><b class="tiny">Каркас эталона — отметь раскрытое:</b>
          ${q.must.map((m, i) => `<label class="check-row"><input type="checkbox" ${checked.includes(i) ? "checked" : ""} onchange="App2.selfToggle('${q.id}',${i},${q.must.length})"> ${esc(m)}</label>`).join("")}
        </div>
        <div class="tiny mt8" style="color:var(--bad)"><b>Не допусти ошибок:</b> ${q.errors.join(" · ")}</div>
        <div class="tiny mt8">Самооценка: <b id="self-${q.id}">${ex2.self[q.id] || 0}</b>/12</div>
        <div class="mt8"><button class="btn sm" onclick="App3.aiExam('${q.id}')" ${(ex2.aiExam && ex2.aiExam[q.id] === "loading") ? "disabled" : ""}>${(ex2.aiExam && ex2.aiExam[q.id] === "loading") ? "Проверяю…" : "🤖 Жёсткая AI-оценка"}</button></div>
        ${(ex2.aiExam && ex2.aiExam[q.id] === "loading") ? `<div class="ai-box mt8"><span class="spin"></span> Строгий экзаменатор читает ответ…</div>` : ""}
        ${(ex2.aiExam && ex2.aiExam[q.id] && ex2.aiExam[q.id] !== "loading") ? `<div class="ai-box mt8"><div class="ai-head">🤖 Оценка ИИ</div><div class="ai-body">${fmt(ex2.aiExam[q.id]).replace(/\n/g, "<br>")}</div></div>` : ""}
      </div>`;
    }).join("")}
    <button class="btn" onclick="App2.finishExam()">Показать итог →</button>
  </div>`;
}

/* ================= ОБРАБОТЧИКИ ================= */
window.App2 = {
  startExam(mode) {
    s2init();
    ex2 = { list: buildExam2(mode), ans: {}, self: {}, selfChecks: {}, idx: 0, remain: 90 * 60, done: false };
    location.hash = "examrun"; renderExam2(); ex2Tick();
  },
  exPick(i) { ex2.ans[ex2.list[ex2.idx].id] = i; if (ex2.idx < ex2.list.length - 1) ex2.idx++; renderExam2(); },
  exToggle(i) { const id = ex2.list[ex2.idx].id; const a = ex2.ans[id] || []; const k = a.indexOf(i); if (k >= 0) a.splice(k, 1); else a.push(i); ex2.ans[id] = a; renderExam2(); },
  exFill(v) { ex2.ans[ex2.list[ex2.idx].id] = v; },
  exOpen(v) { const id = ex2.list[ex2.idx].id; ex2.ans[id] = { text: v }; },
  exGo(i) { ex2.idx = i; renderExam2(); },
  submitExam(ask) {
    if (!ex2) return;
    const blank = ex2.list.filter(q => { const a = ex2.ans[q.id]; return q.part === 2 ? !(a && a.length) : q.part === 4 ? !(a && a.text) : (a == null || a === ""); }).length;
    if (ask && blank > 0 && !confirm(`Без ответа: ${blank}. Точно сдать?`)) return;
    ex2.done = true; clearTimeout(ex2.timer);
    if (ex2.list.some(q => q.part === 4)) renderSelfCheck(); else examResults2();
  },
  selfToggle(qid, i, total) {
    ex2.selfChecks = ex2.selfChecks || {}; const arr = ex2.selfChecks[qid] || [];
    const k = arr.indexOf(i); if (k >= 0) arr.splice(k, 1); else arr.push(i);
    ex2.selfChecks[qid] = arr;
    ex2.self[qid] = Math.round(12 * arr.length / total);
    const el = document.getElementById("self-" + qid); if (el) el.textContent = ex2.self[qid];
  },
  finishExam() { examResults2(); },

  startTraps(topic) {
    const pool = topic ? S2.TRAPS.filter(t => t.topic === topic) : S2.TRAPS;
    trapSes = { list: shuffle(pool.length ? pool : S2.TRAPS), idx: 0, answers: [] };
    location.hash = "traps"; renderTrap();
  },
  answerTrap(i) {
    if (trapSes.answers[trapSes.idx]) return;
    const d = trapSes.list[trapSes.idx]; const ok = i === d.correct;
    trapSes.answers[trapSes.idx] = { pick: i, ok };
    s2Record("trap-" + (d.pair + d.scenario).slice(0, 24), d.topic, 0, ok);
    renderTrap();
  },
  nextTrap() {
    if (trapSes.idx + 1 < trapSes.list.length) { trapSes.idx++; renderTrap(); }
    else {
      const r = trapSes.answers.filter(a => a && a.ok).length, n = trapSes.list.length;
      $("#main").innerHTML = `<div class="q-wrap"><div class="card result-hero"><div class="big" style="color:${r / n >= 0.8 ? "var(--acc2)" : "var(--warn)"}">${r}/${n}</div>
        <div class="sub">${r === n ? "Идеальное различение! ⚔️" : "Перечитай ловушки в банке концепций по заваленным парам."}</div>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center"><button class="btn" onclick="App2.startTraps()">Ещё раз</button><button class="btn ghost" onclick="location.hash='examhub'">В хаб</button></div></div></div>`;
      trapSes = null;
    }
  },
  quitTraps() { trapSes = null; location.hash = "examhub"; },

  startPractice(f) {
    let pool = ALL2().filter(q => q.part <= 3);
    if (f.topic) pool = pool.filter(q => q.topic === f.topic);
    if (f.part) pool = pool.filter(q => q.part === f.part);
    if (!pool.length) { alert("По этому фильтру вопросов пока нет — банк расширяется. Выбери другую тему/часть."); return; }
    prSes = { list: shuffle(pool).slice(0, 12), idx: 0, answers: [], sel: [] };
    location.hash = "s2practice"; renderPractice();
  },
  answerPr(i) {
    if (prSes.answers[prSes.idx]) return;
    const q = prSes.list[prSes.idx]; const ok = i === q.correct;
    prSes.answers[prSes.idx] = { pick: i, ok };
    s2Record(q.id, q.topic, 1, ok); renderPractice();
  },
  togglePr(i) { const s = prSes.sel; const k = s.indexOf(i); if (k >= 0) s.splice(k, 1); else s.push(i); renderPractice(); },
  submitPr() {
    const q = prSes.list[prSes.idx]; const ok = setEq(prSes.sel, q.correct);
    prSes.answers[prSes.idx] = { sel: prSes.sel.slice(), ok };
    s2Record(q.id, q.topic, 2, ok); renderPractice();
  },
  submitFill() {
    const q = prSes.list[prSes.idx]; const v = ($("#pr-fill") || {}).value || "";
    const ok = fillOk(v, q.accept);
    prSes.answers[prSes.idx] = { text: v, ok };
    s2Record(q.id, q.topic, 3, ok); renderPractice();
  },
  nextPr() {
    if (prSes.idx + 1 < prSes.list.length) { prSes.idx++; prSes.sel = []; renderPractice(); }
    else {
      const r = prSes.answers.filter(a => a && a.ok).length, n = prSes.list.length;
      $("#main").innerHTML = `<div class="q-wrap"><div class="card result-hero"><div class="big" style="color:${r / n >= 0.8 ? "var(--acc2)" : "var(--warn)"}">${r}/${n}</div>
        <div class="sub">${r / n >= 0.8 ? "Отлично!" : "Слабые вопросы вернутся в «Что повторить»."}</div>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center"><button class="btn ghost" onclick="location.hash='s2practice'">Новый фильтр</button><button class="btn" onclick="location.hash='examhub'">В хаб</button></div></div></div>`;
      prSes = null;
    }
  },
  quitPractice() { prSes = null; location.hash = "s2practice"; routes.s2practice(); },

  reveal(tid, i) { const k = tid + "-" + i; revealed[k] = !revealed[k]; s2ThemeDetail(tid); const el = document.getElementById("cc2-" + tid + "-" + i); if (el) el.scrollIntoView({ block: "nearest" }); },
  revealAll(tid, on) { const t = S2.themeById(tid); t.concepts.forEach((_, i) => revealed[tid + "-" + i] = on); s2ThemeDetail(tid); }
};

/* ---- инициализация: сделать хаб экзамена стартовой страницей ---- */
s2init();
if (!location.hash || location.hash === "#" || location.hash === "#dashboard") { location.hash = "#examhub"; }
else { navigate(); }
