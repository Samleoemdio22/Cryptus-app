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
const A = {Scout:['Scout','#5aa9ff','cerca token nuovi'],Filter:['Filter','#ff4d64','scarta quelli troppo rischiosi'],Analyst:['Analyst','#f6c453','misura quanto un token rischia di crollare: per ora non decide'],
 Executor:['Executor','#1fe08a','compra e vende, solo in prova'],Risk:['Risk','#ff9b45','chiude se il prezzo va troppo contro'],Logger:['Logger','#9aa4b2','tiene lo storico'],
 Regime:['Regime','#a78bfa','dice se il mercato è buono o debole'],Scalp:['Scalp','#2fe0d2','cerca mosse rapide di pochi minuti'],Lab:['Lab','#ff7ad9','prova idee in parallelo, senza toccare gli originali'],
 Sentinel:['Sentinel','#ff6b3d','vende se il prezzo sta crollando'],Hunter:['Hunter','#e2c044','cerca portafogli bravi da copiare'],Mirror:['Mirror','#7dd3fc','copia i loro acquisti'],
 Registratore:['Registratore','#94a3b8','salva i movimenti dei grandi portafogli'],Cacciatore:['Cacciatore','#e2c044','trova chi è entrato presto sui token esplosi'],Analista:['Analista','#f6c453','tiene solo i portafogli che vincono per davvero'],
 Sentinella:['Sentinella','#7dd3fc','li segue in tempo reale'],Confluenza:['Confluenza','#2fe0d2','avvisa quando due o più entrano insieme'],Uscite:['Uscite','#ff9b45','esce quando quei portafogli vendono'],
 Meteo:['Meteo','#a78bfa','dice se il mercato sale, scende o sta fermo'],Derivati:['Derivati','#5aa9ff','guarda le scommesse grosse e i fallimenti improvvisi'],Calendario:['Calendario','#f6c453','avvisa prima delle notizie importanti'],
 Consiglio:['Consiglio','#e2c044','vota sì o no sui trade più grossi'],Allocatore:['Allocatore','#ff7ad9','propone come spostare i soldi, per ora solo in prova'],Pagella:['Pagella','#9aa4b2','confronta il risultato con Bitcoin tenuto fermo'],
 Flusso:['Flusso','#2fe0d2','guarda chi sta comprando e vendendo adesso'],Commissioni:['Commissioni','#ff4d64','blocca il trade se le spese mangerebbero il guadagno'],Sessioni:['Sessioni','#5aa9ff','entra quando Londra o New York aprono con forza'],
 Segugio:['Segugio','#1fe08a','cerca i trend che stanno partendo'],Bande:['Bande','#f6c453','compra in basso e vende in alto, quando il mercato va a zig-zag'],Forza:['Forza','#a78bfa','sceglie le monete che battono Bitcoin'],
 Folla:['Folla','#ff6b3d','entra contro la folla quando esagera'],Rate:['Rate','#7dd3fc','compra un po’ ogni giorno'],
 Incroci:['Incroci','#1fe08a','entra quando la media veloce incrocia quella lenta'],
 Pagellista:['Pagellista','#a78bfa','dà il voto ai wallet: quanto guadagna chi li copia'],'Anti-inseguimento':['Anti-inseguimento','#ff9b45','non copia se il prezzo è già salito'],
 'Segugio lento':['Segugio lento','#7dd3fc','guarda il trend di ogni giorno su 16 monete'],Esattore:['Esattore','#e2c044','incassa il funding ogni 8 ore'],
 Anagrafe:['Anagrafe','#94a3b8','guarda chi ha comprato il token appena nato: per ora misura, non decide'],
 Classifica:['Classifica','#1fe08a','mette in fila le 20 monete, dalla più forte alla più debole'],
 Bilancia:['Bilancia','#7dd3fc','controlla che acquisti e scommesse al ribasso pesino uguale'],
 Quotazioni:['Quotazioni','#f6c453','aspetta le monete nuove su Binance e le segue nella prima settimana'],
 Cercatore:['Cercatore','#2fe0d2','ogni notte cerca i trader lenti e in guadagno su Hyperliquid e annota cosa fanno: solo misura, non copia']};
const ICON={Scout:"<circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/>",Filter:"<path d='M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z'/><path d='M9 12l2 2 4-4'/>",
 Analyst:"<path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/>",Executor:"<path d='M13 2L4 14h7l-1 8 9-12h-7z'/>",Risk:"<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5'/><circle cx='12' cy='12' r='1'/>",
 Logger:"<path d='M5 4h11l3 3v13H5z'/><path d='M9 10h6M9 14h6M9 18h4'/>",Regime:"<path d='M3 12h4l3-8 4 16 3-8h4'/>",Scalp:"<circle cx='12' cy='13' r='8'/><path d='M12 9v4l2.5 2.5M9 2h6'/>",
 Lab:"<path d='M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3'/><path d='M7 15h10'/>",Sentinel:"<path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'/><circle cx='12' cy='12' r='3'/>",
 Hunter:"<circle cx='12' cy='12' r='8'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/>",Mirror:"<rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2'/>",
 Registratore:"<rect x='3' y='6' width='18' height='12' rx='2'/><circle cx='8' cy='12' r='2'/><circle cx='16' cy='12' r='2'/>",Cacciatore:"<circle cx='12' cy='12' r='8'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/>",
 Analista:"<path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/>",Sentinella:"<path d='M4 12a8 8 0 0116 0M7 12a5 5 0 0110 0'/><circle cx='12' cy='12' r='1.5'/>",
 Confluenza:"<path d='M3 12c3-4 6-4 9 0s6 4 9 0'/><path d='M3 17c3-4 6-4 9 0s6 4 9 0'/>",Uscite:"<path d='M14 4h5v16h-5'/><path d='M10 16l4-4-4-4M14 12H3'/>",
 Meteo:"<path d='M17 18H7a4 4 0 110-8 6 6 0 0111.3 2A3 3 0 0117 18z'/>",Derivati:"<path d='M3 17l6-6 4 4 8-8'/><path d='M14 7h7v7'/>",
 Calendario:"<rect x='3' y='5' width='18' height='16' rx='2'/><path d='M3 10h18M8 3v4M16 3v4'/>",Consiglio:"<circle cx='8' cy='9' r='3'/><circle cx='16' cy='9' r='3'/><path d='M2 20c1-3 3.5-5 6-5s5 2 6 5M12 20c.7-2.3 2.2-4 4-4 2.5 0 4.5 2 5 4'/>",
 Allocatore:"<path d='M12 3v18M5 8h14M7 8l-3 7h6zM17 8l-3 7h6z'/>",Pagella:"<path d='M6 3h9l3 3v15H6z'/><path d='M9 12l2 2 4-4'/>",
 Flusso:"<path d='M3 8h12l-3-3M21 16H9l3 3'/>",Commissioni:"<circle cx='12' cy='12' r='9'/><path d='M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2'/>",
 Sessioni:"<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",Segugio:"<path d='M3 17l5-5 4 3 9-9'/><path d='M15 6h6v6'/>",Bande:"<path d='M3 7c4-3 14-3 18 0M3 17c4 3 14 3 18 0M3 12h18'/>",
 Forza:"<path d='M6 20V10M12 20V4M18 20v-7'/>",Folla:"<circle cx='9' cy='8' r='3'/><circle cx='17' cy='10' r='2.5'/><path d='M3 20c.8-3.5 3.2-6 6-6s5.2 2.5 6 6M14 20c.4-2.2 1.6-4 3-4s2.6 1.8 3 4'/>",
 Rate:"<path d='M4 20h16M6 16v4M10 12v8M14 9v11M18 5v15'/>",
 Incroci:"<path d='M5 19L19 5'/><path d='M5 9l6 4'/><path d='M13 13l6 5'/>"};
Object.assign(ICON, {Anagrafe: "<rect x='3' y='5' width='18' height='14' rx='2'/><circle cx='9' cy='11' r='2.2'/><path d='M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M15 10h3M15 14h3'/>",
 Classifica: "<path d='M4 6h16M4 12h11M4 18h6'/>", Bilancia: "<path d='M12 3v18M7 21h10M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z'/>",
 Quotazioni: "<path d='M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8z'/>",
 Cercatore: "<circle cx='10' cy='10' r='6'/><path d='M20 20l-5.6-5.6M8 10h4M10 8v4'/>"});
Object.assign(ICON, {Pagellista: "<path d='M9 3h6l1 2h3v16H5V5h3z'/><path d='M9 12l2 2 4-4'/>", 'Anti-inseguimento': "<circle cx='12' cy='12' r='9'/><path d='M5.6 5.6l12.8 12.8'/>",
 'Segugio lento': "<path d='M3 17l6-6 4 4 8-8'/><path d='M14 7h7v7'/>", Esattore: "<circle cx='12' cy='12' r='9'/><path d='M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1 3 2.2c0 2.8-6 1.8-6 4.6 0 1.3 1.3 2.2 3 2.2s3-1.1 3-2.5'/>"});
const BOOK_NAME={A_spec:'Prudente A · chiude a −6%',B_wide:'Prudente B · chiude a −12%',C_spec_4h:'Prudente C · chiude dopo 4 ore',D_wide_noregime:'Prudente D · anche a mercato debole',
 X_aggressive:'Aggressivo',X_aggr_sentinel:'Aggressivo + Sentinel',S_scalp:'Scalping',P_pump:'Pump organici · rialzi veri',E_explore:'Esploratore · token più nuovi e piccoli',W_whale:'Balene · almeno 2 portafogli bravi insieme',W2_balene:'Balene 2.0 · copia chi fa guadagnare chi copia',S2_sopravvissuti:'Sopravvissuti · token maturi che salgono piano',R2_rimbalzo:'Rimbalzo · dopo un crollo, quando i compratori tornano'};
const BOOK_SHORT={A_spec:'Prudente A',B_wide:'Prudente B',C_spec_4h:'Prudente C',D_wide_noregime:'Prudente D',
 X_aggressive:'Aggressivo',X_aggr_sentinel:'Sentinel',S_scalp:'Scalping',P_pump:'Pump',E_explore:'Esploratore',W_whale:'Balene',W2_balene:'Balene 2.0',S2_sopravvissuti:'Sopravvissuti',R2_rimbalzo:'Rimbalzo'};
const ecoLabel = b => { const e = D.sum && D.sum.eco && ecoOf(b), ev = e && D.sum.eco[e]; return ev && ev[1].length === 1 && ev[1][0] === b ? ev[0] : null; };   // v16: nome dalla configurazione del desk quando l'app non ne ha uno suo
const shortBook = b => BOOK_SHORT[b] || (BOOK_NAME[b] || ecoLabel(b) || b).split(' · ')[0];
Object.assign(BOOK_NAME, {M2_day:'Day trading · rotture all’apertura', M3_trend:'Trend · pochi trade lunghi', M4_range:'Rimbalzo · solo mercato a zig-zag', M5_rot:'Rotazione · le più forti contro Bitcoin',
 M6_contra:'Contrarian · contro la folla', M7_dca:'Accumulo · un po’ ogni giorno', M8_astra:'Trend Astra · incroci delle medie giornaliere',
 M9_lento:'Trend lento · 16 monete, solo quando salgono', M10_funding:'Funding · incassa senza scommettere sul prezzo'});
