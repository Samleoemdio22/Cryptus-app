/* Cryptus Mini App — live PAPER desk viewer (read-only).
   Data: encrypted, gzip-compressed JSON messages.
   Primary: MQTT over WSS (public.cloud.shiftr.io, retained). Fallback: ntfy.sh (history poll + SSE).
   The topic (t) and AES key (k) come from the URL (#t=...&k=...) and never leave this device. */
'use strict';
const MQTT_URL = 'wss://public.cloud.shiftr.io:443/';
const NTFY = 'https://ntfy.sh/';
const TZ = 'Europe/Rome';
const tg = window.Telegram && window.Telegram.WebApp;

// ---------- params ----------
function param(name) {
  const m = location.href.match(new RegExp('[#?&]' + name + '=([A-Za-z0-9_\\-]+)'));
  return m ? m[1] : null;
}
let T = param('t'), K = param('k');
try {
  if (T && K) localStorage.setItem('cx_tk', JSON.stringify([T, K]));
  else { const s = JSON.parse(localStorage.getItem('cx_tk') || 'null'); if (s) [T, K] = s; }
} catch (e) {}

// ---------- labels ----------
const A = {Scout:['Scout','#5aa9ff','cerca token'],Filter:['Filter','#ff4d64','scarta i rischiosi'],Analyst:['Analyst','#f6c453','dà il punteggio'],
 Executor:['Executor','#1fe08a','compra/vende (paper)'],Risk:['Risk','#ff9b45','stop e trailing'],Logger:['Logger','#9aa4b2','registra tutto'],
 Regime:['Regime','#a78bfa','umore del mercato'],Scalp:['Scalp','#2fe0d2','mosse rapide 5m'],Lab:['Lab','#ff7ad9','testa migliorie'],
 Sentinel:['Sentinel','#ff6b3d','anti-dump'],Hunter:['Hunter','#e2c044','trova wallet'],Mirror:['Mirror','#7dd3fc','copia i buy']};
const ICON={Scout:"<circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/>",Filter:"<path d='M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z'/><path d='M9 12l2 2 4-4'/>",
 Analyst:"<path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/>",Executor:"<path d='M13 2L4 14h7l-1 8 9-12h-7z'/>",Risk:"<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5'/><circle cx='12' cy='12' r='1'/>",
 Logger:"<path d='M5 4h11l3 3v13H5z'/><path d='M9 10h6M9 14h6M9 18h4'/>",Regime:"<path d='M3 12h4l3-8 4 16 3-8h4'/>",Scalp:"<circle cx='12' cy='13' r='8'/><path d='M12 9v4l2.5 2.5M9 2h6'/>",
 Lab:"<path d='M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3'/><path d='M7 15h10'/>",Sentinel:"<path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'/><circle cx='12' cy='12' r='3'/>",
 Hunter:"<circle cx='12' cy='12' r='8'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/>",Mirror:"<rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2'/>"};
const BOOK_NAME={A_spec:'Prudente A · stop −6%',B_wide:'Prudente B · stop −12%',C_spec_4h:'Prudente C · time stop 4h',D_wide_noregime:'Prudente D · senza regime',
 X_aggressive:'Aggressivo',X_aggr_sentinel:'Aggressivo + Sentinel',S_scalp:'Scalping',K_copy:'Copytrading'};
const ECO={
 prudente:{agents:['Regime','Scout','Filter','Analyst','Executor','Risk','Lab','Logger'],labs:['Lab Segnali','Lab Uscite'],desc:'Filtri rigorosi e punteggio ≥ 70. Quattro varianti di uscita sugli stessi segnali: A stop −6%, B stop −12%, C con time stop 4h, D come B ma senza pausa di mercato.'},
 aggressivo:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:['Lab Segnali','Lab Uscite'],desc:'Stessi controlli di sicurezza, filtri “morbidi” più larghi e punteggio ≥ 60: più trade, più rischio.'},
 sentinel:{agents:['Filter','Analyst','Executor','Sentinel','Risk','Lab'],labs:['Lab Sentinel'],desc:'Gemello dell’Aggressivo con Sentinel: se vede segni di dump vende metà, se è grave esce del tutto. Test A/B.'},
 scalping:{agents:['Filter','Scalp','Executor','Risk','Lab'],labs:['Lab Scalping'],desc:'Entrate veloci su forte spinta a 5 minuti: obiettivo +4,5%, stop −3%, massimo 20 minuti. Costi inclusi.'},
 copy:{agents:['Hunter','Mirror','Filter','Executor','Sentinel','Risk','Lab'],labs:['Lab Copy'],desc:'Hunter cerca wallet bravi, Mirror copia i loro acquisti (con ritardo e slippage simulati), stessi filtri di sicurezza.'}};
