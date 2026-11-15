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
 Sentinel:['Sentinel','#ff6b3d','anti-dump'],Hunter:['Hunter','#e2c044','trova wallet'],Mirror:['Mirror','#7dd3fc','copia i buy'],
 Registratore:['Registratore','#94a3b8','archivia i nastri'],Cacciatore:['Cacciatore','#e2c044','trova wallet precoci'],Analista:['Analista','#f6c453','pagella dei wallet'],
 Sentinella:['Sentinella','#7dd3fc','segue i wallet live'],Confluenza:['Confluenza','#2fe0d2','2+ balene insieme'],Uscite:['Uscite','#ff9b45','esce con le balene']};
const ICON={Scout:"<circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/>",Filter:"<path d='M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z'/><path d='M9 12l2 2 4-4'/>",
 Analyst:"<path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/>",Executor:"<path d='M13 2L4 14h7l-1 8 9-12h-7z'/>",Risk:"<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5'/><circle cx='12' cy='12' r='1'/>",
 Logger:"<path d='M5 4h11l3 3v13H5z'/><path d='M9 10h6M9 14h6M9 18h4'/>",Regime:"<path d='M3 12h4l3-8 4 16 3-8h4'/>",Scalp:"<circle cx='12' cy='13' r='8'/><path d='M12 9v4l2.5 2.5M9 2h6'/>",
 Lab:"<path d='M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3'/><path d='M7 15h10'/>",Sentinel:"<path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'/><circle cx='12' cy='12' r='3'/>",
 Hunter:"<circle cx='12' cy='12' r='8'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/>",Mirror:"<rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2'/>",
 Registratore:"<rect x='3' y='6' width='18' height='12' rx='2'/><circle cx='8' cy='12' r='2'/><circle cx='16' cy='12' r='2'/>",Cacciatore:"<circle cx='12' cy='12' r='8'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/>",
 Analista:"<path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/>",Sentinella:"<path d='M4 12a8 8 0 0116 0M7 12a5 5 0 0110 0'/><circle cx='12' cy='12' r='1.5'/>",
 Confluenza:"<path d='M3 12c3-4 6-4 9 0s6 4 9 0'/><path d='M3 17c3-4 6-4 9 0s6 4 9 0'/>",Uscite:"<path d='M14 4h5v16h-5'/><path d='M10 16l4-4-4-4M14 12H3'/>"};
const BOOK_NAME={A_spec:'Prudente A · stop −6%',B_wide:'Prudente B · stop −12%',C_spec_4h:'Prudente C · time stop 4h',D_wide_noregime:'Prudente D · senza regime',
 X_aggressive:'Aggressivo',X_aggr_sentinel:'Aggressivo + Sentinel',S_scalp:'Scalping',P_pump:'Pump organici · impulso ≥ 65',E_explore:'Esploratore · token più giovani e piccoli',W_whale:'Balene · 2+ wallet smart insieme'};
const BOOK_SHORT={A_spec:'Prudente A',B_wide:'Prudente B',C_spec_4h:'Prudente C',D_wide_noregime:'Prudente D',
 X_aggressive:'Aggressivo',X_aggr_sentinel:'Sentinel',S_scalp:'Scalping',P_pump:'Pump',E_explore:'Esploratore',W_whale:'Balene'};
const shortBook = b => BOOK_SHORT[b] || (BOOK_NAME[b] || b).split(' · ')[0];
const BOOK_TINY={A_spec:'PrA',B_wide:'PrB',C_spec_4h:'PrC',D_wide_noregime:'PrD',
 X_aggressive:'Agg',X_aggr_sentinel:'Sen',S_scalp:'Scl',P_pump:'Pmp',E_explore:'Esp',W_whale:'Bal'};
const tinyBook = b => BOOK_TINY[b] || shortBook(b).replace(/\s+/g, '').slice(0, 3);


const ECO={
 prudente:{agents:['Regime','Scout','Filter','Analyst','Executor','Risk','Lab','Logger'],labs:['Lab Segnali','Lab Uscite'],desc:'Filtri rigorosi e punteggio ≥ 70. Quattro varianti di uscita sugli stessi segnali: A stop −6%, B stop −12%, C con time stop 4h, D come B ma senza pausa di mercato.'},
 aggressivo:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:['Lab Segnali','Lab Uscite'],desc:'Stessi controlli di sicurezza, filtri “morbidi” più larghi e punteggio ≥ 60: più trade, più rischio.'},
 sentinel:{agents:['Filter','Analyst','Executor','Sentinel','Risk','Lab'],labs:['Lab Sentinel'],desc:'Gemello dell’Aggressivo con Sentinel: se vede segni di dump vende metà, se è grave esce del tutto. Test A/B.'},
 scalping:{agents:['Filter','Scalp','Executor','Risk','Lab'],labs:['Lab Scalping'],desc:'Entrate veloci su forte spinta a 5 minuti: obiettivo +4,5%, stop −3%, massimo 20 minuti. Costi inclusi.'},
 pump:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:['Lab Pump'],desc:'Entra sui pump organici precoci: impulso ≥ 65, volume finto < 30, niente firme da bot, tutti i filtri di sicurezza. Stop −7%, trailing 6% dopo +10%, massimo 50 minuti. Size 8%.'},
 esploratore:{agents:['Scout','Filter','Analyst','Executor','Risk'],labs:[],desc:'Esplora token più giovani e più piccoli di quelli che guardano gli altri: da 5 minuti di vita e da $100k di valore. Stessi controlli di sicurezza, punteggio ≥ 60, puntate piccole del 4%. Stop −6%, trailing 5% dopo +8%, massimo 30 minuti. Serve a capire se i paletti degli altri ci fanno perdere occasioni.'},
 balene:{agents:['Registratore','Cacciatore','Analista','Sentinella','Confluenza','Executor','Risk','Uscite'],labs:[],desc:'Segue i wallet “smart”: il Cacciatore trova chi è entrato presto sui token esplosi, l’Analista tiene solo i bravi (non bot, non sniper, non fortuna di un colpo), la Sentinella li segue in tempo reale. Si compra solo se 2+ wallet indipendenti entrano sullo stesso token entro 30 minuti. Size 6% (8% con 3+), stop −12%, trailing 10% dopo +20%, time stop 4h se non arriva a +10%, si esce quando le balene vendono. Prime 24-48 ore IN OMBRA: solo segnali, nessun trade.'},
 copy:{agents:['Hunter','Mirror','Filter','Executor','Sentinel','Risk','Lab'],labs:['Lab Copy'],desc:'Hunter cerca wallet bravi, Mirror copia i loro acquisti (con ritardo e slippage simulati), stessi filtri di sicurezza.'}};