Object.assign(BOOK_SHORT, {M2_day:'Day trading', M3_trend:'Trend', M4_range:'Rimbalzo', M5_rot:'Rotazione', M6_contra:'Contrarian', M7_dca:'Accumulo', M8_astra:'Trend Astra', M9_lento:'Trend lento', M10_funding:'Funding'});
const BOOK_TINY={A_spec:'PrA',B_wide:'PrB',C_spec_4h:'PrC',D_wide_noregime:'PrD',
 X_aggressive:'Agg',X_aggr_sentinel:'Sen',S_scalp:'Scl',P_pump:'Pmp',E_explore:'Esp',W_whale:'Bal',W2_balene:'B2',S2_sopravvissuti:'Sop',R2_rimbalzo:'Rim'};
Object.assign(BOOK_TINY, {M2_day:'Day', M3_trend:'Trd', M4_range:'Rmb', M5_rot:'Rot', M6_contra:'Ctr', M7_dca:'Acc', M8_astra:'Ast', M9_lento:'Len', M10_funding:'Fun', M11_lc:'L/C', M12_fund:'F4', M13_nuove:'Nuo', N2_compratori:'Com', G2_saldo:'Sal', W3_doppie:'B3'});
for (const c of ['BTC','ETH','SOL','BNB','XRP','DOGE','ZEC','HYPE']) {
  BOOK_NAME['SC_' + c] = 'Scalping ' + c; BOOK_SHORT['SC_' + c] = c; BOOK_TINY['SC_' + c] = c.slice(0, 4);
  BOOK_NAME['L_SC_' + c] = 'Lab ' + c + ' · più trade'; BOOK_SHORT['L_SC_' + c] = c + ' +trade'; BOOK_TINY['L_SC_' + c] = c.slice(0, 2) + '+';
  BOOK_NAME['F_SC_' + c] = 'Lab ' + c + ' · solo ordini già piazzati'; BOOK_SHORT['F_SC_' + c] = c + ' limiti'; BOOK_TINY['F_SC_' + c] = c.slice(0, 2) + 'L';
  BOOK_NAME['Z_SC_' + c] = 'Lab ' + c + ' · puntata variabile'; BOOK_SHORT['Z_SC_' + c] = c + ' puntata'; BOOK_TINY['Z_SC_' + c] = c.slice(0, 2) + 'P';
}
Object.assign(BOOK_NAME, {L_M2_day:'Lab Day · solo dopo un restringimento', L_M3_trend:'Lab Trend · stop più largo', L_M4_range:'Lab Rimbalzo · entra solo se prezzo e forza non sono d’accordo',
 L_M5_rot:'Lab Rotazione · solo le 3 più forti', L_M6_contra:'Lab Contrarian · aspetta un cambio di direzione', L_M7_dca:'Lab Accumulo · cifra sempre uguale',
 L_M8_astra_orig:'Lab Astra · regole originali', L_M8_astra_filter:'Lab Astra · solo se c’è un trend', L_M8_astra_pyramid:'Lab Astra · può aggiungere in guadagno'});
Object.assign(BOOK_SHORT, {L_M2_day:'Lab Day', L_M3_trend:'Lab Trend', L_M4_range:'Lab Rimbalzo', L_M5_rot:'Lab Rotaz.', L_M6_contra:'Lab Contr.', L_M7_dca:'Lab Acc.',
 L_M8_astra_orig:'Astra orig.', L_M8_astra_filter:'Astra filtro', L_M8_astra_pyramid:'Astra +add'});
Object.assign(BOOK_TINY, {L_M2_day:'LDy', L_M3_trend:'LTr', L_M4_range:'LRm', L_M5_rot:'LRo', L_M6_contra:'LCo', L_M7_dca:'LAc',
 L_M8_astra_orig:'Ao', L_M8_astra_filter:'Af', L_M8_astra_pyramid:'Ap'});
const tinyBook = b => BOOK_TINY[b] || shortBook(b).replace(/\s+/g, '').slice(0, 3);
const labName = b => {
  if (LAB_SHORT[b]) return '🧪 ' + LAB_SHORT[b];
  const msc = /^(F|Z|L)_SC_([A-Z]+)$/.exec(b);
  if (msc) return '🧪 ' + msc[2] + ({F:' limiti', Z:' puntata', L:' più trade'}[msc[1]]);
  const m8 = /^L_M8_astra_(orig|filter|pyramid)$/.exec(b);
  if (m8) return '🧪 Astra ' + ({orig:'originale', filter:'+ filtro', pyramid:'+ aggiunte'}[m8[1]]);
  const mm = /^LAB(\d+)_/.exec(b);
  if (mm) return '🧪 Lab ' + mm[1];
  const v = bk(b);
  return DESK === 'major' && v && v.lab ? '🧪 ' + shortBook(v.base) : '🧪 ' + b;
};


const ECO={
 prudente:{agents:['Regime','Scout','Filter','Analyst','Executor','Risk','Lab','Logger'],labs:['Lab Segnali','Lab Uscite'],desc:'Entra solo sui token più solidi. A chiude prima, B dà più respiro, D fa lo stesso di B anche quando il mercato è debole.'},
 aggressivo:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:['Lab Segnali','Lab Uscite'],desc:'Stessi controlli di sicurezza, ma entra più spesso e rischia un po’ di più.'},
 sentinel:{agents:['Filter','Analyst','Executor','Sentinel','Risk','Lab'],labs:['Lab Sentinel'],desc:'Come l’Aggressivo, ma vende in anticipo se il prezzo sta crollando.'},
 scalping:{agents:['Filter','Scalp','Executor','Risk','Lab'],labs:['Lab Scalping'],desc:'Entra in pochi minuti su una spinta forte, punta a un piccolo guadagno e chiude in fretta.'},
 pump:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:['Lab Pump'],desc:'Cerca i rialzi veri appena partono, non quelli gonfiati dai bot, e resta dentro al massimo 50 minuti.'},
 esploratore:{agents:['Scout','Filter','Analyst','Executor','Risk'],labs:[],desc:'Prova token più nuovi e più piccoli di quelli degli altri, con puntate leggere, per vedere se ci perdiamo occasioni.'},
 balene:{agents:['Registratore','Cacciatore','Analista','Sentinella','Confluenza','Executor','Risk','Uscite'],labs:[],desc:'Compra solo quando almeno due portafogli bravi entrano insieme sullo stesso token. All’inizio è in prova: segnala, non compra.'},
 copy:{agents:['Hunter','Mirror','Filter','Executor','Sentinel','Risk','Lab'],labs:['Lab Copy'],desc:'Cerca portafogli bravi e copia i loro acquisti, con un piccolo ritardo come succederebbe dal vivo.'},
 m_scalp:{agents:['Flusso','Commissioni','Executor','Risk','Meteo','Calendario','Lab'],labs:['Lab SC_BTC','Lab SC_ETH','Lab SC_SOL','Lab SC_BNB','Lab SC_XRP','Lab SC_DOGE','Lab SC_ZEC','Lab SC_HYPE'],major:1,desc:'Un portafoglio per ogni moneta grande. Gli scalper normali sono in pausa; girano solo le versioni a commissioni basse. Al massimo tre monete nella stessa direzione.'},
 m_day:{agents:['Sessioni','Calendario','Meteo','Executor','Risk','Lab'],labs:['Lab M2_day'],major:1,desc:'Entra se, all’apertura di Londra o New York, il prezzo esce con forza dal range dei primi 30 minuti. Chiude sempre entro sera.'},
 m_trend:{agents:['Segugio','Meteo','Consiglio','Executor','Risk','Lab'],labs:['Lab M3_trend'],major:1,desc:'Fa pochi trade e li tiene a lungo, solo quando il mercato sta davvero salendo o scendendo.'},
 m_range:{agents:['Bande','Meteo','Calendario','Executor','Risk','Lab'],labs:['Lab M4_range'],major:1,desc:'Lavora solo quando il mercato va a zig-zag: compra in basso, vende in alto, e si ferma appena parte un trend.'},
 m_rot:{agents:['Forza','Meteo','Consiglio','Executor','Risk','Lab'],labs:['Lab M5_rot'],major:1,desc:'Tiene le quattro monete più forti rispetto a Bitcoin e le aggiorna spesso. Se il mercato crolla, resta in cassa.'},
 m_contra:{agents:['Folla','Derivati','Consiglio','Executor','Risk','Lab'],labs:['Lab M6_contra'],major:1,desc:'Entra contro la folla quando ha esagerato, per esempio dopo tanti fallimenti improvvisi tutti da una parte. Resta al massimo un giorno.'},
 m_dca:{agents:['Rate','Meteo','Executor','Pagella','Lab'],labs:['Lab M7_dca'],major:1,desc:'Ogni giorno compra un po’ di Bitcoin e Ethereum: di più quando c’è paura, di meno quando tutti sono euforici. Non vende mai.'},
 m_astra:{agents:['Incroci','Executor','Risk','Derivati','Lab'],labs:['Lab M8_astra'],major:1,desc:'Entra una volta al giorno, al rialzo o al ribasso, quando la media a 20 giorni incrocia quella a 50 sulle 20 monete più scambiate. Al massimo due posizioni nella stessa direzione, e una sola tra Bitcoin, Ethereum e Solana perché si muovono insieme.'},
 balene2:{agents:['Registratore','Pagellista','Sentinella','Anti-inseguimento','Filter','Executor','Risk'],labs:[],desc:'Ogni 2 ore il Pagellista sceglie 30 portafogli che negli ultimi giorni hanno fatto guadagnare chi li copiava. Quando uno di loro compra, la copia parte solo se il prezzo non è già salito più del 5% e il token passa i controlli. Esce con regole sue, entro 4 ore. È una prova: deve dimostrarsi su 100 trade.'},
 sopravvissuti:{agents:['Scout','Filter','Analyst','Executor','Risk'],labs:[],desc:'Compra solo token che hanno almeno un giorno, sono liquidi, hanno i possessori sparsi e salgono piano, senza pompaggi. Li tiene fino a un giorno. È una prova: per ora i dati non dicono che funzioni.'},
 rimbalzo:{agents:['Scout','Filter','Analyst','Executor','Risk'],labs:[],desc:'Quando un token sano crolla in un’ora, aspetta il primo segno che i compratori tornano, entra con una puntata piccola ed esce entro un’ora (obiettivo +8%, stop −8%). È una prova con evidenza debole.'},
 m_lento:{agents:['Segugio lento','Executor','Risk'],labs:[],major:1,desc:'Ogni notte guarda 16 monete grandi: tiene solo quelle che salgono da 30 e da 90 giorni e stanno sopra la media, con più soldi su quelle più tranquille. Quando il mercato scende resta in cassa, anche per mesi.'},
 m_funding:{agents:['Esattore','Executor'],labs:[],major:1,desc:'Compra Bitcoin ed Ether e allo stesso tempo li vende sul perpetuo: il prezzo si annulla e resta il funding che si incassa ogni 8 ore. È il rendimento minimo da battere, non una scommessa.'},
 paused:{agents:['Scout','Filter','Analyst','Executor','Risk','Lab'],labs:[],desc:'Niente nuovi ingressi. Le posizioni già aperte seguono le regole di uscita, e si può riaccendere quando vuoi.'}};