const EXIT={leader_sell:'wallet copiato ha venduto',sentinel_warning:'Sentinel (warning)',sentinel_critical:'Sentinel (critico)',stop_loss:'stop loss',trail_stop:'trailing stop',time_stop:'time stop',take_profit:'take profit',liquidity_collapse:'liquidità crollata'};
const KR={pumped_h1:'Già +80% in 1h',low_liquidity:'Liquidità < $20k',liq_to_mcap:'Liq/mcap < 5%',unverifiable:'Non verificabile',rugged_flag:'Segnalato rug',mint_authority:'Mint non revocata',
 freeze_authority:'Freeze non revocata',transfer_fee:'Tassa sul trasferimento',lp_not_locked:'LP non bloccata',top10_concentration:'Top-10 holder troppo alti',dev_holding:'Dev > 3%',dev_past_rugs:'Dev con rug passati',bundle_insiders:'Bundle/insider > 10%'};
const SI={shadow:['in prova','st-sh'],guard:['guardia','st-sh'],promoted:['promosso','st-pr'],rejected:['respinto','st-rj'],expired:'scaduto',confirmed:['confermato','st-pr'],rolled_back:['annullato','st-rj']};
const PAL=['#1fe08a','#5aa9ff','#f6c453','#a78bfa','#ff9b45','#2fe0d2','#ff7ad9','#7dd3fc','#e2c044','#ff6b3d'];

// ---------- state ----------
const D = {}, TS = {};          // latest payload and its timestamp per message key
let eqs = {};                   // book -> [[t,usd],...]
let tab = localStorage.getItem('cx_tab') || 'overview', sub = {}, charts = {}, seen = new Set(), firstFeed = true;
let lastMsgAt = 0, mqttUp = false, ntfyUp = false, renderQueued = false;

// ---------- utils ----------
const $ = id => document.getElementById(id);
const f = (x, d = 2) => { if (x == null || isNaN(x)) return '–'; const n = Number(x), [i, dec] = Math.abs(n).toFixed(d).split('.');
  return (n < 0 && Number(n.toFixed(d)) !== 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : ''); };
const tm = ts => new Date(ts * 1000).toLocaleTimeString('it-IT', {timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit'});
const hm = ts => new Date(ts * 1000).toLocaleTimeString('it-IT', {timeZone: TZ, hour: '2-digit', minute: '2-digit'});
const dt = ts => ts ? new Date(ts * 1000).toLocaleString('it-IT', {timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '–';
const ago = ts => { if (!ts) return ''; const s = Math.max(0, Date.now() / 1000 - ts); return s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'g'; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cls = v => v > 0 ? 'pos' : (v < 0 ? 'neg' : 'neu');
const sg = v => v > 0 ? '+' : '';
const FX = () => (D.sum && D.sum.fx) || 1.1;
const eur = u => u / FX();
const E = (u, d = 2) => (u < 0 ? '−' : '') + '€' + f(Math.abs(eur(u)), d);
const px = x => x == null ? '–' : Number(x).toPrecision(4);
const svg = k => `<svg viewBox="0 0 24 24">${ICON[k] || ''}</svg>`;
const haptic = () => { try { tg && tg.HapticFeedback && tg.HapticFeedback.selectionChanged(); } catch (e) {} };

// ---------- crypto ----------
let aesKey = null;
async function getKey() {
  if (aesKey) return aesKey;
  const b = atob(K.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - K.length % 4) % 4));
  aesKey = await crypto.subtle.importKey('raw', Uint8Array.from(b, c => c.charCodeAt(0)), 'AES-GCM', false, ['decrypt']);
  return aesKey;
}
async function unseal(bytes) {
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes.slice(0, 12)}, key, bytes.slice(12));
  const txt = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(txt);
}
async function mqttTopic() {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(T + ':mqtt'));
  return 'cx/' + Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24) + '/';
}