const EXIT={leader_sell:'wallet copiato ha venduto',whale_sell:'le balene hanno venduto',sentinel_warning:'Sentinel (warning)',sentinel_critical:'Sentinel (critico)',stop_loss:'stop loss',trail_stop:'trailing stop',time_stop:'time stop',take_profit:'take profit',liquidity_collapse:'liquidità crollata'};
const KR={pumped_h1:'Già +80% in 1h',low_liquidity:'Liquidità < $20k',liq_to_mcap:'Liq/mcap < 5%',unverifiable:'Non verificabile',rugged_flag:'Segnalato rug',mint_authority:'Mint non revocata',
 freeze_authority:'Freeze non revocata',transfer_fee:'Tassa sul trasferimento',lp_not_locked:'LP non bloccata',top10_concentration:'Top-10 holder troppo alti',dev_holding:'Dev > 3%',dev_past_rugs:'Dev con rug passati',bundle_insiders:'Bundle/insider > 10%',fake_volume:'Volume finto (bot)',volume_bot:'Volume finto (bot)',bump_bot:'Volume finto (bot)',tape_quality:'Volume finto (bot)',wash_volume:'Volume finto (bot)'};
const SI={shadow:['in prova','st-sh'],guard:['guardia','st-sh'],promoted:['promosso','st-pr'],rejected:['respinto','st-rj'],expired:'scaduto',confirmed:['confermato','st-pr'],rolled_back:['annullato','st-rj']};
const PAL=['#1fe08a','#5aa9ff','#f6c453','#a78bfa','#ff9b45','#2fe0d2','#ff7ad9','#7dd3fc','#e2c044','#ff6b3d'];

// ---------- state ----------
const D = {}, TS = {};          // latest payload and its timestamp per message key
let eqs = {};                   // book -> [[t,usd],...]
let tab = localStorage.getItem('cx_tab') || 'overview', sub = {}, charts = {}, seen = new Set(), firstFeed = true;
const LAT = []; window.__cxLat = LAT; window.__cxD = () => D;   // [event->app s, publish->app s] for feed deltas (debug/measurement)
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
const F2_MAX = 150;
let LOGO = {};                  // symbol -> 'd:<id>' | https url
function mergeLines(lines) {    // talking feed lines [id, ts, stage, kind, text, sym, pills, ecos]
  const cur = (D.f2 && D.f2.f) || [], have = new Set(cur.map(x => x[0]));
  const add = lines.filter(x => !have.has(x[0])); if (!add.length) return false;
  D.f2 = {f: add.concat(cur).sort((a, b) => b[0] - a[0]).slice(0, F2_MAX)};
  const ag = D.ag2 || (D.ag2 = {});
  for (const x of add) { const st = x[2], o = ag[st]; if (!o || !(o[0] > x[1])) ag[st] = [x[1], x[3], x[4], x[5], x[6], o ? o[5] : null]; }
  return true;
}
function apply(key, ts, d) {
  if (key.startsWith('eq/')) { const b = key.slice(3); if (!(TS[key] > ts)) { TS[key] = ts; eqs[b] = d.s || []; } return; }
  if (key === 'fd') { mergeLines(d.f || []); return; }                       // live delta (non-retained)
  if (key === 'lg' || key === 'logos') { Object.assign(LOGO, d.l || {}); fixLogos(); return; }
  if (TS[key] > ts) return;
  TS[key] = ts;
  if (key === 'f2') { const keep = ((D.f2 && D.f2.f) || []).filter(x => x[0] > Math.max(...(d.f || [[0]]).map(y => y[0]))); D.f2 = {f: []}; mergeLines(keep.concat(d.f || [])); return; }
  if (key === 'ag2') { const old = D.ag2 || {}; for (const [k, v] of Object.entries(d)) if (old[k] && old[k][0] > (v[0] || 0)) d[k] = [...old[k].slice(0, 5), v[5]]; D.ag2 = d; return; }
  if (key === 'sum') liveEq(ts, d);
  D[key] = d;
}
function liveEq(ts, d) {        // extend each equity curve with the live value (series itself arrives every 5 min)
  for (const [b, v] of Object.entries(d.b || {})) { const s = eqs[b]; if (!s || !s.length) continue;
    const last = s[s.length - 1]; if (ts - last[0] >= 20) s.push([ts, v[0]]); else if (s.length > 1 && last[0] > s[s.length - 2][0] && ts > last[0]) { last[0] = ts; last[1] = v[0]; } }
}
async function ingest(bytes, via) {
  let m;
  try { m = await unseal(bytes); } catch (e) { return; }   // not ours / tampered -> ignore
  if (!m || !m.k) return;
  if (m.k === 'snap') { for (const [k, v] of Object.entries(m.d)) apply(k, m.ts, v); }
  else if (m.k === 'eqs') { for (const [b, s] of Object.entries(m.d)) apply('eq/' + b, m.ts, {s}); }
  else apply(m.k, m.ts, m.d);
  lastMsgAt = Math.max(lastMsgAt, m.ts);
  if (m.k === 'fd' && m.d.f && m.d.f.length) { const lt = Math.max(...m.d.f.map(x => x[1])); LAT.push([Date.now() / 1000 - lt, Date.now() / 1000 - m.ts]); if (LAT.length > 50) LAT.shift(); }
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
function liveAgents(list) { const ag = D.ag2 || D.ag || {}; return list.filter(k => ag[k]); }   // only agents the desk actually runs
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

// ---------- v2: talking lines, logos, keyed patching ----------
const KIND = {buy: ['🟢', '#1fe08a'], sell: ['🔵', '#2fe0d2'], tp: ['💰', '#2fe0d2'], stop: ['🔴', '#ff4d64'], trail: ['🟠', '#ff8a5b'],
  discard: ['⚪', '#8a939e'], eval: ['🟡', '#f6c453'], pass: ['✅', '#8be9a8'], sentinel: ['🛡️', '#ff8a3d'], lab: ['🧪', '#b48cff'],
  regime: ['🌡️', '#5aa9ff'], info: ['🔹', '#9aa4b2'], warn: ['⚠️', '#ffb547']};
const TONE = {g: 'g', r: 'r', t: 't', a: 'a', o: 'o', p: 'p', n: 'n'};
const BIDI = /[\u202a-\u202e\u2066-\u2069\u200e\u200f]/g;
function logoUrl(v) { return !v ? null : v.startsWith('d:') ? 'https://cdn.dexscreener.com/cms/images/' + v.slice(2) + '?width=64&height=64&fit=crop&quality=90&format=auto' : v; }
function hue(s) { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) % 360; return h; }
function initials(s) { const t = s.replace(BIDI, '').replace(/[^\p{L}\p{N}]/gu, ''); return (t || s || '?').slice(0, 2).toUpperCase(); }
function fbLogo(sym) { const h = hue(sym); return `<span class="tk fb" data-s="${esc(sym)}" style="background:linear-gradient(135deg,hsl(${h} 65% 42%),hsl(${(h + 40) % 360} 70% 30%))">${esc(initials(sym))}</span>`; }
function logo(sym) {
  if (!sym) return '';
  const u = logoUrl(LOGO[sym]);
  return u ? `<img class=tk loading=lazy decoding=async referrerpolicy=no-referrer alt="" data-s="${esc(sym)}" src="${esc(u)}" onerror="lgErr(this)">` : fbLogo(sym);
}
window.lgErr = el => { const s = el.dataset.s; LOGO[s] = null; el.outerHTML = fbLogo(s); };
function fixLogos() {           // upgrade initials circles once a logo arrives
  document.querySelectorAll('.tk.fb').forEach(el => { const u = logoUrl(LOGO[el.dataset.s]); if (u) el.outerHTML = logo(el.dataset.s); });
}
const pills = (ps, n) => (ps || []).slice(0, n).map(p => `<span class="pi ${TONE[p[1]] || 'n'}">${esc(p[0])}</span>`).join('');
const rt = ts => `<span class=rt data-ts="${ts || 0}">${ts ? ago(ts) : ''}</span>`;
function fixRt() { document.querySelectorAll('.rt').forEach(el => { const t = +el.dataset.ts; if (t) el.textContent = ago(t); }); }
setInterval(fixRt, 5000);
function oldToNew(a) { return [a[0], a[1], a[2], 'info', a[3], null, [], null, 1]; }   // ntfy-only fallback (old line format)
function feedLines(e) {
  const f = D.f2 && D.f2.f ? D.f2.f : ((D.feed && D.feed.f) || []).map(oldToNew);
  return (e ? f.filter(x => !x[7] || x[7].includes(e)) : f).slice(0, e ? 40 : 60);
}
const lk = x => (x[8] ? 'o' : '') + x[0];   // old-format lines get their own key so v2 lines replace them
function lineHTML(x, fresh) {
  const [id, ts, st, k, text, sym] = x; const [em, col] = KIND[k] || KIND.info;
  return `<div class="ln k-${esc(k)}${fresh ? ' new' : ''}" data-id="${lk(x)}" style="--kc:${col}"><span class=em>${em}</span>${logo(sym)}<span class=tx>${esc((text || '').replace(BIDI, ''))}</span>${pills(x[6], 2)}${rt(ts)}</div>`;
}