const LAB_SHORT={
 LAB4_S_scalp:'Lab 4 · stop più largo',LAB5_X_aggressive:'Lab 5 · più severo sul finto',
 LAB7_X_aggr_sentinel:'Lab 7 · Sentinel',LAB9_X_aggressive:'Lab 9 · vende metà in guadagno',
 LAB10_X_aggr_sentinel:'Lab 10 · vende metà in guadagno',LAB11_B_wide:'Lab 11 · vende metà in guadagno',
 LAB12_D_wide_noregime:'Lab 12 · vende metà in guadagno',LAB13_A_spec:'Lab 13 · vende metà in guadagno',
 LAB14_C_spec_4h:'Lab 14 · vende metà in guadagno',LAB15_P_pump:'Lab 15 · vende metà in guadagno',
 LAB16_E_explore:'Lab 16 · vende metà in guadagno',LAB17_X_aggressive:'Lab 17 · può rientrare una volta',
 LAB19_A_spec:'Lab 19 · stop più largo',LAB20_A_spec:'Lab 20 · stop che si adatta',
 LAB21_B_wide:'Lab 21 · stop che si adatta',LAB22_A_spec:'Lab 22 · esce sul crollo rapido',
 LAB23_B_wide:'Lab 23 · esce sul crollo rapido',LAB24_X_aggressive:'Lab 24 · filtro di mercato',
 LAB25_P_pump:'Lab 25 · filtro di mercato',LAB26_E_explore:'Lab 26 · filtro di mercato',
 LAB27_B_wide:'Lab 27 · puntata variabile',LAB28_X_aggressive:'Lab 28 · puntata variabile',
 LAB29_X_aggressive:'Lab 29 · flusso organico',
 LAB30_A_spec:'Lab 30 · salta i token sospetti',LAB31_B_wide:'Lab 31 · salta i token sospetti',
 LAB32_A_spec:'Lab 32 · esce se i furbi vendono',LAB33_B_wide:'Lab 33 · esce se i furbi vendono',
 LAB36_X_aggressive:'Lab 36 · solo token con più liquidità',LAB37_P_pump:'Lab 37 · solo token con più liquidità',
 LAB38_A_spec:'Lab 38 · solo token con più liquidità',LAB39_B_wide:'Lab 39 · solo token con più liquidità',
 LAB40_S_scalp:'Lab 40 · niente monete già salite'};
const BOOK_DESC={
 A_spec:'Entra solo sui token più solidi e chiude se perde il 6%.',
 B_wide:'Come Prudente A, ma dà più respiro: chiude se perde il 12%.',
 C_spec_4h:'Come Prudente A, ma chiude comunque dopo 4 ore.',
 D_wide_noregime:'Come Prudente B, ma continua anche quando il mercato è debole.',
 X_aggressive:'Entra più spesso, con filtri un po’ più larghi, e rischia di più.',
 X_aggr_sentinel:'Come l’Aggressivo, ma vende in anticipo se il prezzo sta crollando.',
 S_scalp:'Entra in pochi minuti su una spinta forte, punta a +4,5% e chiude entro 20 minuti.',
 P_pump:'Cerca i rialzi veri appena partono e resta dentro al massimo 50 minuti.',
 E_explore:'Prova token più nuovi e più piccoli, con puntate leggere, per vedere se ci perdiamo occasioni.',
 W_whale:'Compra solo se almeno due portafogli bravi entrano insieme. Per ora è in prova e non compra ancora.',
 M2_day:'Entra se, all’apertura di Londra o New York, il prezzo esce con forza dal range dei primi 30 minuti. Chiude sempre entro sera.',
 M3_trend:'Fa pochi trade e li tiene a lungo, solo quando il mercato sta davvero salendo o scendendo.',
 M4_range:'Lavora solo quando il mercato va a zig-zag: compra in basso, vende in alto, e si ferma appena parte un trend.',
 M5_rot:'Tiene le quattro monete più forti rispetto a Bitcoin e le aggiorna spesso. Se il mercato crolla, resta in cassa.',
 M6_contra:'Entra contro la folla quando ha esagerato. Resta al massimo un giorno.',
 M7_dca:'Ogni giorno compra un po’ di Bitcoin e Ethereum: di più quando c’è paura, di meno quando tutti sono euforici. Non vende mai.',
 M8_astra:'Entra una volta al giorno, al rialzo o al ribasso, quando la media a 20 giorni incrocia quella a 50 sulle 20 monete più scambiate. Al massimo due posizioni nella stessa direzione, e una sola tra Bitcoin, Ethereum e Solana perché si muovono insieme.',
 L_M2_day:'Come il Day trading, ma entra solo dopo che il prezzo si è stretto tanto, come se si stesse caricando. Solo prova.',
 L_M3_trend:'Come il Trend, ma lo stop che segue il prezzo è più largo, così lascia correre di più. Solo prova.',
 L_M4_range:'Come il Rimbalzo, ma entra solo se il movimento del prezzo e la forza del mercato non sono d’accordo. Solo prova.',
 L_M5_rot:'Come la Rotazione, ma tiene solo le 3 monete più forti. Solo prova.',
 L_M6_contra:'Come il Contrarian, ma aspetta anche un cambio di direzione sul grafico a 15 minuti. Solo prova.',
 L_M7_dca:'Come l’Accumulo, ma compra sempre la stessa cifra, senza guardare paura o euforia. Solo prova.',
 L_M8_astra_orig:'Le regole originali di Astra, senza il limite su Bitcoin, Ethereum e Solana insieme. Solo prova.',
 L_M8_astra_filter:'Come Trend Astra, ma entra solo se c’è un vero trend. Solo prova.',
 L_M8_astra_pyramid:'Come Trend Astra, ma può aggiungere a una posizione già in guadagno. Solo prova.',
 LAB4_S_scalp:'Come lo Scalping, ma lo stop è un po’ più largo (−4,5%). Solo prova.',
 LAB5_X_aggressive:'Come l’Aggressivo, ma è più severo sul volume finto e sui movimenti sospetti. Solo prova.',
 LAB7_X_aggr_sentinel:'Come Sentinel, ma esce anche se il rialzo a pagamento si ferma. Solo prova.',
 LAB9_X_aggressive:'Come l’Aggressivo, ma vende metà quando guadagna il 50% e sul resto alza lo stop. Solo prova.',
 LAB10_X_aggr_sentinel:'Come Sentinel, ma vende metà quando guadagna il 50% e sul resto alza lo stop. Solo prova.',
 LAB11_B_wide:'Come Prudente B, ma vende metà quando guadagna il 50% e sul resto alza lo stop. Solo prova.',
 LAB12_D_wide_noregime:'Come Prudente D, ma vende metà quando guadagna il 50% e sul resto alza lo stop. Solo prova.',
 LAB13_A_spec:'Come Prudente A, ma vende metà a +40% e sul resto alza lo stop. Solo prova.',
 LAB14_C_spec_4h:'Come Prudente C, ma vende metà a +40% e sul resto alza lo stop. Solo prova.',
 LAB15_P_pump:'Come Pump, ma vende metà a +30% e sul resto lascia lo stop che segue il prezzo. Solo prova.',
 LAB16_E_explore:'Come Esploratore, ma vende metà a +30% e sul resto lascia lo stop che segue il prezzo. Solo prova.',
 LAB17_X_aggressive:'Come l’Aggressivo, ma può rientrare una volta, con metà puntata, solo se il prezzo ha già superato il vecchio massimo. Solo prova.',
 LAB19_A_spec:'Come Prudente A, ma lo stop è più largo (9%) e la puntata più piccola, così la perdita massima in euro resta uguale. Solo prova.',
 LAB20_A_spec:'Come Prudente A, ma lo stop si allarga o si stringe a seconda di quanto è nervoso il token, con la stessa perdita massima in euro. Solo prova.',
 LAB21_B_wide:'Come Prudente B, ma lo stop si allarga o si stringe a seconda di quanto è nervoso il token, con la stessa perdita massima in euro. Solo prova.',
 LAB22_A_spec:'Come Prudente A, ma esce davvero sul crollo rapido (nell’originale questa uscita gira solo in prova). Solo prova.',
 LAB23_B_wide:'Come Prudente B, ma esce davvero sul crollo rapido (nell’originale questa uscita gira solo in prova). Solo prova.',
 LAB24_X_aggressive:'Come l’Aggressivo, ma si ferma quando il mercato è debole, come fanno Prudente A e B. Solo prova.',
 LAB25_P_pump:'Come Pump, ma con il filtro sul mercato debole. È pronto e parte se si toglie la pausa. Solo prova.',
 LAB26_E_explore:'Come Esploratore, ma con il filtro sul mercato debole. È pronto e parte se si toglie la pausa. Solo prova.',
 LAB27_B_wide:'Come Prudente B, ma la puntata sale o scende da sola in base a quanto sta andando bene. Solo prova.',
 LAB28_X_aggressive:'Come l’Aggressivo, ma la puntata sale o scende da sola in base a quanto sta andando bene. Solo prova.',
 LAB29_X_aggressive:'Come l’Aggressivo, ma dà più peso agli acquisti veri e meno al semplice movimento. Solo prova.',
 LAB30_A_spec:'Come l’originale, ma salta il token se dentro c’è chi l’ha creato o un gruppo di wallet collegati. Se c’è un wallet furbo punta un po’ di più. Solo prova.',
 LAB31_B_wide:'Come l’originale, ma salta il token se dentro c’è chi l’ha creato o un gruppo di wallet collegati. Se c’è un wallet furbo punta un po’ di più. Solo prova.',
 LAB32_A_spec:'Come l’originale, ma esce prima dello stop quando i wallet furbi che erano dentro vendono. Solo prova.',
 LAB33_B_wide:'Come l’originale, ma esce prima dello stop quando i wallet furbi che erano dentro vendono. Solo prova.',
 LAB36_X_aggressive:'Come l’originale, ma compra solo token con almeno 50.000 $ di liquidità. Solo prova.',
 LAB37_P_pump:'Come l’originale, ma compra solo token con almeno 50.000 $ di liquidità. Solo prova.',
 LAB38_A_spec:'Come l’originale, ma compra solo token con almeno 50.000 $ di liquidità. Solo prova.',
 LAB39_B_wide:'Come l’originale, ma compra solo token con almeno 50.000 $ di liquidità. Solo prova.',
 LAB40_S_scalp:'Come lo Scalping, ma non compra se la moneta è già salita più del 13% nell’ultima ora. Solo prova.'
};
const EXIT_MJ={flat_eod:'chiusura di fine giornata',meteo_off:'spento dal Meteo',rebalance:'ribilanciamento',weak_rs:'coin indebolita',catastrophe:'stop di sicurezza'};
const EXIT={leader_sell:'wallet copiato ha venduto',whale_sell:'le balene hanno venduto',sentinel_warning:'Sentinel (warning)',sentinel_critical:'Sentinel (critico)',stop_loss:'stop loss',trail_stop:'trailing stop',time_stop:'time stop',take_profit:'take profit',liquidity_collapse:'liquidità crollata'};
Object.assign(EXIT, EXIT_MJ);
const KR={pumped_h1:'Già +80% in 1h',low_liquidity:'Troppo poco scambiato',liq_to_mcap:'Poca liquidità rispetto al valore',unverifiable:'Non verificabile',rugged_flag:'Segnalato rug',mint_authority:'Mint non revocata',
 freeze_authority:'Freeze non revocata',transfer_fee:'Tassa sul trasferimento',lp_not_locked:'LP non bloccata',top10_concentration:'Troppi token in poche mani',dev_holding:'Dev > 3%',dev_past_rugs:'Dev con rug passati',bundle_insiders:'Troppi token già in mano agli insider',fake_volume:'Volume finto (bot)',volume_bot:'Volume finto (bot)',bump_bot:'Volume finto (bot)',tape_quality:'Volume finto (bot)',wash_volume:'Volume finto (bot)'};
const SI={shadow:['in prova','st-sh'],guard:['guardia','st-sh'],promoted:['promosso','st-pr'],rejected:['respinto','st-rj'],expired:'scaduto',confirmed:['confermato','st-pr'],rolled_back:['annullato','st-rj']};
const PAL=['#1fe08a','#5aa9ff','#f6c453','#a78bfa','#ff9b45','#2fe0d2','#ff7ad9','#7dd3fc','#e2c044','#ff6b3d'];