// ---------- ingest ----------
function apply(key, ts, d) {
  if (key.startsWith('eq/')) { const b = key.slice(3); if (!(TS[key] > ts)) { TS[key] = ts; eqs[b] = d.s || []; } return; }
  if (TS[key] > ts) return;
  TS[key] = ts; D[key] = d;
}
async function ingest(bytes, via) {
  let m;
  try { m = await unseal(bytes); } catch (e) { return; }   // not ours / tampered -> ignore
  if (!m || !m.k) return;
  if (m.k === 'snap') { for (const [k, v] of Object.entries(m.d)) apply(k, m.ts, v); }
  else if (m.k === 'eqs') { for (const [b, s] of Object.entries(m.d)) apply('eq/' + b, m.ts, {s}); }
  else apply(m.k, m.ts, m.d);
  lastMsgAt = Math.max(lastMsgAt, m.ts);
  queueRender();
}
const b64bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function ntfyMsg(ev) { if (ev && ev.event === 'message' && typeof ev.message === 'string' && ev.message.startsWith('v1.')) ingest(b64bytes(ev.message.slice(3)), 'ntfy'); }

// ---------- transports ----------
let mq = null;
async function startMqtt() {
  if (!window.mqtt) { setLive(); return; }
  const base = await mqttTopic();
  mq = mqtt.connect(MQTT_URL, {username: 'public', password: 'public', clientId: 'cxv-' + Math.random().toString(16).slice(2, 12),
    reconnectPeriod: 3000, connectTimeout: 15000, keepalive: 30, clean: true});
  mq.on('connect', () => { mqttUp = true; mq.subscribe(base + '#', {qos: 0}); setLive(); });
  mq.on('close', () => { mqttUp = false; setLive(); });
  mq.on('offline', () => { mqttUp = false; setLive(); });
  mq.on('error', () => {});
  mq.on('message', (topic, payload) => ingest(new Uint8Array(payload), 'mqtt'));
}
async function startNtfy() {
  try {
    const r = await fetch(NTFY + T + '/json?poll=1&since=3h', {cache: 'no-store'});
    if (r.ok) { const txt = await r.text(); txt.split('\n').filter(Boolean).forEach(l => { try { ntfyMsg(JSON.parse(l)); } catch (e) {} }); }
  } catch (e) {}
  try {
    const es = new EventSource(NTFY + T + '/sse');
    es.onopen = () => { ntfyUp = true; setLive(); };
    es.onerror = () => { ntfyUp = false; setLive(); };
    es.onmessage = e => { try { ntfyMsg(JSON.parse(e.data)); } catch (x) {} };
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && mq && !mq.connected) { try { mq.reconnect(); } catch (e) {} }
  setLive();
});

// ---------- live indicator ----------
function setLive() {
  const dot = $('dot'), txt = $('livetxt');
  const age = lastMsgAt ? Date.now() / 1000 - lastMsgAt : null;
  if (!T || !K) { dot.className = 'dot bad'; txt.textContent = 'Link incompleto'; return; }
  if (mqttUp && age != null && age < 75) { dot.className = 'dot on'; txt.textContent = 'Live · ' + tm(lastMsgAt); }
  else if (mqttUp || ntfyUp) { dot.className = 'dot wait'; txt.textContent = age != null ? 'Connesso · ' + tm(lastMsgAt) : 'Connesso · in attesa dati'; }
  else { dot.className = 'dot bad'; txt.textContent = age != null ? 'Riconnessione… · ' + tm(lastMsgAt) : 'Riconnessione…'; }
  const s = D.sum; if (!s) return;
  const hbts = s.hb && s.hb[0] ? Date.parse(s.hb[0]) / 1000 : null;
  const hba = hbts ? Date.now() / 1000 - hbts : null;
  const rg = s.rg;
  $('deskline').innerHTML = (hba != null && hba < 300 ? `<span class=pos>●</span> Desk attivo · battito ${ago(hbts)} fa · ciclo ${s.hb[1] ?? 0}` : `<span class=neg>●</span> Desk fermo o in riavvio${hbts ? ' · ultimo battito ' + hm(hbts) : ''}`)
    + (rg ? ` · <span class="${rg[0] ? 'pos' : 'neu'}">${rg[0] ? 'mercato ok' : 'pausa mercato'}</span>` : '');
}
setInterval(setLive, 5000);

