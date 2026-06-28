'use strict';

// ── Storage ───────────────────────────────────────────────────────────────────
const DB = {
  KEY_LOGS:     'hlt_logs_v3',
  KEY_UNLOCKED: 'hlt_unlocked_v3',
  KEY_START:    'hlt_start_v1',

  getLogs()      { try { return JSON.parse(localStorage.getItem(DB.KEY_LOGS))     || []; } catch { return []; } },
  getUnlocked()  { try { return JSON.parse(localStorage.getItem(DB.KEY_UNLOCKED)) || {}; } catch { return {}; } },
  saveLogs(l)    { localStorage.setItem(DB.KEY_LOGS,     JSON.stringify(l)); },
  saveUnlocked(u){ localStorage.setItem(DB.KEY_UNLOCKED, JSON.stringify(u)); },
  getStart() {
    let ts = parseInt(localStorage.getItem(DB.KEY_START)) || 0;
    if (!ts) { ts = Date.now(); localStorage.setItem(DB.KEY_START, String(ts)); }
    return ts;
  },
};

// ── Hábito único: Fumar ───────────────────────────────────────────────────────
const FUMAR = {
  id:        'fumar',
  name:      'Fumar',
  icon:      '🚬',
  color:     '#c2756a',
  unit:      'cigarrillos',
  createdAt: 0,
};

// ── Logros ────────────────────────────────────────────────────────────────────
const MILESTONES = [
  { days: 1,   emoji: '🌱', name: '1 día sin fumar',     desc: 'El primer paso es el más difícil' },
  { days: 3,   emoji: '🌿', name: '3 días sin fumar',    desc: 'Tu cuerpo ya empieza a agradecerlo' },
  { days: 7,   emoji: '🍃', name: '1 semana sin fumar',  desc: 'Una semana entera sin caer' },
  { days: 14,  emoji: '💪', name: '2 semanas sin fumar', desc: 'Estás construyendo algo nuevo' },
  { days: 30,  emoji: '🏅', name: '1 mes sin fumar',     desc: 'Un mes completo de autocontrol' },
  { days: 90,  emoji: '🔥', name: '3 meses sin fumar',   desc: '90 días de fortaleza' },
  { days: 180, emoji: '⭐', name: '6 meses sin fumar',   desc: 'Medio año de transformación' },
  { days: 365, emoji: '👑', name: '1 año sin fumar',     desc: 'Un año entero. ¡Sos increíble!' },
];