// ---------- state ----------
// two desks share the relay: meme (keys as before) and Cryptus Major (keys prefixed 'mj/'); the switch swaps the active store
const STORES = {meme: {D: {}, TS: {}, eqs: {}, tab: localStorage.getItem('cx_tab') || 'overview', sub: {}, last: 0},
                major: {D: {}, TS: {}, eqs: {}, tab: localStorage.getItem('cx_tab_mj') || 'overview', sub: {}, last: 0}};
let DESK = localStorage.getItem('cx_desk') === 'major' ? 'major' : 'meme';
let D = STORES[DESK].D, TS = STORES[DESK].TS;   // latest payload and its timestamp per message key (active desk)
let eqs = STORES[DESK].eqs;     // book -> [[t,usd],...]
let tab = STORES[DESK].tab, sub = STORES[DESK].sub, charts = {}, seen = new Set(), firstFeed = true;
const tabKey = () => DESK === 'major' ? 'cx_tab_mj' : 'cx_tab';
function inStore(name, fn) {    // run fn with D/TS/eqs pointing at another desk's store
  const sv = [D, TS, eqs]; const st = STORES[name]; D = st.D; TS = st.TS; eqs = st.eqs;
  try { fn(); } finally { [D, TS, eqs] = sv; }
}
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
const px = x => { if (x == null || isNaN(x)) return '–'; const n = Number(x), a = Math.abs(n);
  return a >= 1000 ? f(n, 0) : a >= 100 ? f(n, 1) : a >= 1 ? f(n, 2) : n.toPrecision(4).replace('.', ','); };
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
  const desk = m.k.startsWith('mj/') ? 'major' : 'meme', key = desk === 'major' ? m.k.slice(3) : m.k;
  inStore(desk, () => {
    if (key === 'snap') { for (const [k, v] of Object.entries(m.d)) apply(k, m.ts, v); }
    else if (key === 'eqs') { for (const [b, s] of Object.entries(m.d)) apply('eq/' + b, m.ts, {s}); }
    else apply(key, m.ts, m.d);
  });
  STORES[desk].last = Math.max(STORES[desk].last || 0, m.ts);
  lastMsgAt = STORES[DESK].last || 0;
  if (desk !== DESK) { paintSwitch(); return; }
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
    + (DESK === 'major' ? (rg ? ` · Meteo: <span class="${rg[1] === 'trend_up' ? 'pos' : rg[1] === 'range' ? 'neu' : 'neg'}">${esc(rg[2] || 'in calcolo')}</span>${rg[4] != null ? ' · Paura&amp;Avidità ' + rg[4] : ''}` : '')
      : (rg ? ` · <span class="${rg[0] ? 'pos' : 'neu'}">${rg[0] ? 'mercato ok' : 'pausa mercato'}</span>` : ''));
}
setInterval(setLive, 5000);