// ---------- derived ----------
function books() { return D.sum ? Object.keys(D.sum.b) : []; }
function bk(b) { const v = D.sum.b[b]; return v && {eq: v[0], pct: v[1], w: v[2], l: v[3], closed: v[4], wr: v[5], dd: v[6], mult: v[7], lab: v[8], base: v[9], ov: v[10] || [0, null, null]}; }
function liveAgents(list) { const ag = D.ag || {}; return list.filter(k => ag[k]); }   // only agents the desk actually runs
function liveLabs() { return [...new Set(Object.keys(D.sum.eco || {}).flatMap(e => (ECO[e] && ECO[e].labs) || []))]; }
function ecoOf(b) { const v = bk(b); const base = (v && v.base) || b; for (const [k, e] of Object.entries(D.sum.eco || {})) if (e[1].includes(base)) return k; return null; }
function booksOf(e) { return books().filter(b => ecoOf(b) === e); }
function mainBooks() { return books().filter(b => !bk(b).lab); }
function positions() { return (D.pos && D.pos.p || []).map(p => ({book: p[0], sym: p[1], ets: p[2], ref: p[3], fill: p[4], cost: p[5], stop: p[6], cur: p[7], peak: p[8], score: p[9]})); }
function totalSeries(bs) {
  const ser = bs.map(b => eqs[b] || []).filter(s => s.length); if (!ser.length) return [];
  const s0 = D.sum.s0, times = [...new Set(ser.flatMap(s => s.map(p => p[0])))].sort((a, b) => a - b);
  const idx = ser.map(() => -1);
  return times.map(t => { let tot = 0; ser.forEach((s, i) => { while (idx[i] + 1 < s.length && s[idx[i] + 1][0] <= t) idx[i]++; tot += idx[i] >= 0 ? s[idx[i]][1] : s0; });
    tot += (bs.length - ser.length) * s0; return [t, tot]; });
}