// keyed card patching: a card is rebuilt only if its HTML changed; the chart canvas and feed DOM survive updates
const prevVal = {};             // card key -> last tweened number
function patch(cards) {
  const v = $('view'); const want = new Set(cards.map(c => c[0]));
  [...v.children].forEach(el => { if (!want.has(el.dataset.k)) el.remove(); });
  let prev = null;
  for (const [k, html, opt] of cards) {
    let el = [...v.children].find(x => x.dataset.k === k);
    if (opt && opt.feed && el) opt.feed(el);
    else if (!el || el._h !== html) {
      const t = document.createElement('template'); t.innerHTML = html.trim(); const n = t.content.firstElementChild;
      n.dataset.k = k; n._h = html;
      if (el) el.replaceWith(n); else v.appendChild(n);
      el = n;
      if (opt && opt.after) opt.after(el);
    }
    const target = prev ? prev.nextElementSibling : v.firstElementChild;
    if (el !== target) v.insertBefore(el, target);
    prev = el;
  }
  fixRt();
}
function tween(el, key, to, fmt) {
  if (!el) return; const from = prevVal[key]; prevVal[key] = to;
  if (from == null || from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
  el.classList.remove('fu', 'fd'); void el.offsetWidth; el.classList.add(to > from ? 'fu' : 'fd');
  const t0 = performance.now(), dur = 700;
  const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

const SCROLL_ROWS = 5;
// layout-pixel bottom of an element relative to the scroll box (transforms / visual zoom ignored)
function rowBottom(row, box) {
  let top = 0, n = row;
  while (n && n !== box) {
    top += n.offsetTop;
    const p = n.offsetParent;
    if (!p || p === n) break;
    n = p;
  }
  if (n === box) return top + row.offsetHeight;
  const br = row.getBoundingClientRect(), bb = box.getBoundingClientRect();
  const scale = (bb.height && box.clientHeight) ? bb.height / box.clientHeight
              : (bb.width && box.clientWidth) ? bb.width / box.clientWidth : 1;
  return (br.bottom - bb.top) / (scale || 1) + box.scrollTop;
}
function sizeAllScrolls() {
  document.querySelectorAll('.scroll5').forEach(b => { if (b._cxScr) sizeScroll(b, b._cxScr); });
}
function watchScrollLayout() {
  if (watchScrollLayout.on) return;
  watchScrollLayout.on = true;
  const kick = () => sizeAllScrolls();
  window.addEventListener('resize', kick);
  if (window.visualViewport) visualViewport.addEventListener('resize', kick);
  if (tg && tg.onEvent) try { tg.onEvent('viewportChanged', kick); } catch (e) {}
  if (document.fonts) {
    document.fonts.ready.then(kick);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', kick);
  }
  [80, 300, 1000].forEach(ms => setTimeout(kick, ms));
}
function sizeScroll(box, sel) {
  if (!box) return;
  const rows = [...box.querySelectorAll(sel)];
  if (rows.length <= SCROLL_ROWS) {
    box.style.maxHeight = '';
    box.classList.remove('can-scroll');
    box.classList.add('at-end');
    return;
  }
  // distance from the top of the list to the bottom of row 5 (gaps included, slide-in transforms ignored);
  // .scroll5 is position:relative so offsetTop is relative to the list
  const r5 = rows[SCROLL_ROWS - 1];
  let h = rowBottom(r5, box);
  const one = Math.max(0, ...rows.slice(0, SCROLL_ROWS).map(r => r.offsetHeight || 0));
  if (!(h > 0) || (one && h > one * SCROLL_ROWS * 1.6)) h = one * SCROLL_ROWS;   // safety clamp
  box.style.maxHeight = Math.ceil(h) + 'px';
  // grow a pixel or two if subpixels still clip row 5 after the cap is applied
  const still = rowBottom(r5, box);
  if (still > box.clientHeight + 1) box.style.maxHeight = Math.ceil(still) + 'px';
  const more = box.scrollHeight > box.clientHeight + 1;
  box.classList.toggle('can-scroll', more);
  box.classList.toggle('at-end', !more || box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
}
function observeScrollRows(box, sel) {
  if (!box._ro) return;
  const rows = [...box.querySelectorAll(sel)].slice(0, SCROLL_ROWS);
  if (box._roRows) for (const r of box._roRows) { try { box._ro.unobserve(r); } catch (e) {} }
  box._roRows = rows;
  rows.forEach(r => { try { box._ro.observe(r); } catch (e) {} });
}
function attachScroll(box, sel) {
  if (!box) return;
  box._cxScr = sel;
  if (!box._ro && window.ResizeObserver) {
    // re-measure when the card OR the first rows change size (fonts, Telegram expand, rotation).
    // Observing only the card is not enough: a stale max-height pins the card, so a later
    // font/text shrink (the iPhone ~10-row case) would never fire.
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => sizeScroll(box, box._cxScr)); });
    box._ro = ro;
    ro.observe(box.parentElement || box);
  }
  sizeScroll(box, sel);
  observeScrollRows(box, sel);
  watchScrollLayout();
  if (!box._scrEv) {
    box._scrEv = true;
    box.addEventListener('scroll', () => {
      box.classList.toggle('at-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
    }, {passive: true});
  }
}
function keepScroll(box, fn) {
  if (!box) { fn(); return; }
  const pin = box.scrollTop <= 2;
  const top = box.scrollTop, h = box.scrollHeight;
  const prev = box.style.scrollBehavior;
  box.style.scrollBehavior = 'auto';
  fn();
  if (!pin) box.scrollTop = top + (box.scrollHeight - h);
  box.style.scrollBehavior = prev;
}
function afterScroll(sel) {
  return el => {
    const box = el.querySelector('.scroll5');
    if (box) { box._h = box.innerHTML; attachScroll(box, sel); }
  };
}
function patchList(el, sel, inner, titleHtml) {
  const h3 = el.querySelector('h3');
  if (h3 && titleHtml != null) h3.innerHTML = titleHtml;
  const box = el.querySelector('.scroll5');
  if (!box) return;
  if (box._h !== inner) {
    keepScroll(box, () => { box.innerHTML = inner; });
    box._h = inner;
  }
  attachScroll(box, sel);
}

// ---------- components ----------
function chart(id, sets, base) {
  const cv = $(id); if (!cv || !window.Chart) return;
  const all = sets.flatMap(s => s[1]);
  const wrap = cv.parentElement; const em = wrap.querySelector('.chartempty');
  if (all.length < 2) { if (!em) wrap.insertAdjacentHTML('beforeend', '<div class="chartempty sk"><div class="skl chart"></div><span>Il grafico compare dopo i primi minuti di dati</span></div>'); return; }
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
  const opt = {maintainAspectRatio: false, animation: {duration: 400}, parsing: false, interaction: {intersect: false, mode: 'nearest', axis: 'x'},
    plugins: {legend: {display: sets.length > 1, labels: {color: '#9aa4b2', boxWidth: 8, boxHeight: 8, font: {family: 'Inter', size: 10}, filter: i => i.text !== 'base'}},
      tooltip: {backgroundColor: '#14181d', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, filter: i => i.dataset.label !== 'base',
        callbacks: {title: it => new Date(it[0].parsed.x).toLocaleString('it-IT', {timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}), label: it => ` ${it.dataset.label}: €${f(it.parsed.y)}`}}},
    scales: {x: {type: 'linear', min: x0 * 1000, max: x1 * 1000, grid: {display: false}, border: {display: false}, ticks: {color: '#5b636e', font: {family: 'Inter', size: 10}, maxTicksLimit: 5, callback: v => new Date(v).toLocaleTimeString('it-IT', {timeZone: TZ, hour: '2-digit', minute: '2-digit'})}},
      y: {min: y0, max: y1, grid: {color: 'rgba(255,255,255,.04)'}, border: {display: false}, ticks: {color: '#5b636e', font: {family: 'Inter', size: 10}, maxTicksLimit: 5, callback: v => '€' + f(v, (y1 - y0) < 20 ? 1 : 0)}}}};
  const sig = JSON.stringify([ds.map(d => d.data.length + ':' + (d.data.length ? d.data[d.data.length - 1].y : 0)), y0, y1]);
  if (charts[id] && charts[id].canvas === cv) { if (charts[id]._sig === sig) return; charts[id].data.datasets = ds; charts[id].options = opt; charts[id].update(); }
  else { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(cv, {type: 'line', data: {datasets: ds}, options: Object.assign({}, opt, {animation: false})}); }
  charts[id]._sig = sig;
}
function spark(ser, up) {
  if (!ser || ser.length < 2) return '<svg class=spark></svg>';
  const ys = ser.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys), r = mx - mn || 1;
  const pts = ser.map((p, i) => `${(i / (ser.length - 1) * 64).toFixed(1)},${(26 - (p[1] - mn) / r * 24).toFixed(1)}`).join(' ');
  return `<svg class=spark viewBox="0 0 64 28"><polyline points="${pts}" fill="none" stroke="${up ? '#1fe08a' : '#ff4d64'}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
}
function sparkMini(ser, up) {
  if (!ser || ser.length < 2) return '';
  const w = 72, h = 22, ys = ser.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys), r = mx - mn || 1;
  const pts = ser.map((p, i) => `${(i / (ser.length - 1) * w).toFixed(1)},${(h - 2 - (p[1] - mn) / r * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class=bspark viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up ? '#1fe08a' : '#ff4d64'}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function heroCard(k, label, eqUsd, pnlUsd, pct, w, l, extra) {
  const mult = eqUsd / (pnlUsd != null ? eqUsd - pnlUsd : eqUsd);
  // the big number is filled (and tweened) after patching, so tiny equity moves don't rebuild the card
  return [k, `<div class="card hero"><div class=lbl>${label}</div><div class=eq data-n="${eqUsd}">${E(prevVal[k] ?? eqUsd)}</div>
  <div class=pnl><span class="pv ${cls(pnlUsd)}">${sg(pnlUsd)}${E(pnlUsd)}</span><span class="pc ${cls(pnlUsd)}">${sg(pct)}${f(pct)}%</span><span class="badge${mult < 1 ? ' neg' : Math.abs(mult - 1) < 1e-9 ? ' neu' : ''}">${f(mult, 3)}x</span><span class=pnll>P&amp;L dalla partenza</span></div>
  <div class=stats>${[['V / P', `<span class=pos>${w}</span> / <span class=neg>${l}</span>`]].concat(extra).map(([k2, v]) => `<div class=st><div class=k>${k2}</div><div class=v>${v}</div></div>`).join('')}</div></div>`];
}
const chartCard = id => [id, `<div class="card chartcard"><div class=chartw><canvas id=${id}></canvas></div></div>`];
const lastAg = {};
function agentsCard(k, list, title) {
  const ag = D.ag2 || {}, old = D.ag || {};
  const rows = list.map(a => {
    const [nm, c] = A[a] || [a, '#ccc']; const x = ag[a];
    const fresh = x && lastAg[a] != null && lastAg[a] !== x[0];
    if (x) lastAg[a] = x[0];
    const kc = x ? (KIND[x[1]] || KIND.info)[1] : '#5b636e';
    const body = x && x[2] ? `${logo(x[3])}<span class=tx>${esc(x[2].replace(BIDI, ''))}</span>${pills(x[4], 2)}${rt(x[0])}`
      : old[a] && old[a][1] ? `<span class=tx>${esc(old[a][1])}</span>${rt(old[a][0])}` : `<span class="tx mut">${esc(nm)} · nessuna azione ancora</span>`;
    return `<div class="arow${fresh ? ' flash' : ''}" style="--kc:${kc}" title="${esc(nm + (x && x[5] ? ' · ' + x[5] : ''))}"><span class=ic style="background:${c}1a;color:${c}">${svg(a)}</span>${body}</div>`;
  }).join('');
  const titleHtml = `${title}<span class=cnt>${list.length} agenti</span>`;
  return [k, `<div class=card><h3>${titleHtml}</h3><div class="scroll5 aglist">${rows}</div></div>`, {after: afterScroll('.arow'), feed: el => patchList(el, '.arow', rows, titleHtml)}];
}
function feedCard(k, lines, title, note) {
  const body = lines.length ? lines.map(x => lineHTML(x, false)).join('') : '<div class=empty>Nessuna attività ancora.</div>';
  const titleHtml = `${title}<span class=cnt>${note || ''}</span>`;
  const html = `<div class="card feedcard"><h3>${titleHtml}</h3><div class="scroll5 feed">${body}</div></div>`;
  return [k, html, {after: afterScroll('.ln'), feed: el => {
    const h3 = el.querySelector('h3');
    if (h3) h3.innerHTML = titleHtml;
    const box = el.querySelector('.feed'); const ids = new Set(lines.map(lk));
    const have = new Set([...box.querySelectorAll('.ln')].map(n => n.dataset.id));
    if (![...have].some(h => ids.has(h))) {   // first data / format switch: no animation
      keepScroll(box, () => { box.innerHTML = body; });
      box._h = body;
      attachScroll(box, '.ln');
      return;
    }
    box.querySelectorAll('.empty').forEach(n => n.remove());
    const num = h => +String(h).replace(/^o/, '');
    const add = lines.filter(x => !have.has(lk(x))).sort((a, b) => a[0] - b[0]);
    keepScroll(box, () => {
      for (const x of add) {   // insert keeping id order (newest on top), slide-in; keep scroll if user is down
        const t = document.createElement('template'); t.innerHTML = lineHTML(x, true); const n = t.content.firstElementChild;
        const after = [...box.children].find(c => num(c.dataset.id) < x[0]);
        box.insertBefore(n, after || null);
      }
      box.querySelectorAll('.ln').forEach(n => { if (!ids.has(n.dataset.id)) n.remove(); });
    });
    attachScroll(box, '.ln');
  }}];
}
const lastPos = {};
function positionsCard(k, ps, showBook) {
  const rows = ps.map(p => {
    const r = p.cur ? (p.cur / p.fill - 1) * 100 : null, val = r == null ? null : p.cost * (1 + r / 100);
    const id = p.book + '|' + p.sym, pr = lastPos[id]; lastPos[id] = r;
    const fl = pr != null && r != null && Math.abs(r - pr) >= 0.05 ? (r > pr ? ' up' : ' dn') : '';
    return `<div class="prow${fl}">${logo(p.sym)}<div class=pl><div class=pt><b>${esc((p.sym || '').replace(BIDI, ''))}</b><small>${showBook ? esc((BOOK_NAME[p.book] || p.book).split(' · ')[0]) + ' · ' : ''}${rt(p.ets)}</small></div>
      <div class=pm>${px(p.ref)} → ${px(p.cur)} · stop ${px(p.stop)}</div></div>
      <div class=pr><span class="pp ${cls(r)}">${r == null ? '–' : sg(r) + f(r, 1) + '%'}</span><small>${E(p.cost)}${val == null ? '' : ' → ' + E(val)}</small></div></div>`; }).join('');
  return [k, `<div class=card><h3>Posizioni aperte<span class=cnt>${ps.length ? ps.length + (ps.length === 1 ? ' aperta' : ' aperte') + ' · prezzi ogni 2 s' : ''}</span></h3>${ps.length ? rows : '<div class=empty>Nessuna posizione aperta in questo momento.</div>'}</div>`];
}
function tradesCard(k, bs) {
  const tr = (D.tr && D.tr.t || []).filter(t => !bs || bs.includes(t[0])).slice(0, 15);
  const inner = tr.length ? tr.map(t => { const kk = t[3] >= 0 ? 'tp' : (/stop/.test(t[5]) ? 'stop' : 'sell');
    return `<div class=trow style="--kc:${KIND[kk][1]}">${logo(t[1])}<div class=pl><div class=pt><b>${esc((t[1] || '').replace(BIDI, ''))}</b><small>${esc(EXIT[t[5]] || t[5])}${bs && bs.length === 1 ? '' : ' · ' + esc((BOOK_NAME[t[0]] || t[0]).split(' · ')[0])}</small></div><div class=pm>${dt(t[2])}</div></div>
      <div class=pr><span class="pp ${cls(t[3])}">${sg(t[4])}${f(t[4], 1)}%</span><small class=${cls(t[3])}>${sg(t[3])}${E(t[3])}</small></div></div>`; }).join('')
    : '<div class=empty>Nessun trade chiuso finora.</div>';
  return [k, `<div class=card><h3>Ultimi trade chiusi</h3><div class="scroll5 trlist">${inner}</div></div>`, {after: afterScroll('.trow'), feed: el => patchList(el, '.trow', inner, 'Ultimi trade chiusi')}];
}
function labCard(k, labs, bs) {
  const L = D.lab || {}; const m = L.m || {};
  const rows = labs.map(l => { const x = m[l]; return `<div class=labrow><span class=ln2>${esc(l)}</span><span class=lm>${x ? esc(x[1].replace(/^\[[^\]]+\]\s*/, '')) + `<span class=ts>${dt(x[0])}</span>` : '<span class=ts>in attesa di dati sufficienti</span>'}</span></div>`; }).join('');
  const ex = (L.ex || []).filter(e => !bs || bs.includes(e[1]) || bs.includes(e[3]));
  const et = ex.length ? '<table style="margin-top:8px"><tr><th>Esperimento</th><th>Book</th><th>Stato</th></tr>' + ex.map(e => { const s = SI[e[2]]; const [t, c] = Array.isArray(s) ? s : [s || e[2], ''];
    return `<tr><td>${esc(e[0])}</td><td>${esc(BOOK_NAME[e[1]] || e[1])}</td><td class="${c}">${esc(t)}</td></tr>`; }).join('') + '</table>' : '';
  return [k, `<div class=card><h3>Lab<span class=cnt>${ex.length ? ex.length + ' esperimenti' : ''}</span></h3>${rows}${et}</div>`];
}
function killsCard(k) {
  const kr = Object.entries((D.lab && D.lab.kr) || {}); const mx = Math.max(1, ...kr.map(x => x[1]));
  return [k, `<div class=card><h3>Scartati dal Filter</h3>${kr.length ? '<table><tr><th>Regola</th><th>Token</th></tr>' + kr.map(([r, n]) =>
    `<tr><td>${esc(KR[r] || r)}<div style="height:4px;border-radius:3px;margin-top:5px;width:${n / mx * 100}%;background:linear-gradient(90deg,#ff4d64,rgba(255,77,100,.3))"></div></td><td>${n}</td></tr>`).join('') + '</table>' : '<div class=empty>Ancora nessun token scartato.</div>'}</div>`];
}
function overshootNote(k, B) {
  const [n, avg, worst] = B.ov; if (!n) return null;
  return [k, `<div class=card><h3>Precisione delle uscite<span class=cnt>${n} uscite su stop/obiettivo</span></h3><div class=sub style="margin:0">
    <span class=${cls(Math.round(avg * 10))}>${sg(avg)}${f(avg, 1)} punti</span><span class=neu style="font-weight:500;font-size:12.5px">in media rispetto alla soglia · peggiore ${sg(worst)}${f(worst, 1)}</span></div>
    <div class=desc style="margin:6px 0 0">Quanto il prezzo di uscita è finito oltre lo stop (o l’obiettivo): più vicino a 0, meglio è.</div></div>`];
}
function allAgents() { return [...new Set(Object.keys(A).concat(Object.keys(D.ag2 || D.ag || {})))]; }
function afterHero(k) { const el = document.querySelector(`[data-k="${k}"] .eq`); if (el) tween(el, k, +el.dataset.n, v => E(v)); }

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
  const hk = 'o_hero';
  patch([
    heroCard(hk, `Equity totale · ${mb.length} portafogli`, eqT, pnl, pct, w, l, [['Chiusi', cl], ['Aperte', ps.length], ['Partenza', '€' + f(mb.length * 1000, 0)]]),
    chartCard('ch_all'),
    positionsCard('o_pos', ps.filter(p => mb.includes(p.book)), true),
    feedCard('o_feed', feedLines(null), 'Attività live', 'tutti gli agenti'),
    agentsCard('o_ag', liveAgents(allAgents()), 'Stato degli agenti'),
    ['o_eco', `<div class=card><h3>Portafogli<span class=cnt>tocca per aprire</span></h3>${ecoRows}</div>`, {after: el => el.querySelectorAll('.eco').forEach(x => x.onclick = () => setTab(x.dataset.t))}],
    tradesCard('o_tr', mb), labCard('o_lab', liveLabs(), null), killsCard('o_kr')]);
  afterHero(hk);
  const ser = totalSeries(mb); const up = !ser.length || ser[ser.length - 1][1] >= startT;
  chart('ch_all', [['Totale', ser, up ? '#1fe08a' : '#ff4d64', true]], mb.length * 1000);
}
function renderEco(e) {
  const bs = booksOf(e); if (!bs.length) { patch([['none_' + e, '<div class=card><div class=empty>Nessun portafoglio in questo ecosistema.</div></div>']]); return; }
  if (!sub[e] || !bs.includes(sub[e])) sub[e] = bs[0];
  const b = sub[e], B = bk(b), s0 = D.sum.s0, ser = eqs[b] || [];
  const ps = positions().filter(p => p.book === b);
  const name = B.lab ? '🧪 ' + b : (BOOK_NAME[b] || b);
  const p = e + '_' + b + '_', hk = p + 'hero', ck = 'ch_' + e + '_' + b.replace(/\W/g, '');
  patch([
    [p + 'desc', `<div class=intro><div class=desc>${ECO[e] ? ECO[e].desc : 'Portafoglio paper aggiunto di recente: stesse regole di sicurezza, dati live dal desk.'}${B.lab ? '<br>🧪 ' + esc(B.lab) : ''}</div>${bs.length > 1 ? '<div class=chips></div>' : ''}</div>`,
      {after: el => syncChips(el, e, bs, b), feed: el => syncChips(el, e, bs, b)}],
    heroCard(hk, 'Equity paper · ' + esc(name), B.eq, B.eq - s0, B.pct, B.w, B.l, [['Win rate', B.wr == null ? '–' : f(B.wr, 0) + '%'], ['Max DD', `<span class=${B.dd < 0 ? 'neg' : 'neu'}>${f(B.dd, 1)}%</span>`], ['Chiusi', B.closed]]),
    chartCard(ck),
    positionsCard(p + 'pos', ps, false),
    feedCard(p + 'feed', feedLines(e), 'Attività live', esc(D.sum.eco[e][0])),
    agentsCard(p + 'ag', liveAgents(ECO[e] ? ECO[e].agents : allAgents()), 'Stato degli agenti'),
    overshootNote(p + 'ov', B),
    tradesCard(p + 'tr', [b]), labCard(p + 'lab', ECO[e] ? ECO[e].labs : [], bs),
    e === 'prudente' || e === 'aggressivo' || e === 'pump' || e === 'esploratore' ? killsCard(p + 'kr') : null].filter(Boolean));
  afterHero(hk);
  chart(ck, [[name, ser, B.eq >= s0 ? '#1fe08a' : '#ff4d64', true]], 1000);
}
function setTab(t) {
  if (t === tab) return; tab = t; localStorage.setItem('cx_tab', t); haptic();
  const v = $('view'); v.classList.remove('swap'); void v.offsetWidth; v.classList.add('swap'); setTimeout(() => v.classList.remove('swap'), 450);
  render(); window.scrollTo({top: 0});
}

// ---------- v6: performance board + switcher (patched in place) ----------
function goBook(b) {
  const e = ecoOf(b); if (!e) return;
  sub[e] = b;
  if (tab === e) { haptic(); render(); window.scrollTo({top: 0}); }
  else setTab(e);
}
function shownCls(v, d) {          // colour from the rounded value so 0,00 stays grey
  const n = Number(Number(v).toFixed(d)); return cls(n);
}
function openMain() {
  const mb = new Set(mainBooks()), o = {};
  for (const p of positions()) if (mb.has(p.book)) o[p.book] = true;
  return o;
}
function syncChips(el, e, bs, cur) {
  let wrap = el.querySelector('.chips');
  if (!bs || bs.length <= 1) { if (wrap) wrap.remove(); return; }
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'chips'; el.appendChild(wrap); }
  const have = [...wrap.children], byB = Object.fromEntries(have.map(c => [c.dataset.b, c]));
  const nodes = [];
  for (const x of bs) {
    let c = byB[x];
    if (!c) {
      c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.dataset.b = x;
      c.innerHTML = '<span class="tdot" hidden></span><span class="cn"></span><span class="tp"></span>';
      c.onclick = () => { sub[e] = c.dataset.b; haptic(); render(); };
    }
    const name = bk(x).lab ? '🧪 ' + x : shortBook(x);
    const cn = c.querySelector('.cn'); if (cn.textContent !== name) cn.textContent = name;
    const pct = bk(x).pct, ptxt = sg(pct) + f(pct, 1) + '%', tp = c.querySelector('.tp');
    if (tp.textContent !== ptxt) tp.textContent = ptxt;
    tp.className = 'tp ' + shownCls(pct, 1);
    c.querySelector('.tdot').hidden = !positions().some(p => p.book === x);
    c.classList.toggle('on', x === cur);
    nodes.push(c);
  }
  if (have.map(c => c.dataset.b).join('\0') !== bs.join('\0')) {
    nodes.forEach(c => wrap.appendChild(c));
    have.forEach(c => { if (!bs.includes(c.dataset.b)) c.remove(); });
  }
}
function renderBoard() {
  const el = $('perf'); if (!el || !D.sum) return;
  const mb = mainBooks();
  if (!mb.length) { el.hidden = true; return; }
  el.hidden = false; el.classList.add('board');
  const s0 = D.sum.s0, eqT = mb.reduce((a, b) => a + bk(b).eq, 0), startT = s0 * mb.length;
  const pctT = startT ? (eqT / startT - 1) * 100 : 0;
  const open = openMain();
  const items = mb.map(b => ({b, name: shortBook(b), tiny: tinyBook(b), pct: bk(b).pct, open: !!open[b]}))
    .sort((a, c) => (c.pct - a.pct) || a.name.localeCompare(c.name, 'it'));
  const scale = Math.max(2, ...items.map(it => Math.abs(it.pct)));

  let tot = el.querySelector('.board-tot');
  if (!tot) {
    tot = document.createElement('button'); tot.type = 'button'; tot.className = 'board-tot'; tot.title = 'Apri la panoramica';
    tot.innerHTML = '<span class="board-k">Totale</span><span class="board-row"><span class="board-eq"></span><span class="board-spark"></span><span class="board-pct"></span></span>';
    tot.onclick = () => setTab('overview');
    el.appendChild(tot);
  }
  const eqEl = tot.querySelector('.board-eq'), pcEl = tot.querySelector('.board-pct');
  const eqTxt = E(eqT), pcTxt = sg(pctT) + f(pctT) + '%';
  if (eqEl.textContent !== eqTxt) eqEl.textContent = eqTxt;
  if (pcEl.textContent !== pcTxt) pcEl.textContent = pcTxt;
  pcEl.className = 'board-pct ' + shownCls(pctT, 2);
  tot.classList.toggle('on', tab === 'overview');
  const ser = totalSeries(mb), up = !ser.length || ser[ser.length - 1][1] >= startT;
  const sp = tot.querySelector('.board-spark');
  const sig = ser.length + ':' + (ser.length ? ser[ser.length - 1][1] : 0) + ':' + (up ? 1 : 0);
  if (sp._sig !== sig) { sp._sig = sig; sp.innerHTML = sparkMini(ser, up); }

  let heat = el.querySelector('.heat');
  if (!heat) { heat = document.createElement('div'); heat.className = 'heat'; heat.setAttribute('role', 'list'); el.appendChild(heat); }
  const have = [...heat.children], byB = Object.fromEntries(have.map(c => [c.dataset.b, c]));
  const want = items.map(it => it.b), nodes = [];
  for (const it of items) {
    let c = byB[it.b];
    if (!c) {
      c = document.createElement('button'); c.type = 'button'; c.className = 'heat-cell'; c.dataset.b = it.b;
      c.setAttribute('role', 'listitem');
      c.innerHTML = '<span class="heat-track"><i class="heat-bar"></i><span class="hdot" hidden></span></span><span class="heat-n"></span>';
      c.onclick = ev => { ev.stopPropagation(); goBook(c.dataset.b); };
    }
    const h = Math.max(8, Math.round(Math.abs(it.pct) / scale * 100));
    if (c.style.getPropertyValue('--h') !== String(h)) c.style.setProperty('--h', h);
    c.classList.remove('pos', 'neg', 'neu'); c.classList.add(shownCls(it.pct, 1));
    const e = ecoOf(it.b), cur = e && (sub[e] || booksOf(e)[0]);
    c.classList.toggle('on', tab !== 'overview' && tab === e && cur === it.b);
    c.querySelector('.hdot').hidden = !it.open;
    const lab = c.querySelector('.heat-n');
    if (lab.textContent !== it.tiny) lab.textContent = it.tiny;
    c.title = it.name + ' · ' + sg(it.pct) + f(it.pct, 1) + '%';
    nodes.push(c);
  }
  if (have.map(c => c.dataset.b).join('\0') !== want.join('\0')) {
    nodes.forEach(c => heat.appendChild(c));
    have.forEach(c => { if (!want.includes(c.dataset.b)) c.remove(); });
  }
}
function renderTabs() {
  const el = $('tabs'); if (!el || !D.sum) return;
  const open = openMain();
  const ecos = Object.entries(D.sum.eco).map(([k, ev]) => {
    const bs = ev[1].filter(b => D.sum.b[b] && !bk(b).lab);
    const eq = bs.reduce((a, b) => a + bk(b).eq, 0), st = D.sum.s0 * bs.length;
    const pct = st ? (eq / st - 1) * 100 : null;
    return {k, label: ev[0], pct, open: bs.some(b => open[b]), bits: bs.map(b => bk(b).pct)};
  });
  let lead = null, leadPct = -Infinity;
  for (const x of ecos) if (x.pct != null && x.pct > leadPct) { leadPct = x.pct; lead = x.k; }
  const items = [{k: 'overview', label: 'Panoramica', pct: null, open: false, bits: []}].concat(ecos);
  const have = [...el.children], byK = Object.fromEntries(have.map(t => [t.dataset.t, t]));
  const want = items.map(x => x.k), nodes = [];
  const scale = Math.max(2, ...ecos.map(x => Math.abs(x.pct || 0)));
  const prevOn = el.querySelector('.tab.on') && el.querySelector('.tab.on').dataset.t;
  for (const it of items) {
    let t = byK[it.k];
    if (!t) {
      t = document.createElement('button'); t.type = 'button'; t.className = 'tab'; t.dataset.t = it.k;
      t.innerHTML = '<span class="tdot" hidden></span><span class="tn"></span><span class="tp"></span><span class="tbits"></span><span class="tbar"><i></i></span>';
      t.onclick = () => setTab(t.dataset.t);
    }
    const tn = t.querySelector('.tn'); if (tn.textContent !== it.label) tn.textContent = it.label;
    const tp = t.querySelector('.tp');
    if (it.pct == null) { tp.hidden = true; tp.textContent = ''; tp.className = 'tp'; }
    else {
      tp.hidden = false;
      const ptxt = sg(it.pct) + f(it.pct, 1) + '%';
      if (tp.textContent !== ptxt) tp.textContent = ptxt;
      tp.className = 'tp ' + shownCls(it.pct, 1);
    }
    t.querySelector('.tdot').hidden = !it.open;
    t.classList.toggle('on', it.k === tab);
    t.classList.toggle('lead', it.k === lead);
    t.classList.toggle('hot-pos', it.pct != null && it.pct >= 1);
    t.classList.toggle('hot-neg', it.pct != null && it.pct <= -1);
    const barWrap = t.querySelector('.tbar'), bar = barWrap.querySelector('i');
    if (it.pct == null) barWrap.hidden = true;
    else {
      barWrap.hidden = false;
      bar.style.width = Math.max(10, Math.round(Math.abs(it.pct) / scale * 100)) + '%';
      bar.className = shownCls(it.pct, 1);
    }
    const bits = t.querySelector('.tbits');
    if (it.bits.length > 1) {
      bits.hidden = false;
      if (bits.childElementCount !== it.bits.length) bits.innerHTML = it.bits.map(() => '<i></i>').join('');
      [...bits.children].forEach((i, n) => { i.className = shownCls(it.bits[n], 1); });
    } else { bits.hidden = true; if (bits.childElementCount) bits.innerHTML = ''; }
    nodes.push(t);
  }
  if (have.map(t => t.dataset.t).join('\0') !== want.join('\0')) {
    const sl = el.scrollLeft;
    nodes.forEach(t => el.appendChild(t));
    have.forEach(t => { if (!want.includes(t.dataset.t)) t.remove(); });
    el.scrollLeft = sl;
  }
  if (prevOn !== tab) {
    const on = el.querySelector('.tab.on');
    if (on) { if (on.scrollIntoViewIfNeeded) on.scrollIntoViewIfNeeded(false); else on.scrollIntoView({inline: 'nearest', block: 'nearest'}); }
  }
}
function render() {
  renderQueued = false;
  if (!D.sum) return;
  if (tab !== 'overview' && !D.sum.eco[tab]) tab = 'overview';
  renderBoard();
  renderTabs();
  if (tab === 'overview') renderOverview(); else renderEco(tab);
  const foot = `Solo paper trading · ogni portafoglio parte da €1.000 virtuali · cambio fisso 1 EUR = ${f(FX(), 4)} USD<br>nessun wallet, nessuna chiave, nessun ordine reale`;
  if ($('foot')._h !== foot) { $('foot')._h = foot; $('foot').innerHTML = foot; }
  setLive();
}
function queueRender() { if (!renderQueued) { renderQueued = true; setTimeout(render, 80); } }

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