// ---------- derived ----------
function books() { return D.sum ? Object.keys(D.sum.b) : []; }
const HIDDEN_DUP = /(?:LAB\d+_)?(?:X_aggr_sentinel|C_spec_4h)/;
function hiddenBook(b) {
  if (b && /^(?:LAB\d+_)?(?:X_aggr_sentinel|C_spec_4h)$/.test(b)) return true;
  const v = bk(b);
  if (!v) return false;
  if (v.duplicate_of) return true;
  if (v.retired && v.lab) return true;      // gemelli Lab di portafogli ritirati: spariscono
  if (v.base && (/^(?:LAB\d+_)?(?:X_aggr_sentinel|C_spec_4h)$/.test(v.base) || v.base !== b && (bk(v.base) || {}).duplicate_of)) return true;
  return false;
}
function mentionsHiddenBook(s) { return HIDDEN_DUP.test(s || ''); }
function visibleBooks() { return books().filter(b => !hiddenBook(b)); }
function hiddenEco(k) {
  const ev = D.sum && D.sum.eco && D.sum.eco[k];
  if (!ev) return false;
  const mains = ev[1].filter(b => D.sum.b[b] && bk(b) && !bk(b).lab);
  return mains.length > 0 && mains.every(b => hiddenBook(b) || bk(b).retired);
}
function bookDesc(b) {
  if (BOOK_DESC[b]) return BOOK_DESC[b];
  const msc = /^(F|Z|L)?_?SC_([A-Z]+)$/.exec(b) || /^(F|Z|L)_SC_([A-Z]+)$/.exec(b);
  if (/^SC_[A-Z]+$/.test(b)) return 'Scalping su ' + b.slice(3) + ': entra e esce in pochi minuti, solo se il possibile guadagno vale almeno due volte e mezza le spese.';
  if (/^L_SC_[A-Z]+$/.test(b)) return 'Come lo scalping di ' + b.slice(5) + ', ma entra più spesso. Solo prova.';
  if (/^F_SC_[A-Z]+$/.test(b)) return 'Come lo scalping di ' + b.slice(5) + ', ma entra e prende il profitto solo con ordini già piazzati, così paga meno spese. Solo prova.';
  if (/^Z_SC_[A-Z]+$/.test(b)) return 'Come lo scalping di ' + b.slice(5) + ', ma la puntata sale o scende da sola in base a quanto sta andando bene. Solo prova.';
  const v = bk(b);
  if (v && v.lab) {
    const lab = String(v.lab).replace(/^shadow:\s*/i, '');
    return 'Prova in parallelo: ' + lab + '. Non conta nel totale.';
  }
  const e = ecoOf(b);
  return (ECO[e] && ECO[e].desc) || ((D.sum.eco[e] || [])[2]) || 'Portafoglio di prova, con i dati dal vivo.';
}
function bk(b) {
  const v = D.sum && D.sum.b && D.sum.b[b];
  if (!v) return null;
  const fl = v[11] || {};
  const pausedMap = D.sum.paused || {};
  const exclMap = D.sum.excl || {};
  return {eq: v[0], pct: v[1], w: v[2], l: v[3], closed: v[4], wr: v[5], dd: v[6], mult: v[7], lab: v[8], base: v[9], ov: v[10] || [0, null, null],
    paused: !!(fl.paused || (b in pausedMap)), paused_reason: fl.paused_reason || pausedMap[b] || null,
    duplicate_of: fl.duplicate_of || (!fl.retired && typeof exclMap[b] === 'string' && /^duplicato/.test(exclMap[b]) ? exclMap[b] : null),
    exclude_from_totals: !!(fl.exclude_from_totals || (b in exclMap)),
    off: fl.off || null, retired: fl.retired || null, observation: fl.observation || null, vsBtc: v[12] ?? null, gross: v[13] ?? null, fees: v[14] ?? null, t1h: v[15] ?? null};
}
function liveAgents(list) {
  const ag = D.ag2 || D.ag || {};
  return list.filter(k => (ag[k] || pgAgent(k)) && !(k === 'Sentinel' && hiddenEco('sentinel')));   // v14: anche chi non scrive nel feed ma ha una pagella (Bilancia)
}
function liveLabs() { return [...new Set(Object.keys(D.sum.eco || {}).filter(e => !hiddenEco(e)).flatMap(e => (ECO[e] && ECO[e].labs) || []))]; }
function ecoOf(b) { const v = bk(b); const base = (v && v.base) || b; for (const [k, e] of Object.entries(D.sum.eco || {})) if (e[1].includes(base)) return k; return null; }
function booksOf(e) { if (e === 'paused') return pausedBooks(); return visibleBooks().filter(b => ecoOf(b) === e && !bk(b).paused); }
function mainBooks() { return visibleBooks().filter(b => bk(b) && !bk(b).lab && !bk(b).retired); }
function retiredBooks() { return visibleBooks().filter(b => bk(b) && !bk(b).lab && bk(b).retired); }
function histBooks() { return visibleBooks().filter(b => bk(b) && !bk(b).lab); }
function pausedBooks() { return mainBooks().filter(b => bk(b).paused); }
function activeBooks() { return mainBooks().filter(b => !bk(b).paused); }
function includedBooks() { return mainBooks().filter(b => !bk(b).exclude_from_totals); }
function ecoLiveBooks(k) {
  const mains = visibleBooks().filter(b => ecoOf(b) === k && !bk(b).lab && !bk(b).paused);
  if (mains.length) return mains;
  return visibleBooks().filter(b => ecoOf(b) === k && bk(b).lab && !bk(b).paused);
}
function ecoPaused(k) {
  const ev = D.sum && D.sum.eco && D.sum.eco[k];
  const mains = (ev && ev[1] || []).filter(b => D.sum.b[b] && bk(b) && !bk(b).lab && !hiddenBook(b) && !bk(b).retired);
  if (!(mains.length > 0 && mains.every(b => bk(b).paused))) return false;
  // Major scalping: originals paused, low-fee twins still run — keep the group visible
  return !(k === 'm_scalp' && ecoLiveBooks(k).length);
}
function deskTotals() {
  const t = D.sum && D.sum.tot, s0 = D.sum.s0;
  if (t && t.length >= 3 && t[2]) return {eq: t[0], pct: t[1], n: t[2], start: t[3] != null ? t[3] : s0 * t[2]};
  const bs = includedBooks(), eq = bs.reduce((a, b) => a + bk(b).eq, 0), start = s0 * bs.length;
  return {eq, start, n: bs.length, pct: start ? (eq / start - 1) * 100 : 0};
}
function pauseReason() {
  const rs = pausedBooks().map(b => bk(b).paused_reason).filter(Boolean);
  return rs[0] || 'pausa';
}
function positions() { return (D.pos && D.pos.p || []).map(p => ({book: p[0], sym: p[1], ets: p[2], ref: p[3], fill: p[4], cost: p[5], stop: p[6], cur: p[7], peak: p[8], score: p[9],
  side: p[10] || 'long', value: p[11] ?? null, lots: p[12] || 1, tp: p[13] ?? null})); }
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
function dupEco(k) {        // ecosistema nascosto perché doppione (non perché ritirato): le sue righe di feed spariscono
  const ev = D.sum && D.sum.eco && D.sum.eco[k]; if (!ev) return false;
  const mains = ev[1].filter(b => D.sum.b[b] && bk(b) && !bk(b).lab);
  return mains.length > 0 && mains.every(hiddenBook);
}
function feedLines(e) {
  const f = D.f2 && D.f2.f ? D.f2.f : ((D.feed && D.feed.f) || []).map(oldToNew);
  const vis = x => !x[7] || !x[7].length || x[7].some(eco => !dupEco(eco));
  const clean = x => !hiddenBook(x[5]) && !mentionsHiddenBook(x[4]) && !(x[7] || []).every(dupEco);
  return (e ? f.filter(x => !x[7] || x[7].includes(e)) : f).filter(vis).filter(clean).slice(0, e ? 40 : 60);
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
function heroCard(k, label, eqUsd, pnlUsd, pct, w, l, extra, foot) {
  const mult = eqUsd / (pnlUsd != null ? eqUsd - pnlUsd : eqUsd);
  // the big number is filled (and tweened) after patching, so tiny equity moves don't rebuild the card
  return [k, `<div class="card hero"><div class=lbl>${label}</div><div class=eq data-n="${eqUsd}">${E(prevVal[k] ?? eqUsd)}</div>
  <div class=pnl><span class="pv ${cls(pnlUsd)}">${sg(pnlUsd)}${E(pnlUsd)}</span><span class="pc ${cls(pnlUsd)}">${sg(pct)}${f(pct)}%</span><span class="badge${mult < 1 ? ' neg' : Math.abs(mult - 1) < 1e-9 ? ' neu' : ''}">${f(mult, 3)}x</span><span class=pnll>Risultato da inizio</span></div>
  <div class=stats>${[['V / P', `<span class=pos>${w}</span> / <span class=neg>${l}</span>`]].concat(extra).map(([k2, v]) => `<div class=st><div class=k>${k2}</div><div class=v>${v}</div></div>`).join('')}</div>${foot || ''}</div>`];
}
const chartCard = id => [id, `<div class="card chartcard"><div class=chartw><canvas id=${id}></canvas></div></div>`];
const lastAg = {};
// ---------- v12: Giudice e pagelle (pagelle.json via chiave pg, solo canale MQTT del Meme) ----------
const PG = () => STORES.meme.D.pg || {};
const LV = {'niente da dire': ['ancora presto', 'n'], 'indizio': ['indizio', 'a'], 'dimostrato su carta': ['dimostrato su carta', 'g'], 'peggio di zero': ['peggio di zero', 'r']};
const VT = {buono: ['buono', 'g'], neutro: ['neutro', 'n'], 'da guardare': ['da guardare', 'a'], 'n.d.': ['ancora senza voto', 'n']};
function pgBook(b) { return ((PG().strategie || {})[b]) || null; }
function pgAgent(a) { return (((PG().agenti || {})[DESK] || {})[a]) || null; }
function tesCard(k) {
  const t = (((PG().agenti || {}).meme || {}).Tesoriere); if (!t) return null;
  const ex = Object.entries(t.esposizione || {}).slice(0, 6), mx = Math.max(1, ...ex.map(e => Math.abs(e[1])));
  const vv = VT[t.voto] || [t.voto, 'n'];
  const rows = ex.map(([a, v]) => `<div class=tesr><span>${esc(a)}</span><i class=${v >= 0 ? 'pos' : 'neg'} style="width:${Math.round(Math.abs(v) / mx * 100)}%"></i><b class=${v >= 0 ? 'pos' : 'neg'}>${v >= 0 ? 'compra' : 'vende'} ${E(Math.abs(v), 0)}</b></div>`).join('');
  return [k, `<div class="card tescard"><h3>Tesoriere<span class=cnt>i due desk insieme</span></h3><div class=pgl style="margin:0 0 10px"><span class="pi ${vv[1]}">${esc(vv[0])}</span><span>${esc(t.frase || '')}</span></div>${rows || '<div class=empty>Nessuna posizione aperta.</div>'}</div>`];
}
function judgeLine(b) {
  const j = pgBook(b); if (!j) return '';
  const [t, c] = LV[j.livello] || [j.livello, 'n'];
  return `<div class=judge><span class="pi ${c}">Giudice · ${esc(t)}</span><span>${esc((j.frase || '').replace(/^(Meme|Major) · [^:]+: /, ''))}</span></div>`;
}
function agentsCard(k, list, title) {
  const ag = D.ag2 || {}, old = D.ag || {};
  const rows = list.map(a => {
    const [nm, c, role] = A[a] || [a, '#ccc', '']; const x = ag[a];
    const fresh = x && lastAg[a] != null && lastAg[a] !== x[0];
    if (x) lastAg[a] = x[0];
    const kc = x ? (KIND[x[1]] || KIND.info)[1] : '#5b636e';
    const msg = x && x[2] && !mentionsHiddenBook(x[2]) ? x[2] : (old[a] && old[a][1] && !mentionsHiddenBook(old[a][1]) ? old[a][1] : '');
    const body = msg && x && x[2] && !mentionsHiddenBook(x[2]) ? `${logo(x[3])}<span class=tx>${esc(x[2].replace(BIDI, ''))}</span>${pills(x[4], 2)}${rt(x[0])}`
      : msg ? `<span class=tx>${esc(msg)}</span>${rt((old[a] || [])[0])}` : `<span class="tx mut">${pgAgent(a) ? 'lavora in silenzio: vedi la pagella' : 'nessuna azione ancora'}</span>`;
    const pv = pgAgent(a), vv = pv && (VT[pv.voto] || [pv.voto, 'n']);
    const pgl = pv ? `<div class=pgl><span class="pi ${vv[1]}">pagella · ${esc(vv[0])}</span><span>${esc(pv.frase || '')}</span></div>` : '';
    return `<div class="arow${fresh ? ' flash' : ''}" style="--kc:${kc}" title="${esc((role || nm) + (x && x[5] ? ' · ' + x[5] : ''))}"><span class=ic style="background:${c}1a;color:${c}">${svg(a)}</span><div class=pl><div class=pt><b>${esc(nm)}</b>${role ? `<small>${esc(role)}</small>` : ''}</div><div class=abody>${body}</div>${pgl}</div></div>`;
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
    const r = p.cur ? (p.side === 'short' ? (1 - p.cur / p.fill) : (p.cur / p.fill - 1)) * 100 : null, val = p.value != null ? p.value : (r == null ? null : p.cost * (1 + r / 100));
    const id = p.book + '|' + p.sym, pr = lastPos[id]; lastPos[id] = r;
    const fl = pr != null && r != null && Math.abs(r - pr) >= 0.05 ? (r > pr ? ' up' : ' dn') : '';
    return `<div class="prow${fl}">${logo(p.sym)}<div class=pl><div class=pt><b>${esc((p.sym || '').replace(BIDI, ''))}</b><small>${p.side === 'short' ? '<span class="pi o">short</span> ' : ''}${showBook ? esc(bk(p.book) && bk(p.book).lab ? labName(p.book) : (BOOK_NAME[p.book] || p.book).split(' · ')[0]) + ' · ' : ''}${p.lots > 1 ? p.lots + ' rate · ' : ''}${rt(p.ets)}</small></div>
      <div class=pm>${px(p.ref)} → ${px(p.cur)}${p.stop != null ? ' · stop ' + px(p.stop) : ''}${p.tp != null ? ' · obiettivo ' + px(p.tp) : ''}</div></div>
      <div class=pr><span class="pp ${cls(r)}">${r == null ? '–' : sg(r) + f(r, 1) + '%'}</span><small>${E(p.cost)}${val == null ? '' : ' → ' + E(val)}</small></div></div>`; }).join('');
  return [k, `<div class=card><h3>Posizioni aperte<span class=cnt>${ps.length ? ps.length + (ps.length === 1 ? ' aperta' : ' aperte') + (DESK === 'major' ? ' · prezzi live' : ' · prezzi ogni 2 s') : ''}</span></h3>${ps.length ? rows : '<div class=empty>Nessuna posizione aperta in questo momento.</div>'}</div>`];
}
function tradesCard(k, bs) {
  const tr = (D.tr && D.tr.t || []).filter(t => !hiddenBook(t[0]) && (!bs || bs.includes(t[0]))).slice(0, 15);
  const inner = tr.length ? tr.map(t => { const kk = t[3] >= 0 ? 'tp' : (/stop/.test(t[5]) ? 'stop' : 'sell');
    return `<div class=trow style="--kc:${KIND[kk][1]}">${logo(t[1])}<div class=pl><div class=pt><b>${esc((t[1] || '').replace(BIDI, ''))}</b><small>${esc(EXIT[t[5]] || t[5])}${bs && bs.length === 1 ? '' : ' · ' + esc((BOOK_NAME[t[0]] || t[0]).split(' · ')[0])}</small></div><div class=pm>${dt(t[2])}</div></div>
      <div class=pr><span class="pp ${cls(t[3])}">${sg(t[4])}${f(t[4], 1)}%</span><small class=${cls(t[3])}>${sg(t[3])}${E(t[3])}</small></div></div>`; }).join('')
    : '<div class=empty>Nessun trade chiuso finora.</div>';
  return [k, `<div class=card><h3>Ultimi trade chiusi</h3><div class="scroll5 trlist">${inner}</div></div>`, {after: afterScroll('.trow'), feed: el => patchList(el, '.trow', inner, 'Ultimi trade chiusi')}];
}
function labCard(k, labs, bs) {
  const L = D.lab || {}; const m = L.m || {};
  const rows = labs.map(l => { const x = m[l]; return `<div class=labrow><span class=ln2>${esc(l)}</span><span class=lm>${x ? esc(x[1].replace(/^\[[^\]]+\]\s*/, '')) + `<span class=ts>${dt(x[0])}</span>` : '<span class=ts>in attesa di dati sufficienti</span>'}</span></div>`; }).join('');
  const ex = (L.ex || []).filter(e => !hiddenBook(e[1]) && !hiddenBook(e[3]) && (!bs || bs.includes(e[1]) || bs.includes(e[3])));
  const et = ex.length ? '<table style="margin-top:8px"><tr><th>Prova</th><th>Portafoglio</th><th>Stato</th></tr>' + ex.map(e => { const s = SI[e[2]]; const [t, c] = Array.isArray(s) ? s : [s || e[2], ''];
    const labTxt = BOOK_DESC[e[3]] || BOOK_DESC[e[1]] || e[0];
    return `<tr><td>${esc(labTxt)}</td><td>${esc(shortBook(e[1]) || e[1])}</td><td class="${c}">${esc(t)}</td></tr>`; }).join('') + '</table>' : '';
  return [k, `<div class=card><h3>Lab<span class=cnt>${ex.length ? ex.length + ' esperimenti' : ''}</span></h3>${rows}${et}</div>`];
}
function killsCard(k) {
  const kr = Object.entries((D.lab && D.lab.kr) || {}); const mx = Math.max(1, ...kr.map(x => x[1]));
  return [k, `<div class=card><h3>Token lasciati stare</h3>${kr.length ? '<table><tr><th>Regola</th><th>Token</th></tr>' + kr.map(([r, n]) =>
    `<tr><td>${esc(KR[r] || r)}<div style="height:4px;border-radius:3px;margin-top:5px;width:${n / mx * 100}%;background:linear-gradient(90deg,#ff4d64,rgba(255,77,100,.3))"></div></td><td>${n}</td></tr>`).join('') + '</table>' : '<div class=empty>Ancora nessun token scartato.</div>'}</div>`];
}
function overshootNote(k, B) {
  const [n, avg, worst] = B.ov; if (!n) return null;
  return [k, `<div class=card><h3>Quanto usciamo giusti<span class=cnt>${n} uscite su stop o obiettivo</span></h3><div class=sub style="margin:0">
    <span class=${cls(Math.round(avg * 10))}>${sg(avg)}${f(avg, 1)} punti</span><span class=neu style="font-weight:500;font-size:12.5px">in media rispetto alla soglia · peggiore ${sg(worst)}${f(worst, 1)}</span></div>
    <div class=desc style="margin:6px 0 0">Quanto siamo usciti oltre lo stop o l’obiettivo: più è vicino a zero, meglio è.</div></div>`];
}
function allAgents() { return [...new Set(Object.keys(A).concat(Object.keys(D.ag2 || D.ag || {})))]; }
function afterHero(k) { const el = document.querySelector(`[data-k="${k}"] .eq`); if (el) tween(el, k, +el.dataset.n, v => E(v)); }

// ---------- Cryptus Major cards ----------
const REG = {trend_up: ['trend in salita', 'pos'], trend_down: ['trend in discesa', 'neg'], range: ['laterale', 'neu'], panic: ['panico', 'neg']};
const usdK = v => v == null ? '–' : '$' + (v >= 1e6 ? f(v / 1e6, 1) + 'M' : f(v / 1e3, 0) + 'k');
function majorCard(k) {
  const x = D.mx; if (!x) return null;
  const m = x.meteo || {}, d = x.der || {}, r = REG[m.label] || [m.lbl || 'in calcolo', 'neu'];
  const cal = ((x.cal && x.cal.next) || []).slice(0, 3).map(e => `<div class=mxr><span>${esc(dt(e[0]))}</span><b>${esc(e[1])}</b></div>`).join('') || '<div class=empty>Nessun evento nei prossimi giorni.</div>';
  const al = x.alloc, lbl = {M1_scalp: 'Scalping', M2_day: 'Day', M3_trend: 'Trend', M4_range: 'Rimbalzo', M5_rot: 'Rotazione', M6_contra: 'Contrarian', M7_dca: 'Accumulo', M8_astra: 'Trend Astra'};
  const famGone = b => b === 'M1_scalp' ? !!(bk('SC_BTC') && bk('SC_BTC').retired) : !!(bk(b) && bk(b).retired);
  const alloc = al && al.w ? Object.entries(al.w).filter(([b]) => !famGone(b)).sort((a, b) => b[1] - a[1]).map(([b, w]) => `<span class=mxw><i style="width:${Math.round(w * 100 / 0.3 * 100) / 100}%"></i>${esc(lbl[b] || b)} ${f(w * 100, 0)}%</span>`).join('') : '<div class=empty>In calcolo.</div>';
  const mains = mainBooks(), beat = mains.filter(b => bk(b).vsBtc != null && bk(b).vsBtc > 0).length;
  const v = (x.votes || []).find(v => !(bk(v[1]) && bk(v[1]).retired));
  const vote = v ? `<div class=mxr><span>${esc(dt(v[0]))} · ${esc(shortBook(v[1]))} ${esc((v[2] || '').replace('USDT', ''))} ${esc(v[3])}</span><b class=${v[4] ? 'pos' : 'neg'}>${v[4] ? 'approvato' : 'bocciato'}</b></div>` : '<div class=empty>Nessuna votazione ancora: si vota sui trade grossi e su ogni ingresso di Trend, Rotazione, Contrarian e Trend Astra.</div>';
  const fr = d.btc_funding == null ? '–' : f(d.btc_funding * 100, 4) + '%';
  return [k, `<div class="card mxcard"><h3>Sala macchine<span class=cnt>agenti comuni</span></h3>
    <div class=mxgrid>
      <div class=mxb><div class=k>Meteo</div><div class="v ${r[1]}">${esc(r[0])}</div><small>BTC 24h ${sg(m.ch24)}${f(m.ch24, 1)}% · vol. ${m.vol_pctile ?? '–'}° pct</small></div>
      <div class=mxb><div class=k>Paura &amp; Avidità</div><div class=v>${m.fg ?? '–'}</div><small>${esc(m.fg_lbl || '')} · dominance BTC ${m.dom != null ? f(m.dom, 1) + '%' : '–'}</small></div>
      <div class=mxb><div class=k>Derivati</div><div class=v>${fr}</div><small>funding BTC · liquidazioni 1h ${usdK(d.liq_long_1h)} long / ${usdK(d.liq_short_1h)} short</small></div>
      <div class=mxb><div class=k>Pagella</div><div class="v ${beat ? 'pos' : 'neu'}">${beat}/${mains.length}</div><small>battono BTC fermo (${x.bh == null ? '–' : sg(x.bh) + f(x.bh, 2) + '%'})</small></div>
    </div>
    <div class=mxs><div class=k>Calendario notizie <small>(niente ingressi da 30 minuti prima a un’ora dopo)</small></div>${cal}</div>
    <div class=mxs><div class=k>Allocatore <small>per ora solo propone, non sposta i soldi</small></div><div class=mxws>${alloc}</div></div>
    <div class=mxs><div class=k>Consiglio <small>ultima votazione</small></div>${vote}</div></div>`];
}
function pagellaCard(k, b, B) {
  if (B.vsBtc == null && B.gross == null) return null;
  const net = B.eq - D.sum.s0;
  return [k, `<div class=card><h3>Pagella<span class=cnt>confronto con Bitcoin tenuto fermo</span></h3><div class=stats>
    <div class=st><div class=k>vs BTC</div><div class="v ${shownCls(B.vsBtc, 1)}">${B.vsBtc == null ? '–' : sg(B.vsBtc) + f(B.vsBtc, 1) + ' pt'}</div></div>
    <div class=st><div class=k>Lordo</div><div class="v ${shownCls(B.gross || 0, 2)}">${sg(B.gross)}${E(B.gross || 0)}</div></div>
    <div class=st><div class=k>Commissioni</div><div class="v neg">${E(-(B.fees || 0))}</div></div>
    <div class=st><div class=k>Netto</div><div class="v ${shownCls(net, 2)}">${sg(net)}${E(net)}</div></div></div>
    <div class=desc style="margin:8px 0 0">Lordo è il risultato dei prezzi, prima delle spese. Netto è quello che resta davvero, posizioni aperte comprese.</div></div>`];
}
function scalpCard(k) {
  const sc = (D.mx && D.mx.sc) || {}; const rows = Object.entries(sc);
  if (!rows.length) return null;
  const tot = rows.reduce((a, [, v]) => [a[0] + (v[0] || 0), a[1] + (v[1] || 0), a[2] + (v[2] || 0), a[3] + (v[3] || 0)], [0, 0, 0, 0]);
  const tr = rows.map(([b, v]) => { const dg = v[5] || {};
    return `<tr><td><b>${esc(shortBook(b))}</b>${v[6] ? `<div class=mut style="font-size:10.5px">${esc(v[6])}</div>` : ''}</td><td>${v[0]}<small class=mut> · ${v[4] || 0}/h</small></td><td class=${shownCls(v[1], 2)}>${E(v[1] || 0)}</td><td class=neg>${E(-(v[2] || 0))}</td><td class=${shownCls(v[3], 2)}>${E(v[3] || 0)}</td><td class=mut>${dg.exp_move != null ? f(dg.exp_move, 2) + '/' + f(dg.cost_mom, 2) : '–'}</td></tr>`; }).join('');
  return [k, `<div class=card><h3>Scalping per coin<span class=cnt>lordo vs commissioni</span></h3>
    <table class=sctab><tr><th>Coin</th><th>Trade</th><th>Lordo</th><th>Comm.</th><th>Netto</th><th>Mov./costi %</th></tr>${tr}
    <tr class=tot><td>Totale</td><td>${tot[0]}</td><td class=${shownCls(tot[1], 2)}>${E(tot[1])}</td><td class=neg>${E(-tot[2])}</td><td class=${shownCls(tot[3], 2)}>${E(tot[3])}</td><td></td></tr></table>
    <div class=desc style="margin:8px 0 0">Si entra solo se il movimento atteso nei prossimi 10 minuti vale almeno due volte e mezza le spese (commissioni e scarto di prezzo).</div></div>`];
}
function paintSwitch() {
  const el = $('deskswitch'); if (!el) return;
  el.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.d === DESK);
    const st = STORES[b.dataset.d], t = st.D.sum && st.D.sum.tot, sp = b.querySelector('.dsp');
    if (sp) { if (t) { sp.textContent = sg(t[1]) + f(t[1], 1) + '%'; sp.className = 'dsp ' + shownCls(t[1], 1); } else { sp.textContent = ''; sp.className = 'dsp'; } }
  });
  el.dataset.d = DESK;
}
function switchDesk(d) {
  if (d === DESK || !STORES[d]) return;
  STORES[DESK].tab = tab; STORES[DESK].sub = sub;
  DESK = d; localStorage.setItem('cx_desk', d);
  const st = STORES[d]; D = st.D; TS = st.TS; eqs = st.eqs; tab = st.tab || 'overview'; sub = st.sub;
  lastMsgAt = st.last || 0;
  Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} }); charts = {};
  for (const x in prevVal) delete prevVal[x];
  $('perf').innerHTML = ''; $('perf').hidden = true; $('tabs').innerHTML = ''; $('deskline').innerHTML = '';
  $('view').innerHTML = D.sum ? '' : `<div class="card notice"><b>In attesa dei dati di ${d === 'major' ? 'Cryptus Major' : 'Cryptus Meme'}…</b>La connessione è aperta: i dati arrivano al prossimo aggiornamento (pochi secondi).</div>`;
  haptic(); paintSwitch(); render(); setLive(); window.scrollTo({top: 0});
}