// ── App ───────────────────────────────────────────────────────────────────────
const App = {
  activeTab:   'today',
  statsPeriod: 'week',
  statsOffset: 0,
  logCount:    1,
  confirmCb:   null,

  DAILY_TIPS: [
    'Cuando llegue el antojo, bebé un vaso de agua y esperá 3 minutos. La mayoría pasan solos.',
    'Cada hora sin fumar es una pequeña victoria. Celebrá cada momento limpio.',
    'Respirá profundo 4 veces cuando sientas el impulso. Tu cerebro lo agradece.',
    'Pensá en la razón más importante por la que querés dejar de fumar. Tenela presente.',
    'El antojo dura entre 3 y 5 minutos. Podés con eso.',
    'Caminá 5 minutos afuera. El movimiento rompe el ciclo del hábito.',
    'Contá hasta 10 antes de ceder. Casi siempre alcanza para que el impulso pase.',
    'Tomá nota de en qué situaciones fumás más. Conocer el patrón es el primer paso.',
    'Cada semana sin fumar es tu mejor racha futura. ¡Ya estás en camino!',
    'Felicitarte por cada día limpio importa. El cerebro aprende de los premios.',
    'Reemplazá el cigarrillo por algo positivo: un té, chicle, salir a caminar.',
    'Avisale a alguien de confianza que estás dejando de fumar. El apoyo hace la diferencia.',
  ],

  RECOVERY: [
    { hours: 0.33, icon: '❤️', name: 'Pulso y presión se estabilizan',  label: '20 min'    },
    { hours: 12,   icon: '🫁', name: 'El monóxido de carbono baja',      label: '12 horas'  },
    { hours: 336,  icon: '🌿', name: 'Las ganas físicas se debilitan',   label: '2 semanas' },
    { hours: 720,  icon: '💪', name: 'La función pulmonar mejora',       label: '1 mes'     },
  ],

  // ── Boot ──────────────────────────────────────────────────────────────────
  init() {
    FUMAR.createdAt = DB.getStart();
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', () => App.switchTab(btn.dataset.tab))
    );
    App.renderActive();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  switchTab(tab) {
    App.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.view').forEach(v => {
      const on = v.id === `view-${tab}`;
      if (on) { v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter'); }
      v.classList.toggle('active', on);
    });
    App.renderActive();
  },

  renderActive() {
    ({ today: App.renderToday, stats: App.renderStats, achievements: App.renderAchievements })[App.activeTab]?.();
  },

  // ── Helpers de tiempo ─────────────────────────────────────────────────────
  dayOf(ts) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); },

  streak() {
    const logs  = DB.getLogs().filter(l => l.habitId === FUMAR.id);
    const today = App.dayOf(Date.now());
    if (!logs.length) return Math.floor((today - App.dayOf(FUMAR.createdAt)) / 86400000);
    const lastDay = App.dayOf(Math.max(...logs.map(l => l.ts)));
    return Math.floor((today - lastDay) / 86400000);
  },

  bestStreak() {
    const logs    = DB.getLogs().filter(l => l.habitId === FUMAR.id);
    const today   = App.dayOf(Date.now());
    const created = App.dayOf(FUMAR.createdAt);
    if (!logs.length) return Math.floor((today - created) / 86400000);
    const dates = [...new Set(logs.map(l => App.dayOf(l.ts)))].sort((a, b) => a - b);
    let best = Math.floor((dates[0] - created) / 86400000);
    for (let i = 1; i < dates.length; i++)
      best = Math.max(best, Math.floor((dates[i] - dates[i - 1]) / 86400000));
    return Math.max(best, App.streak());
  },

  timeSince() {
    const logs  = DB.getLogs().filter(l => l.habitId === FUMAR.id);
    const since = logs.length ? Math.max(...logs.map(l => l.ts)) : FUMAR.createdAt;
    const ms    = Date.now() - since;
    return {
      days:       Math.floor(ms / 86400000),
      hours:      Math.floor((ms % 86400000) / 3600000),
      minutes:    Math.floor((ms % 3600000) / 60000),
      hoursTotal: ms / 3600000,
    };
  },

  countIn(start, end) {
    return DB.getLogs()
      .filter(l => l.habitId === FUMAR.id && l.ts >= start && l.ts < end)
      .reduce((s, l) => s + l.count, 0);
  },

  periodBounds(period, offset = 0) {
    const now = new Date();
    if (period === 'day') {
      const s = App.dayOf(Date.now()) - offset * 86400000;
      return { start: s, end: s + 86400000 };
    }
    if (period === 'week') {
      const d = new Date(now); d.setHours(0,0,0,0);
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - dow - offset * 7);
      return { start: d.getTime(), end: d.getTime() + 7 * 86400000 };
    }
    if (period === 'month') {
      const m = now.getMonth() - offset;
      return {
        start: new Date(now.getFullYear(), m, 1).getTime(),
        end:   new Date(now.getFullYear(), m + 1, 1).getTime(),
      };
    }
    const year = now.getFullYear() - offset;
    return {
      start: new Date(year, 0, 1).getTime(),
      end:   new Date(year + 1, 0, 1).getTime(),
    };
  },

  getPeriodLabel(period, offset) {
    const ML = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const MS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const DS = ['dom','lun','mar','mié','jue','vie','sáb'];
    const now = new Date();
    if (period === 'day') {
      if (offset === 0) return 'Hoy';
      if (offset === 1) return 'Ayer';
      const d = new Date(App.dayOf(Date.now()) - offset * 86400000);
      return `${DS[d.getDay()]} ${d.getDate()} ${MS[d.getMonth()]}`;
    }
    if (period === 'week') {
      const { start, end } = App.periodBounds('week', offset);
      const s = new Date(start), e = new Date(end - 86400000);
      if (offset === 0) return 'Esta semana';
      return s.getMonth() === e.getMonth()
        ? `${s.getDate()}–${e.getDate()} ${MS[s.getMonth()]}`
        : `${s.getDate()} ${MS[s.getMonth()]} – ${e.getDate()} ${MS[e.getMonth()]}`;
    }
    if (period === 'month') {
      if (offset === 0) return 'Este mes';
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return `${ML[d.getMonth()]} ${d.getFullYear()}`;
    }
    const year = now.getFullYear() - offset;
    return offset === 0 ? 'Este año' : String(year);
  },

  navigate(delta) {
    App.statsOffset = Math.max(0, App.statsOffset + delta);
    App.renderStats();
  },

  // ── HOY ───────────────────────────────────────────────────────────────────
  renderToday() {
    const view = document.getElementById('view-today');
    const now  = new Date();
    const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dateStr = `${DAYS_ES[now.getDay()]}, ${now.getDate()} de ${MONTHS_ES[now.getMonth()]}`;
    const pad = n => String(n).padStart(2, '0');

    const { days, hours, minutes, hoursTotal } = App.timeSince();
    const streakDays = App.streak();
    const bestDays   = App.bestStreak();

    // Días limpios esta semana
    const { start: wkS, end: wkE } = App.periodBounds('week');
    const relapsDays = new Set(
      DB.getLogs().filter(l => l.habitId === FUMAR.id && l.ts >= wkS && l.ts < wkE).map(l => App.dayOf(l.ts))
    ).size;
    const weekCleanDays = 7 - relapsDays;

    // Mensaje motivacional
    const motivation = days === 0 && hours < 1
      ? 'Cada minuto cuenta. Podés lograrlo.'
      : days === 0
        ? 'Volviste a empezar hoy. Cada hora cuenta — seguí adelante.'
        : days === 1
          ? '¡Un día completo! Tu cuerpo ya siente la diferencia.'
          : days < 7
            ? `¡${days} días! Estás construyendo algo poderoso.`
            : days < 30
              ? `¡${days} días sin fumar! La racha sigue — no la rompas.`
              : `¡${days} días! Sos más fuerte que el cigarrillo.`;

    // Hitos de recuperación
    let nextFound = false;
    const milestonesHTML = App.RECOVERY.map(m => {
      const done   = hoursTotal >= m.hours;
      const isNext = !done && !nextFound;
      if (isNext) nextFound = true;
      const pct    = isNext ? Math.round(Math.min(1, hoursTotal / m.hours) * 100) : 0;

      if (done) return `
        <div class="recovery-item">
          <div class="ms-dot ms-done">✓</div>
          <div style="flex:1">
            <div class="ms-name">${m.name}</div>
            <div class="ms-meta">${m.label} · logrado</div>
          </div>
        </div>`;

      if (isNext) return `
        <div class="recovery-item">
          <div class="ms-dot ms-next">${m.icon}</div>
          <div style="flex:1">
            <div class="ms-name">${m.name}</div>
            <div class="ms-progress-bar"><div class="ms-progress-fill" style="width:${pct}%"></div></div>
          </div>
          <span class="ms-time-label">${m.label}</span>
        </div>`;

      return `
        <div class="recovery-item">
          <div class="ms-dot ms-locked">${m.icon}</div>
          <div style="flex:1">
            <div class="ms-name ms-name-locked">${m.name}</div>
            <div class="ms-meta ms-meta-locked">en ${m.label}</div>
          </div>
        </div>`;
    }).join('');

    // Registro de hoy
    const { start: todayS, end: todayE } = App.periodBounds('day');
    const todayCount = App.countIn(todayS, todayE);
    const isClean    = todayCount === 0;
    const tip        = App.DAILY_TIPS[now.getDate() % App.DAILY_TIPS.length];

    view.innerHTML = `
      <div class="today-header">
        <div>
          <h1 class="today-logo"><span class="logo-leaf">🌿</span>Healthio</h1>
          <div class="today-date">${dateStr}</div>
        </div>
        <div class="today-avatar">H</div>
      </div>

      <div class="hero-card">
        <div class="hero-orb"></div>
        <div class="hero-label">Tiempo sin fumar</div>
        <div class="hero-time">
          <div class="hero-block">
            <span class="hero-num">${pad(days)}</span>
            <span class="hero-unit">días</span>
          </div>
          <span class="hero-sep">:</span>
          <div class="hero-block">
            <span class="hero-num">${pad(hours)}</span>
            <span class="hero-unit">horas</span>
          </div>
          <span class="hero-sep">:</span>
          <div class="hero-block">
            <span class="hero-num">${pad(minutes)}</span>
            <span class="hero-unit">min</span>
          </div>
        </div>
        <div class="hero-pill">🌱 ${motivation}</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-emoji">✦</div>
          <div class="metric-num">${streakDays}</div>
          <div class="metric-label">días<br>limpio</div>
        </div>
        <div class="metric-card">
          <div class="metric-emoji">📅</div>
          <div class="metric-num">${weekCleanDays}/7</div>
          <div class="metric-label">días limpios<br>esta semana</div>
        </div>
        <div class="metric-card">
          <div class="metric-emoji">🏆</div>
          <div class="metric-num">${bestDays}</div>
          <div class="metric-label">mejor<br>racha</div>
        </div>
      </div>

      <button class="sos-btn" onclick="App.openLogSheet()">
        <div class="sos-icon-wrap">🫧</div>
        <div class="sos-body">
          <div class="sos-title">Tengo un antojo</div>
          <div class="sos-sub">Tocá para registrar y reflexionar</div>
        </div>
        <span class="sos-arrow">›</span>
      </button>

      <div class="today-section-row">
        <span class="today-sl">Registro de hoy</span>
        <span class="today-sr">${isClean ? 'Sin recaídas hoy ✦' : `${todayCount} cigarro${todayCount > 1 ? 's' : ''} hoy`}</span>
      </div>

      <div class="today-habit-row" onclick="App.openLogSheet()" style="margin-bottom:24px">
        <div class="thr-icon" style="background:#f1e7e4;color:#c2756a">🚬</div>
        <div class="thr-info">
          <div class="thr-name">Fumar</div>
          <div class="thr-status ${isClean ? 'thr-clean' : 'thr-relapsed'}">
            ${isClean
              ? `✦ ${streakDays} día${streakDays !== 1 ? 's' : ''} sin recaída`
              : `⚠ Recaída hoy · ${todayCount} cigarrillos`}
          </div>
        </div>
        ${todayCount > 0
          ? `<div class="thr-count"><div class="thr-num">${todayCount}</div><div class="thr-unit">cig.</div></div>`
          : ''}
      </div>

      <div class="today-section-row">
        <span class="today-sl">Tu cuerpo se recupera</span>
      </div>
      <div class="recovery-card">${milestonesHTML}</div>

      <div class="daily-tip">
        <span class="daily-tip-icon">💚</span>
        <div>
          <div class="daily-tip-lbl">Consejo del día</div>
          <div class="daily-tip-text">${tip}</div>
        </div>
      </div>
      <div style="height:8px"></div>`;
  },

  // ── STATS ─────────────────────────────────────────────────────────────────
  renderStats() {
    const view = document.getElementById('view-stats');
    const PERIODS = [
      { key: 'day',   label: 'Hoy' },
      { key: 'week',  label: 'Semana' },
      { key: 'month', label: 'Mes' },
      { key: 'year',  label: 'Año' },
    ];

    const { start, end }     = App.periodBounds(App.statsPeriod, App.statsOffset);
    const { start: ps, end: pe } = App.periodBounds(App.statsPeriod, App.statsOffset + 1);
    const count     = App.countIn(start, end);
    const prevCount = App.countIn(ps, pe);
    const streak    = App.streak();
    const best      = App.bestStreak();
    const navLabel  = App.getPeriodLabel(App.statsPeriod, App.statsOffset);
    const canNext   = App.statsOffset > 0;

    // Savings & avoided (assumes avg 10 cig/day before, €0.35/cig)
    const PRICE = 0.35, AVG = 10;
    const daysSince  = Math.max(0, Math.floor((Date.now() - FUMAR.createdAt) / 86400000));
    const totalSmoked = DB.getLogs().filter(l => l.habitId === FUMAR.id).reduce((s,l) => s + l.count, 0);
    const avoided    = Math.max(0, daysSince * AVG - totalSmoked);
    const savedEur   = (avoided * PRICE).toFixed(0);

    // Comparison pill
    const prevLabels = { day:'ayer', week:'sem. ant.', month:'mes ant.', year:'año ant.' };
    let compHtml = '';
    if (prevCount > 0 && App.statsOffset === 0) {
      const diff = count - prevCount;
      if (diff < 0)
        compHtml = `<div class="stats-comp-pill stats-comp-good">↓ ${Math.abs(diff)} menos que ${prevLabels[App.statsPeriod]}</div>`;
      else if (diff > 0)
        compHtml = `<div class="stats-comp-pill stats-comp-bad">↑ ${diff} más que ${prevLabels[App.statsPeriod]}</div>`;
    }

    const unit = count === 1 ? 'cigarrillo' : 'cigarrillos';

    view.innerHTML = `
      <div class="stats-page-hd">
        <h1 class="stats-title"><span class="logo-leaf">🌿</span>Estadísticas</h1>
      </div>

      <div class="seg-tabs">
        ${PERIODS.map(p => `<button class="seg-tab${App.statsPeriod===p.key?' active':''}" onclick="App.setPeriod('${p.key}')">${p.label}</button>`).join('')}
      </div>

      <div class="period-nav">
        <button class="period-nav-btn" onclick="App.navigate(1)">‹</button>
        <span class="period-nav-label">${navLabel}</span>
        <button class="period-nav-btn${!canNext?' period-nav-disabled':''}" onclick="App.navigate(-1)" ${!canNext?'disabled':''}>›</button>
      </div>

      <div class="stats-hero-card">
        <div class="stats-hero-num">${count}</div>
        <div class="stats-hero-sub">${unit} · ${navLabel}</div>
        ${compHtml}
      </div>

      <div class="stat-grid4">
        <div class="stat4-card">
          <div class="stat4-icon">🌱</div>
          <div class="stat4-num" style="color:#2c5a2a">${streak}</div>
          <div class="stat4-lbl">Días sin fumar</div>
        </div>
        <div class="stat4-card">
          <div class="stat4-icon">🏆</div>
          <div class="stat4-num" style="color:#c79a3e">${best}</div>
          <div class="stat4-lbl">Mejor racha</div>
        </div>
        <div class="stat4-card">
          <div class="stat4-icon">🪙</div>
          <div class="stat4-num" style="color:#2c5a2a">${savedEur}€</div>
          <div class="stat4-lbl">Ahorrado</div>
        </div>
        <div class="stat4-card">
          <div class="stat4-icon">🚭</div>
          <div class="stat4-num" style="color:#2c5a2a">${avoided}</div>
          <div class="stat4-lbl">Cigarros evitados</div>
        </div>
      </div>

      ${App.buildChart()}
      ${App.buildTrendChart()}
      ${App.buildInsight()}
      ${App.buildHeatmap()}
      <div style="height:8px"></div>`;
  },

  buildChart() {
    const p  = App.statsPeriod;
    const os = App.statsOffset;

    if (p === 'day') {
      const dayS   = App.dayOf(Date.now()) - os * 86400000;
      const blocks = [];
      let total = 0;
      for (let h = 0; h < 24; h += 3) {
        const s = dayS + h * 3600000;
        const c = DB.getLogs()
          .filter(l => l.habitId === FUMAR.id && l.ts >= s && l.ts < s + 3 * 3600000)
          .reduce((a,l) => a + l.count, 0);
        total += c;
        blocks.push({ label: `${h}h`, count: c });
      }
      const sub = total === 0 ? 'Sin registros' : `${total} registro${total>1?'s':''}`;
      return App._chart('Por hora', sub, blocks, 96);
    }

    if (p === 'week') {
      const { start } = App.periodBounds('week', os);
      const WLABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
      const blocks  = WLABELS.map((lbl, i) => {
        const s = start + i * 86400000;
        const c = DB.getLogs()
          .filter(l => l.habitId === FUMAR.id && l.ts >= s && l.ts < s + 86400000)
          .reduce((a,l) => a + l.count, 0);
        return { label: lbl, count: c };
      });
      return App._chart('Por día', '', blocks, 90);
    }

    if (p === 'month') {
      const { start: monthS } = App.periodBounds('month', os);
      const d0    = new Date(monthS);
      const total = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
      const blocks = [];
      for (let d = 0; d < total; d++) {
        const s = monthS + d * 86400000;
        const c = DB.getLogs()
          .filter(l => l.habitId === FUMAR.id && l.ts >= s && l.ts < s + 86400000)
          .reduce((a,l) => a + l.count, 0);
        blocks.push({ label: (d+1) % 5 === 1 ? String(d+1) : '', count: c });
      }
      return App._chart('Por día', '', blocks, 72);
    }

    const { start: yearS } = App.periodBounds('year', os);
    const yr = new Date(yearS).getFullYear();
    const MLABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const blocks = MLABELS.map((lbl, i) => {
      const s = new Date(yr, i, 1).getTime();
      const e = new Date(yr, i+1, 1).getTime();
      const c = DB.getLogs()
        .filter(l => l.habitId === FUMAR.id && l.ts >= s && l.ts < e)
        .reduce((a,l) => a + l.count, 0);
      return { label: lbl, count: c };
    });
    return App._chart('Por mes', '', blocks, 90);
  },

  buildTrendChart() {
    const today   = App.dayOf(Date.now());
    const DOW_LBL = ['D','L','M','X','J','V','S'];
    const blocks  = [];
    for (let i = 6; i >= 0; i--) {
      const s = today - i * 86400000;
      const c = DB.getLogs()
        .filter(l => l.habitId === FUMAR.id && l.ts >= s && l.ts < s + 86400000)
        .reduce((a,l) => a + l.count, 0);
      blocks.push({ label: DOW_LBL[new Date(s).getDay()], count: c, isToday: i === 0 });
    }

    const { start: w0s, end: w0e } = App.periodBounds('week', 0);
    const { start: w1s, end: w1e } = App.periodBounds('week', 1);
    const thisW = App.countIn(w0s, w0e);
    const prevW = App.countIn(w1s, w1e);
    let badge = '';
    if (prevW > 0) {
      const pct = Math.round(Math.abs(thisW - prevW) / prevW * 100);
      badge = thisW <= prevW
        ? `<span class="stats-trend-badge good">↓ ${pct}%</span>`
        : `<span class="stats-trend-badge bad">↑ ${pct}%</span>`;
    }

    const max   = Math.max(1, ...blocks.map(b => b.count));
    const MAX_H = 72;
    function trendColor(v, m) {
      if (v === 0) return 'linear-gradient(180deg,#8fb98a,#5e8a59)';
      const r = v / m;
      if (r < 0.25) return '#bcd0a4';
      if (r < 0.5)  return '#d3c7a0';
      if (r < 0.75) return '#e0c2bb';
      return '#e6cfc9';
    }

    const bars = blocks.map(b => {
      const h  = b.count > 0 ? Math.max(6, Math.round((b.count / max) * MAX_H)) : 4;
      const bg = trendColor(b.count, max);
      return `
        <div class="bc-col">
          <div class="bc-val" style="color:${b.count===0?'#7a9a74':'#b3bcab'}">${b.count===0?'✦':b.count}</div>
          <div class="bc-bar" style="height:${h}px;background:${bg}"></div>
          <div class="bc-lbl" style="${b.isToday?'color:#5e8a59;font-weight:700':''}">${b.label}</div>
        </div>`;
    }).join('');

    return `
      <div class="stats-section-hd">
        <span>Tendencia · 7 días</span>
        ${badge}
      </div>
      <div class="stats-chart-card">
        <div class="bc-bars" style="height:${MAX_H + 28}px">${bars}</div>
      </div>`;
  },

  buildInsight() {
    const weekAgo = Date.now() - 7 * 86400000;
    const logs    = DB.getLogs().filter(l => l.habitId === FUMAR.id && l.ts >= weekAgo);
    if (logs.length < 2) return '';
    const blocks = Array(8).fill(0);
    logs.forEach(l => { blocks[Math.floor(new Date(l.ts).getHours() / 3)] += l.count; });
    const idx = blocks.indexOf(Math.max(...blocks));
    const h1  = idx * 3, h2 = h1 + 3;
    return `
      <div class="stats-insight">
        <span style="font-size:18px;flex-shrink:0;margin-top:1px">💡</span>
        <div>
          <div class="stats-insight-label">Patrón detectado</div>
          <div class="stats-insight-text">Tu momento más difícil es entre las ${h1}h y ${h2}h. Planea una actividad en ese horario.</div>
        </div>
      </div>`;
  },

  buildHeatmap() {
    const now = new Date();
    const yr  = App.statsPeriod === 'year' ? now.getFullYear() - App.statsOffset : now.getFullYear();

    const yearStart = new Date(yr, 0, 1).getTime();
    const yearEnd   = new Date(yr + 1, 0, 1).getTime();

    // Day → count map
    const dayMap = {};
    DB.getLogs()
      .filter(l => l.habitId === FUMAR.id && l.ts >= yearStart && l.ts < yearEnd)
      .forEach(l => { const k = App.dayOf(l.ts); dayMap[k] = (dayMap[k] || 0) + l.count; });

    // Grid starts on Monday of the week containing Jan 1
    const jan1    = new Date(yr, 0, 1);
    const dow0    = jan1.getDay();                   // 0=Sun
    const backMon = dow0 === 0 ? 6 : dow0 - 1;
    const gridStart = jan1.getTime() - backMon * 86400000;

    const daysInYear = (yearEnd - yearStart) / 86400000;
    const totalWeeks = Math.ceil((backMon + daysInYear) / 7);
    const todayTs    = App.dayOf(Date.now());

    const MS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const CELL = 12, GAP = 2, COL_W = CELL + GAP;

    const trackStart = App.dayOf(FUMAR.createdAt);

    function heatColor(ts) {
      const inYear    = ts >= yearStart && ts < yearEnd;
      const isFuture  = ts > todayTs;
      const noData    = ts < trackStart;
      if (!inYear || isFuture || noData) return '#dde0db'; // gris: sin registro
      const n = dayMap[ts] || 0;
      if (n === 0) return '#6aab65';   // verde: sin fumar
      if (n === 1) return '#e8974a';   // naranja: 1 cigarro
      return '#c2504e';                // rojo: más de 1
    }

    // Build weeks + track first week column of each month
    const monthCols = {};
    const weeksHtml = Array.from({ length: totalWeeks }, (_, w) => {
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const ts  = gridStart + (w * 7 + d) * 86400000;
        const day = new Date(ts);
        if (day.getFullYear() === yr) {
          const m = day.getMonth();
          if (!(m in monthCols)) monthCols[m] = w;
        }
        cells += `<div class="hm-cell" style="background:${heatColor(ts)}"></div>`;
      }
      return `<div class="hm-week">${cells}</div>`;
    }).join('');

    const monthsHtml = Object.entries(monthCols)
      .map(([m, col]) => `<div class="hm-month-lbl" style="left:${col * COL_W}px">${MS[+m]}</div>`)
      .join('');

    const totalW = totalWeeks * COL_W;

    return `
      <div class="stats-section-hd"><span>Mapa · ${yr}</span></div>
      <div class="stats-chart-card" style="padding:14px 14px 12px;overflow:hidden">
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <div style="position:relative;min-width:${totalW}px">
            <div style="position:relative;height:18px;margin-bottom:4px">${monthsHtml}</div>
            <div class="hm-weeks">${weeksHtml}</div>
          </div>
        </div>
        <div class="hm-legend">
          <div class="hm-cell" style="background:#dde0db"></div><span class="hm-legend-txt">Sin registro</span>
          <div class="hm-cell" style="background:#6aab65;margin-left:8px"></div><span class="hm-legend-txt">Sin fumar</span>
          <div class="hm-cell" style="background:#e8974a;margin-left:8px"></div><span class="hm-legend-txt">1</span>
          <div class="hm-cell" style="background:#c2504e;margin-left:8px"></div><span class="hm-legend-txt">+1</span>
        </div>
      </div>`;
  },

  _chart(title, subtitle, blocks, maxH = 90) {
    const max  = Math.max(1, ...blocks.map(b => b.count));
    const bars = blocks.map(b => {
      const h  = b.count > 0 ? Math.max(6, Math.round((b.count / max) * maxH)) : 4;
      const bg = b.count > 0 ? 'linear-gradient(180deg,#d08a7f,#c2756a)' : '#eef3ea';
      return `
        <div class="bc-col">
          <div class="bc-bar" style="height:${h}px;background:${bg}"></div>
          <div class="bc-lbl">${b.label}</div>
        </div>`;
    }).join('');
    return `
      <div class="stats-section-hd">
        <span>${title}</span>
        ${subtitle ? `<span class="stats-section-badge">${subtitle}</span>` : ''}
      </div>
      <div class="stats-chart-card">
        <div class="bc-bars" style="height:${maxH}px">${bars}</div>
      </div>`;
  },

  setPeriod(p) { App.statsPeriod = p; App.statsOffset = 0; App.renderStats(); },

  // ── LOGROS ────────────────────────────────────────────────────────────────
  renderAchievements() {
    const view   = document.getElementById('view-achievements');
    const streak = App.streak();
    const best   = App.bestStreak();

    let html = `
      <div class="page-header">
        <div><div class="page-title">Logros</div><div class="page-subtitle">Días sin fumar</div></div>
      </div>
      <div class="achieve-header">
        <div class="achieve-icon" style="background:#f1e7e4;color:#c2756a">🚬</div>
        <div class="achieve-header-info">
          <div class="achieve-habit-name">Fumar</div>
          <div class="achieve-stats">Racha actual: <b>${streak}d</b> · Mejor racha: <b>${best}d</b></div>
        </div>
      </div>
      <div class="badge-grid">`;

    MILESTONES.forEach(m => {
      const earned = best >= m.days;
      const active = streak >= m.days;
      const pct    = Math.min(100, Math.round((best / m.days) * 100));
      html += `
        <div class="badge-card ${earned ? 'earned' : 'locked'}">
          <div class="badge-emoji">${m.emoji}</div>
          <div class="badge-name">${m.name}</div>
          <div class="badge-desc">${m.desc}</div>
          ${earned
            ? `<div class="badge-earned-stamp">✓ Conseguido${active ? ' · activo' : ''}</div>`
            : `<div class="badge-progress-wrap"><div class="badge-progress-fill" style="width:${pct}%"></div></div>
               <div style="font-size:10px;color:var(--text3);margin-top:2px">${pct}%</div>`}
        </div>`;
    });

    html += `</div><div style="height:8px"></div>`;
    view.innerHTML = html;
  },

  // ── LOG SHEET ─────────────────────────────────────────────────────────────
  openLogSheet() {
    App.logCount = 1;
    document.getElementById('log-habit-name').textContent = '🚬 Fumar';
    document.getElementById('log-count').textContent      = '1';
    document.getElementById('log-unit-label').textContent = 'cigarrillos';
    document.getElementById('log-note').value             = '';
    const _now = new Date();
    const _p   = n => String(n).padStart(2, '0');
    document.getElementById('log-datetime').value =
      `${_now.getFullYear()}-${_p(_now.getMonth()+1)}-${_p(_now.getDate())}T${_p(_now.getHours())}:${_p(_now.getMinutes())}`;
    document.getElementById('log-datetime').max =
      `${_now.getFullYear()}-${_p(_now.getMonth()+1)}-${_p(_now.getDate())}T${_p(_now.getHours())}:${_p(_now.getMinutes())}`;

    const recent = DB.getLogs()
      .filter(l => l.habitId === FUMAR.id)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);

    const histEl = document.getElementById('log-history');
    histEl.innerHTML = recent.length
      ? `<div class="form-label" style="margin-top:20px">Registros recientes</div>
         ${recent.map(l => {
           const d    = new Date(l.ts);
           const date = d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
           const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
           return `<div class="log-hist-row">
             <span class="log-hist-time">${date} ${time}</span>
             <span class="log-hist-val">${l.count} cig.</span>
             ${l.note ? `<span class="log-hist-note">${l.note}</span>` : ''}
           </div>`;
         }).join('')}`
      : '';

    App.openSheet('sheet-log');
  },

  adjustCount(delta) {
    App.logCount = Math.max(1, App.logCount + delta);
    document.getElementById('log-count').textContent = App.logCount;
  },

  saveLog() {
    const dtVal = document.getElementById('log-datetime').value;
    const ts    = dtVal ? new Date(dtVal).getTime() : Date.now();
    const logs  = DB.getLogs();
    logs.push({
      id:      'l' + Date.now(),
      habitId: FUMAR.id,
      ts,
      count:   App.logCount,
      note:    document.getElementById('log-note').value.trim(),
    });
    DB.saveLogs(logs);
    App.closeSheet();
    App.renderActive();
    App.toast('Registrado');
    setTimeout(App.checkUnlocks, 400);
  },

  // ── UNLOCK CHECK ──────────────────────────────────────────────────────────
  checkUnlocks() {
    const done = DB.getUnlocked();
    const best = App.bestStreak();
    MILESTONES.forEach(m => {
      const key = `fumar_${m.days}`;
      if (best >= m.days && !done[key]) {
        done[key] = true;
        DB.saveUnlocked(done);
        App.showUnlock(m);
      }
    });
  },

  showUnlock(m) {
    document.getElementById('unlock-emoji').textContent = m.emoji;
    document.getElementById('unlock-name').textContent  = m.name;
    document.getElementById('unlock-desc').textContent  = `🚬 Fumar — ${m.desc}`;
    document.getElementById('unlock-overlay').style.display = 'flex';
  },
  closeUnlock() { document.getElementById('unlock-overlay').style.display = 'none'; },

  // ── HELPERS ───────────────────────────────────────────────────────────────
  openSheet(id) {
    document.getElementById(id).style.display = 'block';
    document.getElementById('overlay').classList.add('open');
  },

  closeSheet() {
    document.querySelectorAll('.sheet').forEach(s => s.style.display = 'none');
    document.getElementById('overlay').classList.remove('open');
  },

  showConfirm(title, msg, cb) {
    App.confirmCb = cb;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent   = msg;
    document.getElementById('confirm-overlay').style.display = 'block';
    document.getElementById('confirm-box').style.display     = 'block';
  },
  runConfirm()   { App.closeConfirm(); App.confirmCb?.(); },
  closeConfirm() {
    document.getElementById('confirm-overlay').style.display = 'none';
    document.getElementById('confirm-box').style.display     = 'none';
    App.confirmCb = null;
  },

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
