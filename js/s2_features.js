/* СТРАТЕГОС — дополнительные фичи: аналитика, избранное, ошибки, горячие клавиши,
   тема, таймер, статистика по авторам, соревновательный режим. */
"use strict";

/* ===== ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ===== */
function featuresInit() {
  s2init();
  if (!S.favorites) S.favorites = [];
  if (!S.dailyStats) S.dailyStats = {};
  if (!S.theme) S.theme = "dark";
  if (!S.bookmarkedQs) S.bookmarkedQs = {};
}

/* ===== 1. АНАЛИТИКА ПРОГРЕССА ===== */
function trackDaily(ok) {
  featuresInit();
  const d = todayStr();
  if (!S.dailyStats[d]) S.dailyStats[d] = { total: 0, correct: 0 };
  S.dailyStats[d].total++;
  if (ok) S.dailyStats[d].correct++;
  save();
}

function analyticsData() {
  featuresInit();
  const days = Object.entries(S.dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);
  return days.map(([date, v]) => ({
    date,
    total: v.total,
    correct: v.correct,
    pct: v.total ? Math.round(100 * v.correct / v.total) : 0
  }));
}

function analyticsSummary() {
  featuresInit();
  const all = Object.values(S.dailyStats);
  const totalQ = all.reduce((s, d) => s + d.total, 0);
  const totalR = all.reduce((s, d) => s + d.correct, 0);
  const days = all.length;
  const avg = totalQ ? Math.round(100 * totalR / totalQ) : 0;
  const streak = calcStreak();
  return { totalQ, totalR, days, avg, streak };
}

function calcStreak() {
  featuresInit();
  let n = 0;
  const d = new Date();
  if (!S.dailyStats[todayStr()]) d.setDate(d.getDate() - 1);
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (S.dailyStats[k] && S.dailyStats[k].total > 0) { n++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return n;
}

function renderMiniChart(data) {
  if (!data.length) return '<div class="tiny muted" style="text-align:center;padding:20px">Пока нет данных. Ответь на пару вопросов — и график появится.</div>';
  const w = 520, h = 140, pad = 30;
  const maxPct = 100;
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - (d.pct / maxPct) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `${pad},${h - pad} ${pts.join(" ")} ${pad + (data.length - 1) * step},${h - pad}`;

  return `<svg viewBox="0 0 ${w} ${h}" class="analytics-chart">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--acc)" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="var(--line)" stroke-width="1"/>
    <line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4"/>
    <polygon points="${area}" fill="url(#chartGrad)"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${data.map((d, i) => {
      const x = pad + i * step;
      const y = h - pad - (d.pct / maxPct) * (h - pad * 2);
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2"/>`;
    }).join("")}
    <text x="${pad}" y="${h - pad + 16}" fill="var(--tx3)" font-size="10" font-weight="600">${data[0].date.slice(5)}</text>
    <text x="${w - pad}" y="${h - pad + 16}" fill="var(--tx3)" font-size="10" font-weight="600" text-anchor="end">${data[data.length - 1].date.slice(5)}</text>
    <text x="${pad - 4}" y="${h - pad + 4}" fill="var(--tx3)" font-size="10" text-anchor="end">0%</text>
    <text x="${pad - 4}" y="${pad + 4}" fill="var(--tx3)" font-size="10" text-anchor="end">100%</text>
  </svg>`;
}

routes.analytics = () => {
  featuresInit();
  const data = analyticsData();
  const s = analyticsSummary();

  const weakThemes = S2.THEMES.map(t => {
    const st = themeStats(t.id);
    return { id: t.id, title: t.title, short: t.short, acc: st.n ? st.acc : -1, n: st.n };
  }).filter(t => t.n > 0).sort((a, b) => a.acc - b.acc);

  const partData = [1, 2, 3].map(p => {
    const ps = partStats(p);
    return { part: p, name: { 1: "Одиночный", 2: "Множественный", 3: "Впиши понятие" }[p], ...ps };
  });

  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">📊 Аналитика прогресса</h1>
  <div class="view-sub">Динамика по дням, слабые темы, статистика по частям экзамена.</div>

  <div class="stat-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
    <div class="stat"><div class="v">${s.totalQ}</div><div class="l">всего ответов</div></div>
    <div class="stat"><div class="v" style="color:var(--acc2)">${s.avg}%</div><div class="l">средняя точность</div></div>
    <div class="stat"><div class="v" style="color:var(--warn)">${s.streak}</div><div class="l">серия дней 🔥</div></div>
    <div class="stat"><div class="v">${s.days}</div><div class="l">дней занятий</div></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <b>Точность по дням (последние 30)</b>
    <div class="mt8">${renderMiniChart(data)}</div>
  </div>

  <div class="grid g2" style="margin-bottom:16px">
    <div class="card">
      <b>По частям экзамена</b>
      <div class="mt8">${partData.map(p => `
        <div class="mod-bar" style="grid-template-columns:100px 1fr 60px;padding:6px 0">
          <div class="nm" style="font-size:13px">ч.${p.part} ${p.name}</div>
          <div class="bar"><i style="width:${p.n ? Math.round(p.acc * 100) : 0}%;background:${p.acc >= 0.7 ? 'var(--acc2)' : p.acc >= 0.5 ? 'var(--warn)' : 'var(--bad)'}"></i></div>
          <div class="pc">${p.n ? Math.round(p.acc * 100) + '%' : '—'}</div>
        </div>`).join("")}</div>
    </div>
    <div class="card">
      <b>Темы по убыванию готовности</b>
      <div class="mt8 weak-list">${weakThemes.length ? weakThemes.map(t => `
        <div class="weak-item" onclick="location.hash='s2concepts/${t.id}'" style="cursor:pointer">
          <span>${t.id}. ${esc(t.short)}</span>
          <span class="pill" style="color:${t.acc >= 0.7 ? 'var(--acc2)' : t.acc >= 0.5 ? 'var(--warn)' : 'var(--bad)'}">${Math.round(t.acc * 100)}% <span class="tiny muted">(${t.n})</span></span>
        </div>`).join("") : '<div class="muted tiny">Нет данных</div>'}</div>
    </div>
  </div>`;
};