// ---------- views ----------
function ecoRow(k, e, bs, s0, ps, extra) {
  if (!bs.length) return '';
  const eq = bs.reduce((a, b) => a + bk(b).eq, 0), st = s0 * bs.length, p = (eq / st - 1) * 100;
  const ww = bs.reduce((a, b) => a + bk(b).w, 0), ll = bs.reduce((a, b) => a + bk(b).l, 0), op = ps.filter(x => bs.includes(x.book)).length;
  const dup = bs.some(b => bk(b).exclude_from_totals && !bk(b).observation), obs = bs.length === 1 && bk(bs[0]).observation;
  const jb = bs.length === 1 && pgBook(bs[0]), jl = jb ? ' · Giudice: ' + (LV[jb.livello] || [jb.livello])[0] : '';
  const note = extra || (dup ? 'duplicato, escluso dal totale' : (obs ? 'in osservazione, fuori dal totale · ' : '') + (bs.length > 1 ? bs.length + ' portafogli · ' : '') + `V/P ${ww}/${ll} · ${op} aperte` + jl);
  return `<div class="eco${extra && /^in pausa/.test(extra) ? ' paused' : ''}${dup ? ' dup' : ''}" data-t="${k}"><div class=en><b>${esc(e[0])}</b><small>${esc(note)}</small></div>${spark(totalSeries(bs), eq >= st)}<div class=ev>${E(eq, 0)}<small class=${cls(p)}>${sg(p)}${f(p)}%</small></div></div>`;
}
function histLine() {
  const hb = histBooks(); if (!hb.length || !retiredBooks().length) return '';
  const s0 = D.sum.s0, eq = hb.reduce((a, b) => a + bk(b).eq, 0), st = s0 * hb.length, p = (eq / st - 1) * 100;
  return `<button type=button class=histline data-t=retired><span>Conto storico, anche i ritirati</span><b>${E(eq, 0)} <small>su ${E(st, 0)}</small> <span class=${cls(p)}>${sg(p)}${f(p, 1)}%</span></b></button>`;
}
function bindHist(el) { el.querySelectorAll('.histline').forEach(x => x.onclick = () => setTab('retired')); }
function rebuildCard(k) {
  const r = retiredBooks();
  return [k, `<div class="card rebuild"><div class=lbl>Desk in ricostruzione</div><h2>Nessuna strategia attiva, per scelta</h2>
  <div class=desc>Il 20/11 abbiamo ritirato tutte le strategie Meme: il voto d’ingresso sceglieva token che poi crollavano e il modo di misurare i risultati era sbagliato. Il desk intanto continua a raccogliere dati.</div>
  <ol class=steps><li class=done><b>Pulizia</b><span>${r.length} portafogli ritirati, storico conservato</span></li>
  <li class=now><b>Metro onesto</b><span>prezzi di ingresso e uscita dalla stessa fonte, registro delle decisioni</span></li>
  <li><b>Balene 2.0</b><span>copia i portafogli che fanno guadagnare chi li copia</span></li>
  <li><b>Sopravvissuti</b><span>token maturi e liquidi, dichiarata senza prove a favore</span></li></ol>${histLine()}</div>`, {after: bindHist}];
}
function retiredCard(k) {
  const r = retiredBooks(); if (!r.length) return null;
  const s0 = D.sum.s0, eq = r.reduce((a, b) => a + bk(b).eq, 0), st = s0 * r.length, p = (eq / st - 1) * 100;
  return [k, `<div class="card retcard" data-t=retired><h3>Ritirati<span class=cnt>${r.length} portafogli · tocca per aprire</span></h3>
  <div class=retsum><span>Risultato finale messo insieme</span><b>${E(eq, 0)} <span class=${cls(p)}>${sg(p)}${f(p, 1)}%</span></b></div></div>`, {after: el => el.onclick = () => setTab('retired')}];
}
function renderRetired() {
  const r = retiredBooks(), s0 = D.sum.s0, groups = {};
  for (const b of r) { const why = (bk(b).paused_reason || 'ritirato').replace(/^ritirato \d+\/\d+:\s*/, ''); (groups[why] = groups[why] || []).push(b); }
  const eq = r.reduce((a, b) => a + bk(b).eq, 0), st = s0 * r.length, p = st ? (eq / st - 1) * 100 : 0;
  const cards = Object.entries(groups).map(([why, bs], i) => {
    const rows = bs.sort((a, c) => bk(c).pct - bk(a).pct).map(b => { const B = bk(b);
      return `<div class=retrow><div class=en><b>${esc(shortBook(b))}</b><small>${B.closed} trade · ${B.wr == null ? '–' : f(B.wr, 0) + '% vinti'}</small></div>${spark(eqs[b] || [], B.eq >= s0)}<div class=ev>${E(B.eq, 0)}<small class=${cls(B.pct)}>${sg(B.pct)}${f(B.pct, 1)}%</small></div></div>`; }).join('');
    const ge = bs.reduce((a, b) => a + bk(b).eq, 0), gp = (ge / (s0 * bs.length) - 1) * 100;
    return ['ret_' + i, `<div class="card retgroup"><h3>${esc(why.charAt(0).toUpperCase() + why.slice(1))}<span class=cnt>${bs.length} · ${sg(gp)}${f(gp, 1)}%</span></h3>${rows}</div>`];
  });
  patch([['ret_head', `<div class=intro><div class=desc>Strategie spente il 20/11 perché i dati dicevano che non funzionano. Non comprano più; se avevano posizioni aperte, quelle si chiudono con le loro regole. Lo storico resta qui, così si vede da dove siamo partiti.</div>
    <div class=retsum><span>${r.length} portafogli · risultato finale</span><b>${E(eq, 0)} <small>su ${E(st, 0)}</small> <span class=${cls(p)}>${sg(p)}${f(p, 1)}%</span></b></div></div>`]].concat(cards.length ? cards : [['ret_none', '<div class=card><div class=empty>Nessun portafoglio ritirato.</div></div>']]));
}
function diaryText(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`).join('');
}
function officinaCard() {   // v13: registro dell'Officina (idee provate sui dati passati, Meme e Major), chiave «off» del desk Meme
  const off = STORES.meme.D.off; if (!off || !(off.r || []).length) return [];
  const EL = {accettata: ['accettata', 'g'], scartata: ['scartata', 'r'], riferimento: ['riferimento', 'n']};
  const rows = off.r.slice().sort((a, b) => b[0] - a[0]).map(([ts, desk, nome, n, media, esito, nota]) => { const [el, ec] = EL[esito] || ['provata', 'n'];
    return `<div class="retrow offrow"><div class=en><b>${esc(nome)}</b><small>${desk === 'major' ? 'Major' : 'Meme'} · ${esc(dt(ts))} · ${n == null ? '–' : f(n, 0)} trade simulati</small>${nota ? `<small class=offnote>${esc(nota)}</small>` : ''}</div>`
      + `<div class=ev><span class="pi ${ec}">${el}</span><small class=${cls(media)}>${media == null ? '–' : sg(media) + f(media, 2) + '% a trade'}</small></div></div>`; }).join('');
  return [['off_ideas', `<div class="card retgroup"><h3>Idee provate sui dati passati<span class=cnt>${off.n} in tutto</span></h3>`
    + `<div class=offintro>Prima di accendere una strategia Cryptus la prova sullo storico. Qui ci sono tutte le prove, anche quelle andate male: più idee si provano, più forte deve essere la prova perché una sembri buona. I risultati sullo storico non sono una promessa.</div>${rows}</div>`]];
}
function renderDiario() {
  const dia = ((STORES.meme.D.dia || {}).m || []).slice().sort((a, b) => b[0] - a[0]);
  const KL = {resoconto: ['Resoconto', 'g'], giro: ['Giro', 'p'], cambio: ['Modifica', 'o']};
  const items = dia.map((m, i) => { const [lab, c] = KL[m[1]] || [m[1], 'n'];
    return ['dia_' + m[0], `<div class="card diary"><div class=dhead><span class="pi ${c}">${esc(lab)}</span><span class=dt>${esc(dt(m[0]))}</span></div><div class=dbody>${diaryText(m[2] || '')}</div></div>`]; });
  patch([['dia_head', `<div class=intro><div class=desc>Quello che Cryptus ha visto, cambiato e proposto: il resoconto delle 8 e i giri delle 10, 13, 16, 19 e 22:15. Stesso testo che arriva su Telegram. Sotto il messaggio più recente, tutte le idee provate sui dati passati.</div></div>`]]
    .concat(items.slice(0, 1), officinaCard(), items.length ? items.slice(1) : [['dia_none', '<div class=card><div class=empty>Il diario si riempie da domani: il primo resoconto arriva alle 08:00.</div></div>']]));
}
function renderOverview() {
  const inc = includedBooks(), s0 = D.sum.s0, tot = deskTotals();
  const eqT = tot.eq, startT = tot.start, pct = tot.pct, pnl = eqT - startT;
  const w = inc.reduce((a, b) => a + bk(b).w, 0), l = inc.reduce((a, b) => a + bk(b).l, 0), cl = inc.reduce((a, b) => a + bk(b).closed, 0);
  const ps = positions();
  const isObs = e => { const m = e[1].filter(b => D.sum.b[b] && !bk(b).lab && !hiddenBook(b) && !bk(b).paused); return m.length > 0 && m.every(b => bk(b).observation); };   // v16: le strategie in osservazione hanno una scheda loro
  const ecoRows = want => Object.entries(D.sum.eco).filter(([k, e]) => !ecoPaused(k) && !hiddenEco(k) && isObs(e) === want).map(([k, e]) => {
    const mains = e[1].filter(b => D.sum.b[b] && !bk(b).lab && !hiddenBook(b) && !bk(b).paused);
    if (mains.length) return ecoRow(k, e, mains, s0, ps);
    if (k === 'm_scalp') {
      const labs = ecoLiveBooks(k);
      return ecoRow(k, e, labs, s0, ps, 'originali in pausa · solo versioni a commissioni basse');
    }
    return '';
  }).join('');
  const activeRows = ecoRows(false), obsRows = ecoRows(true);
  const pb = pausedBooks();
  const pauseRows = pb.length ? pb.map(b => {
    const e = ecoOf(b), ev = (e && D.sum.eco[e]) || [shortBook(b), [b]];
    const reason = bk(b).paused_reason || pauseReason();
    return ecoRow('paused', ev, [b], s0, ps, 'in pausa · ' + reason).replace('data-t="paused"', 'data-t="paused" data-b="' + b + '"');
  }).join('') : '';
  const hk = 'o_hero', empty = !inc.length;
  patch([
    empty ? rebuildCard('o_rebuild') : [hk, heroCard(hk, `Totale attivi · ${tot.n} portafogli`, eqT, pnl, pct, w, l, [['Chiusi', cl], ['Aperte', ps.length], ['Partenza', '€' + f(tot.n * 1000, 0)]], histLine())[1], {after: bindHist}],
    empty ? null : chartCard('ch_all'),
    empty ? null : ['o_eco', `<div class=card><h3>Portafogli attivi<span class=cnt>tocca per aprire</span></h3>${activeRows || '<div class=empty>Nessun portafoglio attivo.</div>'}</div>`, {after: el => el.querySelectorAll('.eco').forEach(x => x.onclick = () => setTab(x.dataset.t))}],
    obsRows ? ['o_obs', `<div class=card><h3>In prova<span class=cnt>fuori dal totale · tocca per aprire</span></h3>${obsRows}</div>`, {after: el => el.querySelectorAll('.eco').forEach(x => x.onclick = () => setTab(x.dataset.t))}] : null,
    DESK === 'major' ? majorCard('o_mx') : null,
    pauseRows ? ['o_pause', `<div class="card paused-card"><h3>In pausa<span class=cnt>niente nuovi ingressi</span></h3><div class=desc style="margin:0 0 8px">${esc(pauseReason())}. Le posizioni già aperte restano in gestione.</div>${pauseRows}</div>`, {after: el => el.querySelectorAll('.eco').forEach(x => x.onclick = () => { if (x.dataset.b) sub.paused = x.dataset.b; setTab('paused'); })}] : null,
    empty && !ps.length ? null : positionsCard('o_pos', ps.filter(p => !hiddenBook(p.book) && (inc.includes(p.book) || pausedBooks().includes(p.book))), true),
    feedCard('o_feed', feedLines(null), 'Attività live', 'tutti gli agenti'),
    agentsCard('o_ag', liveAgents(allAgents()), 'Catena di agenti'),
    empty ? null : tradesCard('o_tr', inc.concat(pb)), liveLabs().length ? labCard('o_lab', liveLabs(), null) : null,
    tesCard('o_tes'), retiredCard('o_ret'), DESK === 'major' || empty ? null : killsCard('o_kr')].filter(Boolean));
  if (empty) return;
  afterHero(hk);
  const ser = totalSeries(inc); const up = !ser.length || ser[ser.length - 1][1] >= startT;
  chart('ch_all', [['Totale', ser, up ? '#1fe08a' : '#ff4d64', true]], eur(startT));   // base line in EUR like the series
}
function renderEco(e) {
  const bs = booksOf(e); if (!bs.length) { patch([['none_' + e, '<div class=card><div class=empty>Nessun portafoglio in questo ecosistema.</div></div>']]); return; }
  if (!sub[e] || !bs.includes(sub[e])) sub[e] = bs[0];
  const b = sub[e], B = bk(b), s0 = D.sum.s0, ser = eqs[b] || [];
  const ps = positions().filter(p => p.book === b);
  const name = B.lab ? labName(b) + (DESK === 'major' ? ' · gemello Lab' : '') : (BOOK_NAME[b] || ecoLabel(b) || b);
  const p = e + '_' + b + '_', hk = p + 'hero', ck = 'ch_' + e + '_' + b.replace(/\W/g, '');
  const isPause = e === 'paused' || (B && B.paused);
  const desc = isPause
    ? (ECO.paused.desc + (B.paused_reason ? ' Motivo: ' + B.paused_reason + '.' : ''))
    : bookDesc(b);
  const scalpPaused = e === 'm_scalp' && pausedBooks().some(x => ecoOf(x) === 'm_scalp');
  const banner = isPause ? `<div class="pause-banner">In pausa · niente nuovi ingressi · le posizioni aperte restano in gestione</div>`
    : (B && B.off ? `<div class="pause-banner">Fermo ora: ${esc(B.off)}</div>`
    : (scalpPaused ? `<div class="pause-banner">Gli scalper normali sono in pausa. Qui vedi solo le versioni a commissioni basse.</div>` : ''));
  const dupNote = '';
  patch([
    [p + 'desc', `<div class=intro>${banner}${dupNote}<div class=desc>${esc(desc)}</div>${bs.length > 1 ? '<div class=chips></div>' : ''}</div>`,
      {after: el => syncChips(el, e, bs, b), feed: el => syncChips(el, e, bs, b)}],
    heroCard(hk, 'In prova · ' + esc(name), B.eq, B.eq - s0, B.pct, B.w, B.l, [['% vinti', B.wr == null ? '–' : f(B.wr, 0) + '%'], ['Calo max', `<span class=${B.dd < 0 ? 'neg' : 'neu'}>${f(B.dd, 1)}%</span>`], ['Chiusi', B.closed]], judgeLine(b)),
    chartCard(ck),
    positionsCard(p + 'pos', ps, false),
    feedCard(p + 'feed', e === 'paused' ? [...new Map(pausedBooks().flatMap(bb => feedLines(ecoOf(bb))).map(x => [x[0], x])).values()].sort((a, c) => c[0] - a[0]).slice(0, 40) : feedLines(e), 'Attività live', e === 'paused' ? 'In pausa' : esc((D.sum.eco[e] || ['', []])[0])),
    agentsCard(p + 'ag', liveAgents(ECO[e] ? ECO[e].agents : (((D.sum.eco[e] || [])[3] || []).length ? D.sum.eco[e][3] : allAgents())), 'Catena di agenti'),
    overshootNote(p + 'ov', B),
    DESK === 'major' ? pagellaCard(p + 'pg', b, B) : null,
    DESK === 'major' && e === 'm_scalp' ? scalpCard(p + 'sc') : null,
    tradesCard(p + 'tr', [b]), ECO[e] && ECO[e].labs && ECO[e].labs.length ? labCard(p + 'lab', ECO[e].labs, bs) : null,
    e === 'prudente' || e === 'aggressivo' || e === 'pump' || e === 'esploratore' || e === 'paused' ? killsCard(p + 'kr') : null].filter(Boolean));
  afterHero(hk);
  chart(ck, [[name, ser, B.eq >= s0 ? '#1fe08a' : '#ff4d64', true]], 1000);
}
function setTab(t) {
  if (t === tab) return; tab = t; STORES[DESK].tab = t; localStorage.setItem(tabKey(), t); haptic();
  const v = $('view'); v.classList.remove('swap'); void v.offsetWidth; v.classList.add('swap'); setTimeout(() => v.classList.remove('swap'), 450);
  render(); window.scrollTo({top: 0});
}

// ---------- v6: performance board + switcher (patched in place) ----------
function goBook(b) {
  const paused = bk(b) && bk(b).paused;
  const e = paused ? 'paused' : ecoOf(b); if (!e) return;
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
    const name = bk(x).lab ? labName(x) : shortBook(x);
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
  const mb = mainBooks(), inc = includedBooks();
  if (!mb.length) { el.hidden = true; return; }
  el.hidden = false; el.classList.add('board');
  const dt = deskTotals(), eqT = dt.eq, startT = dt.start, pctT = dt.pct;
  const open = openMain();
  const sortPct = (a, c) => (c.pct - a.pct) || a.name.localeCompare(c.name, 'it');
  const toItem = b => ({b, name: shortBook(b), tiny: tinyBook(b), pct: bk(b).pct, open: !!open[b], paused: !!bk(b).paused});
  const activeItems = activeBooks().map(toItem).sort(sortPct);
  const pausedItems = pausedBooks().map(toItem).sort(sortPct);
  const items = activeItems.concat(pausedItems);
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
  const ser = totalSeries(inc), up = !ser.length || ser[ser.length - 1][1] >= startT;
  const sp = tot.querySelector('.board-spark');
  const sig = ser.length + ':' + (ser.length ? ser[ser.length - 1][1] : 0) + ':' + (up ? 1 : 0);
  if (sp._sig !== sig) { sp._sig = sig; sp.innerHTML = sparkMini(ser, up); }

  let heat = el.querySelector('.heat');
  if (!heat) { heat = document.createElement('div'); heat.className = 'heat'; heat.setAttribute('role', 'list'); el.appendChild(heat); }
  const have = [...heat.children].filter(c => c.dataset.b), byB = Object.fromEntries(have.map(c => [c.dataset.b, c]));
  const want = items.map(it => it.b), nodes = [];
  const paint = (it) => {
    let c = byB[it.b];
    if (!c) {
      c = document.createElement('button'); c.type = 'button'; c.className = 'heat-cell'; c.dataset.b = it.b;
      c.setAttribute('role', 'listitem');
      c.innerHTML = '<span class="heat-track"><i class="heat-bar"></i><span class="hdot" hidden></span></span><span class="heat-n"></span>';
      c.onclick = ev => { ev.stopPropagation(); goBook(c.dataset.b); };
    }
    const h = Math.max(8, Math.round(Math.abs(it.pct) / scale * 100));
    if (c.style.getPropertyValue('--h') !== String(h)) c.style.setProperty('--h', h);
    c.classList.remove('pos', 'neg', 'neu');
    if (it.paused) c.classList.add('paused'); else { c.classList.remove('paused'); c.classList.add(shownCls(it.pct, 1)); }
    const e = it.paused ? 'paused' : ecoOf(it.b), cur = e && (sub[e] || booksOf(e)[0]);
    c.classList.toggle('on', tab !== 'overview' && tab === e && cur === it.b);
    c.querySelector('.hdot').hidden = !it.open;
    const lab = c.querySelector('.heat-n');
    if (lab.textContent !== it.tiny) lab.textContent = it.tiny;
    c.title = it.name + ' · ' + sg(it.pct) + f(it.pct, 1) + '%' + (it.paused ? ' · in pausa' : '');
    return c;
  };
  activeItems.forEach(it => nodes.push(paint(it)));
  if (pausedItems.length) {
    let gap = heat.querySelector('.heat-gap');
    if (!gap) { gap = document.createElement('div'); gap.className = 'heat-gap'; gap.title = 'In pausa'; gap.setAttribute('aria-hidden', 'true'); }
    nodes.push(gap);
    pausedItems.forEach(it => nodes.push(paint(it)));
  }
  const heatSig = nodes.map(c => c.dataset.b || '|').join('\0');
  const haveSig = [...heat.children].map(c => c.dataset.b || '|').join('\0');
  if (haveSig !== heatSig) {
    nodes.forEach(c => heat.appendChild(c));
    [...heat.children].forEach(c => { if (!nodes.includes(c)) c.remove(); });
  }
}
function renderTabs() {
  const el = $('tabs'); if (!el || !D.sum) return;
  const open = openMain();
  const ecos = Object.entries(D.sum.eco).map(([k, ev]) => {
    let bs = ev[1].filter(b => D.sum.b[b] && !bk(b).lab && !hiddenBook(b) && !bk(b).paused);
    if (!bs.length && k === 'm_scalp') bs = ecoLiveBooks(k);
    const eq = bs.reduce((a, b) => a + bk(b).eq, 0), st = D.sum.s0 * bs.length;
    const pct = st ? (eq / st - 1) * 100 : null;
    return {k, label: ev[0], pct, open: bs.some(b => open[b]), bits: bs.map(b => bk(b).pct), paused: ecoPaused(k), bs};
  });
  const activeEcos = ecos.filter(x => !x.paused && x.bs.length);
  const pb = pausedBooks();
  let lead = null, leadPct = -Infinity;
  for (const x of activeEcos) if (!x.bs.some(b => bk(b).exclude_from_totals) && x.pct != null && x.pct > leadPct) { leadPct = x.pct; lead = x.k; }
  const items = [{k: 'overview', label: 'Panoramica', pct: null, open: false, bits: []}, {k: 'diario', label: 'Diario', pct: null, open: false, bits: []}];
  if (pb.length) {
    const eq = pb.reduce((a, b) => a + bk(b).eq, 0), st = D.sum.s0 * pb.length;
    items.push({k: 'paused', label: 'In pausa', pct: st ? (eq / st - 1) * 100 : null, open: pb.some(b => open[b]), bits: pb.map(b => bk(b).pct), paused: true, gap: false});
  }
  items.push({k: '_gap', gapOnly: true});
  activeEcos.forEach(x => items.push({...x, gap: false}));
  const rb = retiredBooks();
  if (rb.length) { const eq = rb.reduce((a, b) => a + bk(b).eq, 0), st = D.sum.s0 * rb.length; items.push({k: '_gap2', gapOnly: true}); items.push({k: 'retired', label: 'Ritirati', pct: (eq / st - 1) * 100, open: false, bits: [], paused: true}); }
  const have = [...el.children], byK = Object.fromEntries(have.map(t => [t.dataset.t, t]));
  const want = items.map(x => x.k), nodes = [];
  const scale = Math.max(2, ...ecos.map(x => Math.abs(x.pct || 0)));
  const prevOn = el.querySelector('.tab.on') && el.querySelector('.tab.on').dataset.t;
  for (const it of items) {
    if (it.gapOnly) {
      let g = el.querySelector('.tabs-gap[data-g="' + it.k + '"]');
      if (!g) { g = document.createElement('span'); g.className = 'tabs-gap'; g.dataset.g = it.k; g.setAttribute('aria-hidden', 'true'); }
      nodes.push(g);
      continue;
    }
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
    t.classList.toggle('paused', !!it.paused);
    t.classList.toggle('hot-pos', !it.paused && it.pct != null && it.pct >= 1);
    t.classList.toggle('hot-neg', !it.paused && it.pct != null && it.pct <= -1);
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
  const sig = nodes.map(n => n.dataset.t || '|').join('\0');
  const haveSig = [...el.children].map(n => n.dataset.t || '|').join('\0');
  if (haveSig !== sig) {
    const sl = el.scrollLeft;
    nodes.forEach(n => el.appendChild(n));
    [...el.children].forEach(n => { if (!nodes.includes(n)) n.remove(); });
    el.scrollLeft = sl;
  }
  if (prevOn !== tab) {
    const on = el.querySelector('.tab.on');
    if (on) { if (on.scrollIntoViewIfNeeded) on.scrollIntoViewIfNeeded(false); else on.scrollIntoView({inline: 'nearest', block: 'nearest'}); }
  }
}
function render() {
  renderQueued = false;
  paintSwitch();
  if (!D.sum) return;
  if (DESK === 'meme' && (tab === 'pump' || tab === 'esploratore' || (D.sum.eco[tab] && ecoPaused(tab))) && pausedBooks().length) {
    if (D.sum.eco[tab]) sub.paused = (D.sum.eco[tab][1] || []).find(b => D.sum.b[b] && !hiddenBook(b)) || sub.paused;
    tab = 'paused'; localStorage.setItem('cx_tab', tab);
  }
  if (tab !== 'overview' && tab !== 'paused' && tab !== 'retired' && tab !== 'diario' && (!D.sum.eco[tab] || hiddenEco(tab) || !booksOf(tab).length)) tab = 'overview';
  STORES[DESK].tab = tab;
  renderBoard();
  renderTabs();
  if (tab === 'overview') renderOverview(); else if (tab === 'retired') renderRetired(); else if (tab === 'diario') renderDiario(); else renderEco(tab);
  const foot = DESK === 'major'
    ? `Cryptus Major · solo paper trading · ogni portafoglio parte da €1.000 virtuali · commissioni, spread e slippage inclusi<br>gli short sono perpetui simulati (funding incluso) · nessuna chiave, nessun ordine reale`
    : `Solo paper trading · ogni portafoglio parte da €1.000 virtuali · cambio fisso 1 EUR = ${f(FX(), 4)} USD<br>nessun wallet, nessuna chiave, nessun ordine reale`;
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
  const sw = $('deskswitch');
  if (sw) sw.querySelectorAll('button').forEach(b => b.onclick = () => switchDesk(b.dataset.d));
  paintSwitch();
  setLive();
  startMqtt();
  startNtfy();
  setTimeout(() => { if (!D.sum) $('view').innerHTML = '<div class="card notice"><b>In attesa dei dati del desk…</b>La connessione è aperta: i dati arrivano appena il desk pubblica il prossimo aggiornamento (al massimo ~15 secondi).</div>'; }, 12000);
})();