// ---------- components ----------
function chart(id, sets, base) {
  const cv = $(id); if (!cv || !window.Chart) return;
  const all = sets.flatMap(s => s[1]);
  const wrap = cv.parentElement; const em = wrap.querySelector('.chartempty');
  if (all.length < 2) { if (!em) wrap.insertAdjacentHTML('beforeend', '<div class=chartempty>Il grafico compare dopo i primi minuti di dati</div>'); return; }
  if (em) em.remove();
  const ds = sets.map(([b, ser, col, fill]) => {
    let bg = 'transparent';
    if (fill) { const g = cv.getContext('2d').createLinearGradient(0, 0, 0, cv.clientHeight || 185); g.addColorStop(0, col + '55'); g.addColorStop(1, 'rgba(0,0,0,0)'); bg = g; }
    return {label: b, data: ser.map(p => ({x: p[0] * 1000, y: eur(p[1])})), borderColor: col, borderWidth: fill ? 2.3 : 1.6, pointRadius: 0, pointHoverRadius: 3, fill: !!fill, backgroundColor: bg, tension: .3};
  });
  const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0]));
  const ys = all.map(p => eur(p[1])).concat([base]); let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max((y1 - y0) * 0.12, base * 0.002); y0 -= pad; y1 += pad;
  ds.push({label: 'base', data: [{x: x0 * 1000, y: base}, {x: x1 * 1000, y: base}], borderColor: 'rgba(255,255,255,.18)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0});
  const opt = {maintainAspectRatio: false, animation: false, parsing: false, interaction: {intersect: false, mode: 'nearest', axis: 'x'},
    plugins: {legend: {display: sets.length > 1, labels: {color: '#9aa4b2', boxWidth: 8, boxHeight: 8, font: {family: 'Inter', size: 10}, filter: i => i.text !== 'base'}},
      tooltip: {backgroundColor: '#14181d', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, filter: i => i.dataset.label !== 'base',
        callbacks: {title: it => new Date(it[0].parsed.x).toLocaleString('it-IT', {timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}), label: it => ` ${it.dataset.label}: €${f(it.parsed.y)}`}}},
    scales: {x: {type: 'linear', min: x0 * 1000, max: x1 * 1000, grid: {display: false}, border: {display: false}, ticks: {color: '#5b636e', font: {family: 'Inter', size: 10}, maxTicksLimit: 5, callback: v => new Date(v).toLocaleTimeString('it-IT', {timeZone: TZ, hour: '2-digit', minute: '2-digit'})}},
      y: {min: y0, max: y1, grid: {color: 'rgba(255,255,255,.04)'}, border: {display: false}, ticks: {color: '#5b636e', font: {family: 'Inter', size: 10}, maxTicksLimit: 5, callback: v => '€' + f(v, (y1 - y0) < 20 ? 1 : 0)}}}};
  if (charts[id] && charts[id].canvas === cv) { charts[id].data.datasets = ds; charts[id].options = opt; charts[id].update('none'); }
  else { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(cv, {type: 'line', data: {datasets: ds}, options: opt}); }
}
function spark(ser, up) {
  if (!ser || ser.length < 2) return '<svg class=spark></svg>';
  const ys = ser.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys), r = mx - mn || 1;
  const pts = ser.map((p, i) => `${(i / (ser.length - 1) * 64).toFixed(1)},${(26 - (p[1] - mn) / r * 24).toFixed(1)}`).join(' ');
  return `<svg class=spark viewBox="0 0 64 28"><polyline points="${pts}" fill="none" stroke="${up ? '#1fe08a' : '#ff4d64'}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
}
function hero(label, eqUsd, pnlUsd, pct, w, l, extra, chartId) {
  const mult = eqUsd / (pnlUsd != null ? eqUsd - pnlUsd : eqUsd);
  return `<div class="card hero"><div class=lbl>${label}</div><div class=eq>${E(eqUsd)}</div>
  <div class=sub><span class=${cls(pnlUsd)}>${sg(pnlUsd)}${E(pnlUsd)} (${sg(pct)}${f(pct)}%)</span><span class="badge${mult < 1 ? ' neg' : Math.abs(mult - 1) < 1e-9 ? ' neu' : ''}">${f(mult, 3)}x</span></div>
  <div class=stats>${[['V / P', `<span class=pos>${w}</span> / <span class=neg>${l}</span>`]].concat(extra).map(([k, v]) => `<div class=st><div class=k>${k}</div><div class=v>${v}</div></div>`).join('')}</div>
  <div class=chartw><canvas id=${chartId}></canvas></div></div>`;
}
function agentsCard(list, title) {
  const ag = D.ag || {};
  return `<div class=card><h3>${title}<span class=cnt>${list.length} agenti</span></h3>${list.map(k => { const [nm, c, su] = A[k] || [k, '#ccc', '']; const a = ag[k] || [];
    return `<div class=agent><div class=ic style="background:${c}1a;color:${c}">${svg(k)}</div><div class=an><b>${nm}</b><small>${su}</small><div class=l>${a[1] ? `<span class=ago>${ago(a[0])}</span>${esc(a[1])}` : '<span class=ts>nessuna azione ancora</span>'}</div></div><span class=pill>${esc(a[2] ?? '–')}</span></div>`; }).join('')}</div>`;
}
function feedCard(list, title, note) {
  const html = list && list.length ? list.map(a => { const [id, ts, st, msg] = a; const c = (A[st] || ['', '#9aa4b2'])[1]; const nw = !firstFeed && !seen.has(id);
    return `<div class="fl${nw ? ' new' : ''}"><span class=ts>${hm(ts)}</span><span class=tag style="color:${c};background:${c}17">${esc(st).toUpperCase()}</span><span class=msg>${esc(msg)}</span></div>`; }).join('')
    : '<div class=empty>Nessuna attività ancora.</div>';
  return `<div class=card><h3>${title}<span class=cnt>${note || ''}</span></h3><div class=feed>${html}</div></div>`;
}
function positionsCard(ps, showBook) {
  return `<div class=card><h3>Posizioni aperte<span class=cnt>${ps.length ? ps.length + ' aperte' : ''}</span></h3>${ps.length ? ps.map(p => {
    const r = p.cur ? (p.cur / p.fill - 1) * 100 : null, val = r == null ? null : p.cost * (1 + r / 100);
    return `<div class=prow><div class=pl><b>${esc(p.sym)}</b><small>${showBook ? esc(BOOK_NAME[p.book] || p.book) + ' · ' : ''}dalle ${dt(p.ets)}</small>
      <div class=pm>ingresso ${px(p.ref)} → ${px(p.cur)} · stop ${px(p.stop)}</div></div>
      <div class=pr><span class="pp ${cls(r)}">${r == null ? '–' : sg(r) + f(r, 1) + '%'}</span><small>${E(p.cost)}${val == null ? '' : ' → ' + E(val)}</small></div></div>`; }).join('')
    : '<div class=empty>Nessuna posizione aperta in questo momento.</div>'}</div>`;
}
function tradesCard(bs) {
  const tr = (D.tr && D.tr.t || []).filter(t => !bs || bs.includes(t[0])).slice(0, 15);
  return `<div class=card><h3>Ultimi trade chiusi</h3>${tr.length ? '<table><tr><th>Token</th><th>Uscita</th><th>PnL</th></tr>' + tr.map(t =>
    `<tr><td>${esc(t[1])}<small>${esc(EXIT[t[5]] || t[5])}${bs && bs.length === 1 ? '' : ' · ' + esc(BOOK_NAME[t[0]] || t[0])}</small></td><td>${dt(t[2])}</td><td class=${cls(t[3])}>${sg(t[3])}${E(t[3])}<small>${sg(t[4])}${f(t[4], 1)}%</small></td></tr>`).join('') + '</table>'
    : '<div class=empty>Nessun trade chiuso finora.</div>'}</div>`;
}
function labCard(labs, bs) {
  const L = D.lab || {}; const m = L.m || {};
  const rows = labs.map(l => { const x = m[l]; return `<div class=labrow><span class=ln>${esc(l)}</span><span class=lm>${x ? esc(x[1].replace(/^\[[^\]]+\]\s*/, '')) + `<span class=ts>${dt(x[0])}</span>` : '<span class=ts>in attesa di dati sufficienti</span>'}</span></div>`; }).join('');
  const ex = (L.ex || []).filter(e => !bs || bs.includes(e[1]) || bs.includes(e[3]));
  const et = ex.length ? '<table style="margin-top:8px"><tr><th>Esperimento</th><th>Book</th><th>Stato</th></tr>' + ex.map(e => { const s = SI[e[2]]; const [t, c] = Array.isArray(s) ? s : [s || e[2], ''];
    return `<tr><td>${esc(e[0])}</td><td>${esc(BOOK_NAME[e[1]] || e[1])}</td><td class="${c}">${esc(t)}</td></tr>`; }).join('') + '</table>' : '';
  return `<div class=card><h3>Lab<span class=cnt>${ex.length ? ex.length + ' esperimenti' : ''}</span></h3>${rows}${et}</div>`;
}
function killsCard() {
  const kr = Object.entries((D.lab && D.lab.kr) || {}); const mx = Math.max(1, ...kr.map(x => x[1]));
  return `<div class=card><h3>Scartati dal Filter</h3>${kr.length ? '<table><tr><th>Regola</th><th>Token</th></tr>' + kr.map(([k, n]) =>
    `<tr><td>${esc(KR[k] || k)}<div style="height:4px;border-radius:3px;margin-top:5px;width:${n / mx * 100}%;background:linear-gradient(90deg,#ff4d64,rgba(255,77,100,.3))"></div></td><td>${n}</td></tr>`).join('') + '</table>' : '<div class=empty>Ancora nessun token scartato.</div>'}</div>`;
}

// ---------- views ----------
function renderOverview() {
  const mb = mainBooks(); const s0 = D.sum.s0;
  const eqT = mb.reduce((a, b) => a + bk(b).eq, 0), startT = s0 * mb.length, pnl = eqT - startT, pct = startT ? (eqT / startT - 1) * 100 : 0;
  const w = mb.reduce((a, b) => a + bk(b).w, 0), l = mb.reduce((a, b) => a + bk(b).l, 0), cl = mb.reduce((a, b) => a + bk(b).closed, 0);
  const ps = positions();
  const ecoRows = Object.entries(D.sum.eco).map(([k, e]) => { const bs = e[1].filter(b => D.sum.b[b]); if (!bs.length) return '';
    const eq = bs.reduce((a, b) => a + bk(b).eq, 0), st = s0 * bs.length, p = (eq / st - 1) * 100;
    const ww = bs.reduce((a, b) => a + bk(b).w, 0), ll = bs.reduce((a, b) => a + bk(b).l, 0), op = ps.filter(x => bs.includes(x.book)).length;
    return `<div class=eco data-t="${k}"><div class=en><b>${esc(e[0])}</b><small>${bs.length > 1 ? bs.length + ' portafogli · ' : ''}V/P ${ww}/${ll} · ${op} aperte</small></div>${spark(totalSeries(bs), eq >= st)}<div class=ev>${E(eq, 0)}<small class=${cls(p)}>${sg(p)}${f(p)}%</small></div></div>`; }).join('');
  const labs = liveLabs();
  $('view').innerHTML = hero(`Equity totale · ${mb.length} portafogli`, eqT, pnl, pct, w, l,
      [['Chiusi', cl], ['Aperte', ps.length], ['Partenza', '€' + f(mb.length * 1000, 0)]], 'ch_all')
    + `<div class=card><h3>Portafogli<span class=cnt>tocca per aprire</span></h3>${ecoRows}</div>`
    + agentsCard(liveAgents(Object.keys(A)), 'Desk')
    + positionsCard(ps.filter(p => mb.includes(p.book)), true)
    + feedCard(D.feed && D.feed.f, 'Logger · attività live', 'tutti gli agenti')
    + labCard(labs, null) + tradesCard(mb);
  document.querySelectorAll('.eco').forEach(x => x.onclick = () => setTab(x.dataset.t));
  const ser = totalSeries(mb); const up = !ser.length || ser[ser.length - 1][1] >= startT;
  chart('ch_all', [['Totale', ser, up ? '#1fe08a' : '#ff4d64', true]], mb.length * 1000);
}
function renderEco(e) {
  const bs = booksOf(e); if (!bs.length) { $('view').innerHTML = '<div class=card><div class=empty>Nessun portafoglio in questo ecosistema.</div></div>'; return; }
  if (!sub[e] || !bs.includes(sub[e])) sub[e] = bs[0];
  const b = sub[e], B = bk(b), s0 = D.sum.s0, ser = eqs[b] || [];
  const ps = positions().filter(p => p.book === b);
  const name = B.lab ? '🧪 ' + b : (BOOK_NAME[b] || b);
  const chips = bs.length > 1 ? '<div class=chips>' + bs.map(x => `<button class="chip${x === b ? ' on' : ''}" data-b="${x}">${esc(bk(x).lab ? '🧪 ' + x : (BOOK_NAME[x] || x).split(' · ')[0])}</button>`).join('') + '</div>' : '';
  $('view').innerHTML = `<div class=desc>${ECO[e] ? ECO[e].desc : ''}${B.lab ? '<br>🧪 ' + esc(B.lab) : ''}</div>` + chips
    + hero('Equity paper · ' + esc(name), B.eq, B.eq - s0, B.pct, B.w, B.l, [['Win rate', B.wr == null ? '–' : f(B.wr, 0) + '%'], ['Max DD', `<span class=${B.dd < 0 ? 'neg' : 'neu'}>${f(B.dd, 1)}%</span>`], ['Chiusi', B.closed]], 'ch_' + e)
    + overshootNote(B) + positionsCard(ps, false) + agentsCard(liveAgents(ECO[e] ? ECO[e].agents : []), 'Agenti di questo portafoglio')
    + feedCard(D['feed/' + e] && D['feed/' + e].f, 'Attività live', esc(D.sum.eco[e][0]))
    + labCard(ECO[e] ? ECO[e].labs : [], bs) + tradesCard([b]) + (e === 'prudente' || e === 'aggressivo' ? killsCard() : '');
  document.querySelectorAll('.chip').forEach(c => c.onclick = () => { sub[e] = c.dataset.b; haptic(); render(); });
  chart('ch_' + e, [[name, ser, B.eq >= s0 ? '#1fe08a' : '#ff4d64', true]], 1000);
}
function overshootNote(B) {
  const [n, avg, worst] = B.ov; if (!n) return '';
  return `<div class=card><h3>Precisione delle uscite<span class=cnt>${n} uscite su stop/obiettivo</span></h3><div class=sub style="margin:0">
    <span class=${cls(Math.round(avg * 10))}>${sg(avg)}${f(avg, 1)} punti</span><span class=neu style="font-weight:500;font-size:12.5px">in media rispetto alla soglia · peggiore ${sg(worst)}${f(worst, 1)}</span></div>
    <div class=desc style="margin:6px 0 0">Quanto il prezzo di uscita è finito oltre lo stop (o l’obiettivo): più vicino a 0, meglio è.</div></div>`;
}
function setTab(t) { tab = t; localStorage.setItem('cx_tab', t); haptic(); render(); window.scrollTo({top: 0}); }
function renderTabs() {
  const tabs = [['overview', 'Panoramica', null]].concat(Object.entries(D.sum.eco).map(([k, e]) => { const bs = e[1].filter(b => D.sum.b[b]);
    const eq = bs.reduce((a, b) => a + bk(b).eq, 0), st = D.sum.s0 * bs.length; return [k, e[0], st ? (eq / st - 1) * 100 : null]; }));
  $('tabs').innerHTML = tabs.map(([k, l, p]) => `<button class="tab${k === tab ? ' on' : ''}" data-t="${k}">${esc(l)}${p == null ? '' : `<span class="tp ${cls(Math.round(p * 10))}">${sg(p)}${f(p, 1)}%</span>`}</button>`).join('');
  document.querySelectorAll('.tab').forEach(x => x.onclick = () => setTab(x.dataset.t));
  const on = document.querySelector('.tab.on'); if (on && on.scrollIntoViewIfNeeded) on.scrollIntoViewIfNeeded(false);
}
function render() {
  renderQueued = false;
  if (!D.sum) return;
  if (tab !== 'overview' && !D.sum.eco[tab]) tab = 'overview';
  const sc = window.scrollY, feedEl = document.querySelector('.feed'), fsc = feedEl ? feedEl.scrollTop : 0;
  renderTabs();
  if (tab === 'overview') renderOverview(); else renderEco(tab);
  const fe = document.querySelector('.feed'); if (fe) fe.scrollTop = fsc;
  window.scrollTo(0, sc);
  for (const k of Object.keys(D)) if (k === 'feed' || k.startsWith('feed/')) (D[k].f || []).forEach(a => seen.add(a[0]));
  firstFeed = false;
  $('foot').innerHTML = `Solo paper trading · ogni portafoglio parte da €1.000 virtuali · cambio fisso 1 EUR = ${f(FX(), 4)} USD<br>nessun wallet, nessuna chiave, nessun ordine reale`;
  setLive();
}
function queueRender() { if (!renderQueued) { renderQueued = true; setTimeout(render, 120); } }

// ---------- boot ----------
(function boot() {
  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#050607'); tg.setBackgroundColor && tg.setBackgroundColor('#050607');
      tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  }
  if (!T || !K) {
    $('view').innerHTML = '<div class="card notice"><b>Link incompleto</b>Apri l’app dal pulsante “Apri app” del bot su Telegram, oppure usa il link completo che ti ho mandato.</div>';
    setLive(); return;
  }
  if (!window.crypto || !crypto.subtle || !window.DecompressionStream) {
    $('view').innerHTML = '<div class="card notice"><b>Browser troppo vecchio</b>Aggiorna Telegram o il browser per vedere i dati live.</div>'; return;
  }
  setLive();
  startMqtt();
  startNtfy();
  setTimeout(() => { if (!D.sum) $('view').innerHTML = '<div class="card notice"><b>In attesa dei dati del desk…</b>La connessione è aperta: i dati arrivano appena il desk pubblica il prossimo aggiornamento (al massimo ~15 secondi).</div>'; }, 12000);
})();