/* ===== 2. ИЗБРАННОЕ / ЗАКЛАДКИ ===== */
function toggleFavorite(qid) {
  featuresInit();
  const k = S.favorites.indexOf(qid);
  if (k >= 0) S.favorites.splice(k, 1); else S.favorites.push(qid);
  save();
}
function isFavorite(qid) {
  featuresInit();
  return S.favorites.includes(qid);
}
function getFavoriteQuestions() {
  featuresInit();
  const all = ALL2();
  return S.favorites.map(id => all.find(q => q.id === id)).filter(Boolean);
}

routes.favorites = () => {
  featuresInit();
  const favs = getFavoriteQuestions();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">⭐ Избранное</h1>
  <div class="view-sub">Сохранённые вопросы для повторения. ${favs.length} ${plural(favs.length, "вопрос", "вопроса", "вопросов")}.</div>
  ${favs.length ? `
    <div style="margin-bottom:14px"><button class="btn" onclick="App4.startFavQuiz()">🎯 Тренировка по избранному (${Math.min(12, favs.length)})</button></div>
    <div class="fav-list">${favs.map(q => {
      const t = S2.themeById(q.topic);
      const ans = S.s2.q[q.id];
      const ok = ans && ans.lastOk;
      return `<div class="fav-item ${ok === true ? 'fav-ok' : ok === false ? 'fav-no' : ''}">
        <div class="fav-head">
          <span class="pill" style="color:${ok === true ? 'var(--acc2)' : ok === false ? 'var(--bad)' : 'var(--tx3)'}">${ok === true ? '✅' : ok === false ? '❌' : '—'}</span>
          <span class="pill">ч.${q.part}</span>
          <span class="tiny muted">${t ? t.short : ''}</span>
        </div>
        <div class="fav-stem">${esc(q.stem.slice(0, 200))}${q.stem.length > 200 ? '…' : ''}</div>
        <div class="fav-actions">
          <button class="btn sm ghost" onclick="App4.removeFav('${q.id}')">✕ Убрать</button>
        </div>
      </div>`;
    }).join("")}</div>`
  : '<div class="card"><p class="muted">Пока нет избранных. Нажми ⭐ на любом вопросе в тренировке или экзамене, чтобы сохранить.</p></div>'}`;
};

/* ===== 3. РЕЖИМ «ОШИБКИ» ===== */
function getErrorQuestions() {
  featuresInit();
  return ALL2().filter(q => {
    const a = S.s2.q[q.id];
    return a && a.w > 0 && a.lastOk === false;
  });
}

routes.errors = () => {
  featuresInit();
  const errs = getErrorQuestions();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">❌ Ошибки</h1>
  <div class="view-sub">Вопросы, на которые ты ответил неверно. Повтори их, пока не станут зелёными.</div>
  ${errs.length ? `
    <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">
      <div class="stat"><div class="v" style="color:var(--bad)">${errs.length}</div><div class="l">ошибок</div></div>
      <div class="stat"><div class="v">${errs.filter(q => { const a = S.s2.q[q.id]; return a && a.w >= 3; }).length}</div><div class="l">хронических (3+ ошибки)</div></div>
      <div class="stat"><div class="v">${errs.filter(q => q.part === 3).length}</div><div class="l">термины (ч.3)</div></div>
    </div>
    <div style="margin-bottom:14px"><button class="btn bad" onclick="App4.startErrorQuiz()">🎯 Прогнать ошибки (${Math.min(12, errs.length)})</button></div>
    <div class="fav-list">${errs.sort((a, b) => (S.s2.q[b.id]?.w || 0) - (S.s2.q[a.id]?.w || 0)).map(q => {
      const t = S2.themeById(q.topic);
      const a = S.s2.q[q.id];
      return `<div class="fav-item fav-no">
        <div class="fav-head">
          <span class="pill" style="color:var(--bad)">❌ ${a.w}×</span>
          <span class="pill">ч.${q.part}</span>
          <span class="tiny muted">${t ? t.short : ''}</span>
        </div>
        <div class="fav-stem">${esc(q.stem.slice(0, 200))}${q.stem.length > 200 ? '…' : ''}</div>
        <div class="fav-actions">
          <button class="btn sm ghost" onclick="App4.removeError('${q.id}')">✓ Засчитано</button>
        </div>
      </div>`;
    }).join("")}</div>`
  : '<div class="card"><p style="color:var(--acc2)">🎉 Нет ошибок! Все вопросы пройдены верно.</p></div>'}`;
};

/* ===== 4. СТАТИСТИКА ПО АВТОРАМ ===== */
function authorStats() {
  featuresInit();
  const byAuthor = {};
  ALL2().forEach(q => {
    (q.authors || []).forEach(a => {
      if (a === "—") return;
      if (!byAuthor[a]) byAuthor[a] = { r: 0, w: 0, n: 0 };
      byAuthor[a].n++;
      const rec = S.s2.q[q.id];
      if (rec) { byAuthor[a].r += rec.r; byAuthor[a].w += rec.w; }
    });
  });
  return Object.entries(byAuthor)
    .map(([name, v]) => ({ name, ...v, acc: (v.r + v.w) ? v.r / (v.r + v.w) : -1 }))
    .sort((a, b) => a.acc - b.acc);
}

routes.authors = () => {
  featuresInit();
  const stats = authorStats();
  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">🏷 Статистика по авторам</h1>
  <div class="view-sub">Экзамен оценивает атрибуцию. Где ты weakest — туда бьём.</div>
  <div class="card">
    <div class="author-stats-list">${stats.map(s => `
      <div class="author-stat-row">
        <div class="author-name">${esc(s.name)}</div>
        <div class="author-bar-wrap">
          <div class="bar" style="flex:1"><i style="width:${s.acc >= 0 ? Math.round(s.acc * 100) : 0}%;background:${s.acc >= 0.7 ? 'var(--acc2)' : s.acc >= 0.5 ? 'var(--warn)' : s.acc >= 0 ? 'var(--bad)' : 'var(--tx3)'}"></i></div>
          <div class="author-pct">${s.acc >= 0 ? Math.round(s.acc * 100) + '%' : '—'}</div>
        </div>
        <div class="author-meta tiny muted">${s.r + s.w} ${plural(s.r + s.w, "ответ", "ответа", "ответов")} · ${s.n} ${plural(s.n, "вопрос", "вопроса", "вопросов")}</div>
      </div>`).join("")}</div>
  </div>`;
};

/* ===== 5. СОРЕВНОВАТЕЛЬНЫЙ РЕЖИМ ===== */
routes.compare2 = () => {
  featuresInit();
  const past = S.s2.exams.slice(-5).reverse();
  const best = past.length ? Math.max(...past.map(e => e.total)) : 0;
  const avg = past.length ? Math.round(past.reduce((s, e) => s + e.total, 0) / past.length) : 0;

  $("#main").innerHTML = `
  <div class="back-link" onclick="location.hash='examhub'">← хаб экзамена</div>
  <h1 class="view-title">⚔️ Соревнование</h1>
  <div class="view-sub">Сравни результаты с друзьями. Скинь им этот скриншот!</div>

  <div class="card" style="text-align:center;padding:30px">
    <div class="grade-badge" style="font-size:48px;margin-bottom:10px">${best || '—'}</div>
    <div class="tiny muted" style="font-size:16px">лучший результат / 100</div>
    <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-top:20px;max-width:400px;margin-left:auto;margin-right:auto">
      <div class="stat"><div class="v">${past.length}</div><div class="l">симуляций</div></div>
      <div class="stat"><div class="v">${avg}</div><div class="l">средний балл</div></div>
      <div class="stat"><div class="v">${gradeFor(best || 0)}/10</div><div class="l">оценка</div></div>
    </div>
  </div>

  ${past.length ? `<div class="card mt16"><b>История симуляций</b>
    <table class="res-table"><tr><th>дата</th><th>балл</th><th>оценка</th><th>части</th></tr>
    ${past.map(e => {
      const g = gradeFor(e.total);
      const parts = e.parts ? `ч.1:${e.parts['1']||0} ч.2:${e.parts['2']||0} ч.3:${e.parts['3']||0} ч.4:${e.parts['4']||0}` : '';
      return `<tr>
        <td>${e.date}</td>
        <td><b>${e.total}/100</b></td>
        <td style="color:${g >= 8 ? 'var(--acc2)' : g >= 5 ? 'var(--warn)' : 'var(--bad)'}">${g}/10</td>
        <td class="tiny muted">${parts}</td>
      </tr>`;
    }).join("")}</table></div>` : ''}

  <div class="card mt16">
    <b>Поделиться результатом</b>
    <div class="tiny muted mt8">Скопируй и отправь другу:</div>
    <div class="share-result mt8" id="share-text" onclick="App4.copyResult()">
      <pre>⚔️ СТРАТЕГОС\n${best || '—'}/100 · оценка ${gradeFor(best || 0)}/10\n${past.length} симуляций · серия ${calcStreak()} дней 🔥</pre>
      <div class="tiny muted mt8">нажми, чтобы скопировать</div>
    </div>
  </div>`;
};

/* ===== 6. СБОРЩИК ОШИБОК ДЛЯ СТАТИСТИКИ ===== */
function hookAnswerRecording() {
  const origRecord = s2Record;
  window._origS2Record = origRecord;
  const patched = function(qid, topic, part, ok) {
    origRecord(qid, topic, part, ok);
    trackDaily(ok);
  };
  window.s2Record = patched;
}

/* ===== 7. ОБРАБОТЧИКИ ===== */
window.App4 = {
  startFavQuiz() {
    featuresInit();
    const favs = getFavoriteQuestions();
    if (!favs.length) return;
    const list = shuffle(favs).slice(0, 12).map(q => {
      if (q.part === 1) return { ...q, options: q.options, correct: q.correct };
      return q;
    });
    prSes = { list, idx: 0, answers: [], sel: [] };
    location.hash = "s2practice";
    renderPractice();
  },
  removeFav(qid) {
    featuresInit();
    S.favorites = S.favorites.filter(id => id !== qid);
    save();
    routes.favorites();
  },
  startErrorQuiz() {
    featuresInit();
    const errs = getErrorQuestions();
    if (!errs.length) return;
    const list = shuffle(errs).slice(0, 12);
    prSes = { list, idx: 0, answers: [], sel: [] };
    location.hash = "s2practice";
    renderPractice();
  },
  removeError(qid) {
    featuresInit();
    if (S.s2.q[qid]) { S.s2.q[qid].w = Math.max(0, S.s2.q[qid].w - 1); save(); }
    routes.errors();
  },
  copyResult() {
    const el = document.getElementById("share-text");
    if (el) {
      const text = el.querySelector("pre").textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast("Скопировано!", "xp");
      }).catch(() => {});
    }
  }
};

/* ===== 8. ГОРЯЧИЕ КЛАВИШИ ===== */
function initHotkeys() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

    if (e.key === "Escape") {
      e.preventDefault();
      if (session) { session = null; navigate(); }
      else if (ex2) { ex2.done = true; clearTimeout(ex2.timer); location.hash = "examhub"; }
      else if (trapSes) { trapSes = null; location.hash = "examhub"; }
      else if (prSes) { prSes = null; routes.s2practice(); }
      else if (fcSession) { fcSession = null; navigate(); }
      else if (todaySes) { todaySes = null; navigate(); }
      else if (caseSession) { caseSession = null; location.hash = "cases"; routes.cases(); }
    }

    if (session && !session.answers[session.idx]) {
      if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        const q = session.list[session.idx];
        if (q && q.o && idx < q.o.length) App.answer(idx);
      }
    }

    if (ex2 && !ex2.done) {
      const q = ex2.list[ex2.idx];
      if (q.part === 1 && e.key >= "1" && e.key <= "5") {
        App2.exPick(parseInt(e.key) - 1);
      }
      if (q.part === 2 && e.key >= "1" && e.key <= "6") {
        App2.exToggle(parseInt(e.key) - 1);
      }
    }

    if (prSes && !prSes.answers[prSes.idx]) {
      const q = prSes.list[prSes.idx];
      if (q.part === 1 && e.key >= "1" && e.key <= "5") {
        App2.answerPr(parseInt(e.key) - 1);
      }
      if (q.part === 2 && e.key >= "1" && e.key <= "6") {
        App2.togglePr(parseInt(e.key) - 1);
      }
    }

    if (trapSes && !trapSes.answers[trapSes.idx]) {
      if (e.key === "1") App2.answerTrap(0);
      if (e.key === "2") App2.answerTrap(1);
    }

    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      if (session && session.answers[session.idx]) App.nextQ();
      else if (prSes && prSes.answers[prSes.idx]) App2.nextPr();
      else if (trapSes && trapSes.answers[trapSes.idx]) App2.nextTrap();
      else if (fcSession && fcSession.flipped) {
        const c = fcSession.list[fcSession.idx];
        App.rate(4);
      }
    }

    if (e.key === " " && !e.ctrlKey && !e.metaKey) {
      if (fcSession && !fcSession.flipped) { e.preventDefault(); App.flipCard(); }
      else if (todaySes && !todaySes.flipped) { e.preventDefault(); App3.flipToday(); }
    }
  });
}

/* ===== 9. ТЕМА ===== */
function applyTheme(theme) {
  featuresInit();
  S.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  save();
}

function toggleTheme() {
  featuresInit();
  applyTheme(S.theme === "dark" ? "light" : "dark");
  renderThemeButton();
}

function renderThemeButton() {
  featuresInit();
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerHTML = S.theme === "dark" ? "☀️" : "🌙";
}

/* ===== 10. ТАЙМЕР НА КАРТОЧКАХ ===== */
let cardTimerStart = 0;
let cardTimerInterval = null;

function startCardTimer() {
  cardTimerStart = Date.now();
  clearInterval(cardTimerInterval);
  cardTimerInterval = setInterval(updateCardTimer, 100);
}
function stopCardTimer() {
  clearInterval(cardTimerInterval);
  return Date.now() - cardTimerStart;
}
function updateCardTimer() {
  const el = document.getElementById("card-timer");
  if (!el) { clearInterval(cardTimerInterval); return; }
  const elapsed = Date.now() - cardTimerStart;
  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  el.textContent = `${mins}:${String(secs % 60).padStart(2, "0")}`;
}

/* ===== ИНИЦИАЛИЗАЦИЯ ===== */
document.addEventListener("DOMContentLoaded", () => {
  featuresInit();
  initHotkeys();
  hookAnswerRecording();
  applyTheme(S.theme);
});
