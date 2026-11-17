'use strict';
/* Werfnotities: foto + notitie + project + locatie + datum, alles lokaal op de gsm. */

const APP_VERSION = '1.0';
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));

const S = {
  project: LS.get('project', ''),
  projects: LS.get('projects', []),
  tags: LS.get('tags', ['Defect', 'Opvolgen', 'OK', 'Vraag']),
  camMode: LS.get('camMode', 'app'),
  pos: null, gpsWatch: null,
  stream: null, track: null, torch: false, camStarting: false,
  screen: 'Camera',
  ovProject: null, selecting: false, selected: new Set(), list: [],
  viewId: null,
};
const TAG_COLORS = ['#e53935', '#fb8c00', '#43a047', '#1e88e5', '#8e24aa', '#00897b', '#6d4c41', '#546e7a'];
const tagColor = t => { const i = S.tags.indexOf(t); return TAG_COLORS[(i < 0 ? 7 : i) % TAG_COLORS.length]; };
const COLORS = ['#ff1744', '#ffd600', '#ffffff', '#00e5ff'];

/* ---------------- opslag (IndexedDB) ---------------- */
let _db;
function dbOpen() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open('werfnotities', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('photos', { keyPath: 'id' }); d.createObjectStore('blobs'); };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}
const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const os = async (name, mode = 'readonly') => (await dbOpen()).transaction(name, mode).objectStore(name);
const getAllPhotos = async () => rq((await os('photos')).getAll());
const getPhoto = async id => rq((await os('photos')).get(id));
const putPhoto = async p => rq((await os('photos', 'readwrite')).put(p));
const getBlob = async k => rq((await os('blobs')).get(k));
const putBlob = async (k, b) => rq((await os('blobs', 'readwrite')).put(b, k));
async function deletePhoto(id) {
  const t = (await dbOpen()).transaction(['photos', 'blobs'], 'readwrite');
  t.objectStore('photos').delete(id);
  t.objectStore('blobs').delete(id + ':orig');
  t.objectStore('blobs').delete(id + ':ann');
  return new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
}

/* ---------------- opmaak ---------------- */
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = ts => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtTime = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const isoDay = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const fmtCoords = (lat, lon) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
const locText = p => p.address || (p.lat != null ? fmtCoords(p.lat, p.lon) : 'Geen locatie');
const safe = s => (s || '').replace(/[\\/:*?"<>|#%]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'project';
const fileBase = p => { const d = new Date(p.createdAt); return `${safe(p.project)}_${String(p.nr).padStart(3, '0')}_${isoDay(p.createdAt)}_${pad2(d.getHours())}${pad2(d.getMinutes())}`; };
const extOf = b => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[b?.type] || 'jpg');
const mapUrl = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;

/* ---------------- kleine UI-hulpjes ---------------- */
let toastT;
function toast(msg, ms = 1800) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
function busy(msg) { $('#busy').classList.toggle('hidden', !msg); $('#busyMsg').textContent = msg || ''; }

let sheetClose = null;
function openSheet(content, onDismiss) {
  $('#sheetBody').replaceChildren(content);
  $('#sheet').classList.remove('hidden');
  sheetClose = onDismiss || null;
  armBack();
}
function closeSheet(dismissed) {
  if ($('#sheet').classList.contains('hidden')) return;
  $('#sheet').classList.add('hidden');
  $('#sheetBody').replaceChildren();
  const cb = sheetClose; sheetClose = null;
  if (dismissed && cb) cb();
}
const sheetOpen = () => !$('#sheet').classList.contains('hidden');

function onTapOrHold(elm, tap, hold) {
  let t, held = false;
  elm.addEventListener('pointerdown', () => { held = false; t = setTimeout(() => { held = true; navigator.vibrate?.(30); hold(); }, 550); });
  const cancel = () => clearTimeout(t);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => elm.addEventListener(ev, cancel));
  elm.addEventListener('click', e => { if (held) { e.preventDefault(); return; } tap(e); });
  elm.addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------------- schermen + Android terugknop ---------------- */
function armBack() { if (!history.state?.inner) history.pushState({ inner: 1 }, ''); }
function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr' + name));
  S.screen = name;
  if (name === 'Camera') { startCamera(); refreshCamBar(); }
  else { stopCamera(); armBack(); }
}
window.addEventListener('popstate', () => {
  if (sheetOpen()) closeSheet(true);
  else if (S.screen === 'Editor') editorCancel();
  else if (S.screen === 'Viewer') { show('Overview'); loadOverview(); }
  else if (S.screen === 'Overview') { if (S.selecting) setSelecting(false); else show('Camera'); }
  if (S.screen !== 'Camera' || sheetOpen()) armBack();
});

/* ---------------- GPS ---------------- */
function startGps() {
  if (!navigator.geolocation || S.gpsWatch != null) return;
  S.gpsWatch = navigator.geolocation.watchPosition(p => {
    S.pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, time: Date.now() };
    updateGps(); onNewPos();
  }, () => updateGps(), { enableHighAccuracy: true, maximumAge: 10000, timeout: 60000 });
}
function stopGps() { if (S.gpsWatch != null) { navigator.geolocation.clearWatch(S.gpsWatch); S.gpsWatch = null; } }
const freshPos = () => (S.pos && Date.now() - S.pos.time < 120000 ? S.pos : null);
function updateGps() {
  const g = $('#gps'), p = freshPos();
  g.className = 'gps ' + (!p ? 'bad' : p.acc <= 25 ? 'good' : 'mid');
  g.title = p ? `GPS ±${Math.round(p.acc)} m` : 'Geen GPS';
}
setInterval(updateGps, 10000);
function onNewPos() {
  const d = ED.draft;
  if (S.screen === 'Editor' && d && !d.id && d.lat == null && d.wantPos) {
    const p = freshPos(); d.lat = p.lat; d.lon = p.lon; d.acc = p.acc;
    updateEdInfo(); lookupAddress(d);
  }
}

/* ---------------- adres opzoeken (OpenStreetMap) ---------------- */
const geoCache = LS.get('geoCache', []);
function distM(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r;
  return Math.hypot(x, y) * R;
}
const cacheHit = (lat, lon) => geoCache.find(g => distM(g.lat, g.lon, lat, lon) < 20)?.addr;
let geoChain = Promise.resolve(), lastGeo = 0;
function reverseGeocode(lat, lon) {
  const hit = cacheHit(lat, lon);
  if (hit) return Promise.resolve(hit);
  const p = geoChain.then(async () => {
    const h = cacheHit(lat, lon); if (h) return h;
    if (!navigator.onLine) throw new Error('offline');
    const wait = lastGeo + 1100 - Date.now(); if (wait > 0) await sleep(wait);
    lastGeo = Date.now();
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=nl`, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); const a = j.address || {};
      const street = [a.road || a.pedestrian || a.footway || a.path || a.square, (a.house_number || '').split(/[;,]/)[0]].filter(Boolean).join(' ');
      const city = [a.postcode, a.city || a.town || a.village || a.municipality].filter(Boolean).join(' ');
      const addr = [street, city].filter(Boolean).join(', ') || j.display_name || '';
      if (addr) { geoCache.unshift({ lat, lon, addr }); geoCache.length = Math.min(geoCache.length, 200); LS.set('geoCache', geoCache); }
      return addr;
    } finally { clearTimeout(to); }
  });
  geoChain = p.catch(() => {});
  return p;
}
async function lookupAddress(d) {
  if (d.lat == null) return;
  try {
    const a = await reverseGeocode(d.lat, d.lon);
    if (a && ED.draft === d && d.lat != null) { d.address = a; updateEdInfo(); }
  } catch { /* later opnieuw via processPending */ }
}
let geoBusy = false;
async function processPending() {
  if (geoBusy || !navigator.onLine) return;
  geoBusy = true;
  try {
    for (const p of await getAllPhotos()) {
      if (p.lat == null || p.address || (p.geoFail || 0) >= 3) continue;
      try {
        const a = await reverseGeocode(p.lat, p.lon);
        const cur = await getPhoto(p.id);
        if (!cur || cur.address || cur.lat == null) continue;
        if (a) { cur.address = a; await rerender(cur); } else { cur.geoFail = 3; await putPhoto(cur); }
      } catch {
        if (!navigator.onLine) break;
        const cur = await getPhoto(p.id); if (cur) { cur.geoFail = (cur.geoFail || 0) + 1; await putPhoto(cur); }
      }
    }
    if (S.screen === 'Overview') loadOverview();
  } finally { geoBusy = false; }
}

/* ---------------- camera ---------------- */
async function startCamera() {
  const v = $('#video'), msg = $('#camMsg');
  if (S.camMode !== 'app') {
    v.classList.add('hidden');
    msg.textContent = 'Toestelcamera-modus: tik op de ronde knop om de camera van je gsm te openen.';
    msg.classList.remove('hidden'); return;
  }
  if (S.stream || S.camStarting) return;
  S.camStarting = true;
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 3072 } } });
    if (S.screen !== 'Camera' || document.hidden) { st.getTracks().forEach(t => t.stop()); return; }
    S.stream = st; S.track = st.getVideoTracks()[0];
    v.srcObject = st; v.classList.remove('hidden'); msg.classList.add('hidden');
    await v.play().catch(() => {});
    const caps = S.track.getCapabilities?.() || {};
    $('#btnTorch').classList.toggle('hidden', !caps.torch); S.torch = false;
    if (caps.focusMode?.includes('continuous')) S.track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  } catch (e) {
    v.classList.add('hidden');
    msg.textContent = `Camera niet beschikbaar (${e.name}). Geef toestemming voor de camera, of gebruik de galerij-knop.`;
    msg.classList.remove('hidden');
  } finally { S.camStarting = false; }
}
function stopCamera() {
  S.stream?.getTracks().forEach(t => t.stop());
  S.stream = null; S.track = null; $('#video').srcObject = null;
}
function flash() { const f = $('#flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }

async function ensureProject() {
  if (S.project) return true;
  return !!(await pickProject());
}

async function capture(quick) {
  if (!(await ensureProject())) return;
  const v = $('#video');
  if (S.camMode !== 'app' || !S.stream || !v.videoWidth) { $('#fileCamera').click(); return; }
  flash(); navigator.vibrate?.(15);
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  const blob = await toBlob(c, 0.92);
  const draft = newDraft(blob, { source: 'camera' });
  if (quick) {
    const bmp = await createImageBitmap(blob);
    try { const rec = await saveDraft(draft, bmp); toast(`✓ #${rec.nr} opgeslagen (zonder notitie)`); refreshCamBar(); }
    catch (e) { alert('Opslaan mislukt: ' + e.message); }
    finally { bmp.close(); }
  } else openEditor(draft);
}
function newDraft(blob, { source, date, lat, lon, name } = {}) {
  const usePos = lat == null;
  const p = usePos ? freshPos() : null;
  return {
    id: null, project: S.project, createdAt: date || Date.now(),
    lat: usePos ? (p?.lat ?? null) : lat, lon: usePos ? (p?.lon ?? null) : lon, acc: usePos ? (p?.acc ?? null) : null,
    address: null, note: '', tags: [], shapes: [], source, origBlob: blob, origName: name || null,
    wantPos: usePos,
  };
}
async function importFile(f, source) {
  if (!f) return;
  if (!(await ensureProject())) return;
  const ex = source === 'galerij' ? await readExif(f) : {};
  const draft = newDraft(f, { source, date: ex.date || (source === 'galerij' ? f.lastModified : Date.now()), lat: ex.lat, lon: ex.lon, name: f.name });
  openEditor(draft);
}

async function refreshCamBar() {
  $('#projName').textContent = S.project || 'Kies project';
  const mine = (await getAllPhotos()).filter(p => p.project === S.project).sort((a, b) => b.createdAt - a.createdAt);
  $('#count').textContent = mine.length || '';
  const img = $('#lastThumb');
  if (img.dataset.u) URL.revokeObjectURL(img.dataset.u);
  if (mine[0]) { const u = URL.createObjectURL(mine[0].thumb); img.src = u; img.dataset.u = u; img.hidden = false; }
  else { img.hidden = true; img.removeAttribute('src'); delete img.dataset.u; }
}

/* ---------------- projecten ---------------- */
function addProject(p) {
  S.projects = [p, ...S.projects.filter(x => x !== p)];
  LS.set('projects', S.projects);
}
function setProject(p) { S.project = p; LS.set('project', p); addProject(p); refreshCamBar(); }
function pickProject() {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; res(v); };
    const input = el('input', { type: 'text', placeholder: 'Nieuw project, bv. "Kerkstraat 12"', enterkeyhint: 'done', autocapitalize: 'sentences' });
    const choose = p => { setProject(p); closeSheet(); finish(p); };
    const add = () => { const v = input.value.trim(); if (v) choose(v); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    const rows = S.projects.map(p => {
      const row = el('div', { class: 'row' + (p === S.project ? ' on' : '') },
        el('button', { class: 'row-main', onclick: () => choose(p) }, p),
        el('button', { class: 'row-x', 'aria-label': 'Uit lijst halen', onclick: () => {
          S.projects = S.projects.filter(x => x !== p); LS.set('projects', S.projects); row.remove();
        } }, '✕'));
      return row;
    });
    openSheet(el('div', {},
      el('h3', {}, 'Project'),
      el('div', { class: 'add-row' }, input, el('button', { class: 'primary', onclick: add }, 'OK')),
      rows.length ? el('div', { class: 'list' }, rows) : el('p', {}, 'Typ de naam van je eerste project.'),
      rows.length ? el('p', {}, '✕ haalt een project enkel uit deze lijst, foto\'s blijven bewaard.') : null,
    ), () => finish(null));
    if (!S.projects.length) setTimeout(() => input.focus(), 150);
  });
}

/* ---------------- instellingen ---------------- */
async function openSettings() {
  const seg = el('div', { class: 'seg' },
    el('button', { class: S.camMode === 'app' ? 'on' : '', onclick: () => setCam('app') }, 'In de app (snelst)'),
    el('button', { class: S.camMode === 'device' ? 'on' : '', onclick: () => setCam('device') }, 'Toestelcamera'));
  function setCam(m) {
    S.camMode = m; LS.set('camMode', m);
    [...seg.children].forEach((b, i) => b.classList.toggle('on', (i === 0) === (m === 'app')));
    stopCamera(); startCamera();
  }
  const tagInput = el('input', { type: 'text', value: S.tags.join(', ') });
  tagInput.addEventListener('change', () => {
    const t = tagInput.value.split(',').map(s => s.trim()).filter(Boolean);
    S.tags = [...new Set(t)]; LS.set('tags', S.tags); toast('Tags bewaard');
  });
  const storage = el('p', {}, '…');
  openSheet(el('div', {},
    el('h3', {}, 'Instellingen'),
    el('h4', {}, 'Camera'), seg,
    el('p', {}, 'Toestelcamera geeft de hoogste kwaliteit, maar kost een extra tik (bevestigen).'),
    el('h4', {}, 'Snelle tags (komma-gescheiden)'), tagInput,
    el('h4', {}, 'Opslag'), storage,
    el('h4', {}, 'Tips'),
    el('p', {}, '• Lang drukken op de ontspanknop = foto meteen opslaan zonder notitie.'),
    el('p', {}, '• Tik op 🎤 op je toetsenbord om de notitie in te spreken.'),
    el('p', {}, '• In het overzicht: lang drukken op een foto om te selecteren.'),
    el('p', {}, '• Foto\'s staan in de app. Gebruik ZIP-export of "Opslaan" als back-up.'),
    el('p', {}, 'Werfnotities v' + APP_VERSION),
  ));
  try {
    const persisted = await navigator.storage?.persisted?.();
    const est = await navigator.storage?.estimate?.();
    const n = (await getAllPhotos()).length;
    storage.textContent = `${n} foto's · ${est ? (est.usage / 1048576).toFixed(0) + ' MB gebruikt' : ''} · ${persisted ? 'beschermd tegen automatisch wissen ✓' : 'nog niet beschermd: installeer de app op je beginscherm'}`;
  } catch { storage.textContent = ''; }
}

/* ---------------- editor ---------------- */
const ED = { draft: null, bmp: null, tool: 'arrow', color: COLORS[0], cur: null, fit: null, dirty: false, returnTo: 'Camera' };
const cv = $('#edCanvas');

async function openEditor(draft, returnTo = 'Camera') {
  try { ED.bmp = await createImageBitmap(draft.origBlob); }
  catch { alert('Deze foto kan niet geopend worden (formaat niet ondersteund, bv. HEIC).'); return; }
  ED.draft = draft; ED.dirty = false; ED.cur = null; ED.returnTo = returnTo;
  $('#edNote').value = draft.note || '';
  show('Editor');
  renderTags(); updateEdInfo(); setColor(ED.color); layoutCanvas();
  if (draft.lat != null && !draft.address) lookupAddress(draft);
  if (!draft.id) setTimeout(() => $('#edNote').focus(), 80);
}
function updateEdInfo() {
  const d = ED.draft; if (!d) return;
  $('#edTitle').textContent = `${d.nr ? '#' + d.nr + ' · ' : ''}${d.project} ▾ · ${fmtDate(d.createdAt)} ${fmtTime(d.createdAt)}`;
  $('#edLoc').textContent = '📍 ' + (d.address || (d.lat != null ? fmtCoords(d.lat, d.lon) + (navigator.onLine ? ' (adres zoeken…)' : '') : d.wantPos ? 'Wachten op GPS…' : 'Geen locatie'));
}
function layoutCanvas() {
  if (!ED.bmp) return;
  const r = $('#stage').getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  const b = ED.bmp, sc = Math.min(cv.width / b.width, cv.height / b.height);
  const w = b.width * sc, h = b.height * sc;
  ED.fit = { x: (cv.width - w) / 2, y: (cv.height - h) / 2, w, h };
  drawEditor();
}
function drawEditor() {
  if (!ED.bmp || !ED.fit) return;
  const ctx = cv.getContext('2d'), f = ED.fit;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(ED.bmp, f.x, f.y, f.w, f.h);
  drawShapes(ctx, ED.cur ? [...ED.draft.shapes, ED.cur] : ED.draft.shapes, f.x, f.y, f.w, f.h);
}
new ResizeObserver(() => { if (S.screen === 'Editor') layoutCanvas(); }).observe($('#stage'));

function toNorm(e, clamp) {
  const r = cv.getBoundingClientRect(), k = cv.width / r.width, f = ED.fit;
  const x = ((e.clientX - r.left) * k - f.x) / f.w, y = ((e.clientY - r.top) * k - f.y) / f.h;
  if (!clamp && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
}
cv.addEventListener('pointerdown', e => {
  if (document.activeElement === $('#edNote')) { $('#edNote').blur(); e.preventDefault(); return; } // eerste tik sluit toetsenbord
  const p = toNorm(e); if (!p) return;
  cv.setPointerCapture(e.pointerId);
  ED.cur = { type: ED.tool, color: ED.color, pts: ED.tool === 'pen' ? [p] : [p, p] };
  drawEditor();
});
cv.addEventListener('pointermove', e => {
  if (!ED.cur) return;
  const p = toNorm(e, true);
  if (ED.cur.type === 'pen') ED.cur.pts.push(p); else ED.cur.pts[1] = p;
  drawEditor();
});
cv.addEventListener('pointerup', () => {
  const s = ED.cur; if (!s) return; ED.cur = null;
  const a = s.pts[0], b = s.pts[s.pts.length - 1];
  const big = s.type === 'pen' ? s.pts.length > 2 : Math.hypot((b[0] - a[0]) * ED.fit.w, (b[1] - a[1]) * ED.fit.h) > 14 * (window.devicePixelRatio || 1);
  if (big) { ED.draft.shapes.push(s); ED.dirty = true; }
  drawEditor();
});
cv.addEventListener('pointercancel', () => { ED.cur = null; drawEditor(); });

function drawShapes(ctx, shapes, x, y, w, h) {
  const lw = Math.max(2, Math.min(w, h) * 0.012);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of shapes) {
    const P = s.pts.map(([u, v]) => [x + u * w, y + v * h]);
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw;
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = lw * 1.2;
    const a = P[0], b = P[P.length - 1];
    if (s.type === 'arrow') {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = lw * 4.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0] - Math.cos(ang) * hl * 0.8, b[1] - Math.sin(ang) * hl * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - hl * Math.cos(ang - 0.45), b[1] - hl * Math.sin(ang - 0.45));
      ctx.lineTo(b[0] - hl * Math.cos(ang + 0.45), b[1] - hl * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
    } else if (s.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    }
  }
  ctx.restore();
}
function setColor(c) { ED.color = c; $('#edColor .swatch').style.setProperty('--sw', c); }
function renderTags() {
  const box = $('#edTags'); box.replaceChildren();
  for (const t of S.tags) {
    const on = ED.draft.tags.includes(t);
    const b = el('button', { class: 'tag' + (on ? ' on' : ''), style: `--c:${tagColor(t)}` }, t);
    b.addEventListener('pointerdown', e => e.preventDefault()); // toetsenbord open houden
    b.addEventListener('click', () => {
      const a = ED.draft.tags, i = a.indexOf(t); i < 0 ? a.push(t) : a.splice(i, 1);
      ED.dirty = true; renderTags();
    });
    box.append(b);
  }
}
function editorCancel() {
  const d = ED.draft; if (!d) return;
  const changed = ED.dirty || $('#edNote').value.trim() !== (d.note || '');
  if (!d.id && !confirm('Deze foto niet opslaan?')) return;
  if (d.id && changed && !confirm('Wijzigingen niet opslaan?')) return;
  closeEditor();
}
function closeEditor() {
  const ret = ED.returnTo;
  ED.bmp?.close?.(); ED.bmp = null; ED.draft = null; ED.cur = null;
  $('#edNote').blur();
  if (ret === 'Viewer') openViewer(S.viewId); else show('Camera');
}
async function editorSave() {
  const d = ED.draft; if (!d) return;
  d.note = $('#edNote').value.trim();
  busy('Opslaan…');
  try { const rec = await saveDraft(d, ED.bmp); toast(`✓ #${rec.nr} opgeslagen`); }
  catch (e) { busy(); alert('Opslaan mislukt: ' + e.message); return; }
  busy(); closeEditor();
}
function editorLocationSheet() {
  const d = ED.draft, p = freshPos();
  openSheet(el('div', {},
    el('h3', {}, 'Locatie'),
    el('p', {}, d.lat != null ? locText(d) + (d.address ? ` (${fmtCoords(d.lat, d.lon)})` : '') : 'Geen locatie gekoppeld.'),
    p ? el('button', { class: 'big', onclick: () => { Object.assign(d, { lat: p.lat, lon: p.lon, acc: p.acc, address: null, wantPos: false }); closeSheet(); updateEdInfo(); lookupAddress(d); } }, `📍 Huidige locatie gebruiken (±${Math.round(p.acc)} m)`) : el('p', {}, 'Geen actuele GPS-positie beschikbaar.'),
    d.lat != null ? el('button', { class: 'big', onclick: () => window.open(mapUrl(d), '_blank') }, '🗺️ Tonen op kaart') : null,
    d.lat != null || d.wantPos ? el('button', { class: 'big', onclick: () => { Object.assign(d, { lat: null, lon: null, acc: null, address: null, wantPos: false }); closeSheet(); updateEdInfo(); } }, '🚫 Geen locatie op deze foto') : null,
  ));
}
async function editorProjectChange() {
  if (ED.draft.id) { toast('Project wijzigen kan enkel bij een nieuwe foto'); return; }
  const p = await pickProject();
  if (p && ED.draft) { ED.draft.project = p; updateEdInfo(); }
}

/* ---------------- opslaan + foto met balk renderen ---------------- */
async function nextNr(project) {
  const all = await getAllPhotos();
  return all.filter(p => p.project === project).reduce((m, p) => Math.max(m, p.nr || 0), 0) + 1;
}
let persistAsked = false;
async function saveDraft(d, bmp) {
  if (!persistAsked) { persistAsked = true; navigator.storage?.persist?.().catch(() => {}); }
  if (!d.id) {
    d.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    d.nr = await nextNr(d.project);
    await putBlob(d.id + ':orig', d.origBlob);
  }
  const rec = {
    id: d.id, project: d.project, nr: d.nr, createdAt: d.createdAt, savedAt: Date.now(),
    lat: d.lat, lon: d.lon, acc: d.acc, address: d.address, note: d.note, tags: [...d.tags], shapes: d.shapes,
    source: d.source, origName: d.origName, origType: d.origBlob?.type || 'image/jpeg', origW: bmp.width, origH: bmp.height,
  };
  const r = await renderAnnotated(bmp, rec);
  await putBlob(rec.id + ':ann', r.blob);
  rec.annW = r.w; rec.annH = r.h; rec.thumb = r.thumb;
  await putPhoto(rec);
  addProject(rec.project);
  if (rec.lat != null && !rec.address) setTimeout(processPending, 1500);
  return rec;
}
async function rerender(rec) {
  const ob = await getBlob(rec.id + ':orig');
  const bmp = await createImageBitmap(ob);
  try {
    const r = await renderAnnotated(bmp, rec);
    await putBlob(rec.id + ':ann', r.blob);
    rec.annW = r.w; rec.annH = r.h; rec.thumb = r.thumb;
    await putPhoto(rec);
  } finally { bmp.close(); }
}
const FONT = (px, bold) => `${bold ? '700 ' : ''}${px}px system-ui, Roboto, "Segoe UI", Arial, sans-serif`;
function wrapText(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) out.push(line);
      let w = word;
      while (ctx.measureText(w).width > maxW && w.length > 1) {
        let i = w.length; while (i > 1 && ctx.measureText(w.slice(0, i)).width > maxW) i--;
        out.push(w.slice(0, i)); w = w.slice(i);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}
function ellipsize(ctx, t, maxW) {
  if (ctx.measureText(t).width <= maxW) return t;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
async function renderAnnotated(bmp, rec) {
  const MAX = 1600;
  const sc = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * sc), IH = Math.round(bmp.height * sc);
  const fs = Math.max(14, Math.round(Math.min(W, IH) * 0.036)), sfs = Math.round(fs * 0.8);
  const pad = Math.round(fs * 0.6), gap = Math.round(fs * 0.3);
  const m = document.createElement('canvas').getContext('2d');
  m.font = FONT(fs);
  const noteLines = rec.note ? wrapText(m, rec.note, W - 2 * pad) : [];
  const L1 = fs * 1.3, L2 = sfs * 1.4, LT = rec.tags.length ? fs * 1.4 : 0, LN = fs * 1.3;
  const barH = Math.round(pad + L1 + L2 + (LT ? gap + LT : 0) + (noteLines.length ? gap + noteLines.length * LN : 0) + pad * 0.7);

  const c = document.createElement('canvas'); c.width = W; c.height = IH + barH;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, W, IH);
  drawShapes(ctx, rec.shapes, 0, 0, W, IH);
  ctx.fillStyle = '#141414'; ctx.fillRect(0, IH, W, barH);
  ctx.fillStyle = '#ffc107'; ctx.fillRect(0, IH, W, Math.max(3, Math.round(fs * 0.12)));
  ctx.textBaseline = 'top';
  let y = IH + pad;
  // regel 1: #nr  project ......... datum uur
  ctx.font = FONT(fs, true); ctx.fillStyle = '#ffc107';
  const nrTxt = `#${rec.nr}`; ctx.fillText(nrTxt, pad, y);
  const x = pad + ctx.measureText(nrTxt).width + fs * 0.5;
  ctx.font = FONT(fs); ctx.fillStyle = '#fff';
  const dt = `${fmtDate(rec.createdAt)}  ${fmtTime(rec.createdAt)}`, dtW = ctx.measureText(dt).width;
  ctx.fillText(dt, W - pad - dtW, y);
  ctx.font = FONT(fs, true);
  ctx.fillText(ellipsize(ctx, rec.project, W - pad - dtW - fs - x), x, y);
  y += L1;
  // regel 2: locatie
  ctx.font = FONT(sfs); ctx.fillStyle = '#bdbdbd';
  ctx.fillText(ellipsize(ctx, '📍 ' + locText(rec), W - 2 * pad), pad, y);
  y += L2;
  // tags
  if (LT) {
    y += gap;
    const tfs = Math.round(fs * 0.8); ctx.font = FONT(tfs, true);
    let tx = pad;
    for (const t of rec.tags) {
      const tw = ctx.measureText(t).width + tfs * 1.1;
      if (tx + tw > W - pad) break;
      ctx.fillStyle = tagColor(t);
      ctx.beginPath(); ctx.roundRect(tx, y, tw, fs * 1.2, fs * 0.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(t, tx + tfs * 0.55, y + (fs * 1.2 - tfs) / 2 + 1);
      tx += tw + fs * 0.35;
    }
    y += LT;
  }
  // notitie
  if (noteLines.length) {
    y += gap; ctx.font = FONT(fs); ctx.fillStyle = '#fff';
    for (const l of noteLines) { ctx.fillText(l, pad, y); y += LN; }
  }
  const blob = await toBlob(c, 0.8);
  const tw = 360, th = Math.round(IH * tw / W);
  const tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(c, 0, 0, W, IH, 0, 0, tw, th);
  const thumb = await toBlob(tc, 0.7);
  return { blob, w: W, h: c.height, thumb };
}

/* ---------------- overzicht ---------------- */
let gridUrls = [];
async function openOverview() {
  S.ovProject = S.project || '__all__';
  setSelecting(false, true);
  show('Overview');
  await loadOverview();
}
async function loadOverview() {
  const all = await getAllPhotos();
  const counts = {};
  all.forEach(p => { counts[p.project] = (counts[p.project] || 0) + 1; });
  const projects = [...new Set([...S.projects, ...Object.keys(counts)])].filter(p => counts[p] || p === S.project);
  const sel = $('#ovProject'); sel.replaceChildren();
  sel.append(el('option', { value: '__all__' }, `Alle projecten (${all.length})`));
  projects.forEach(p => sel.append(el('option', { value: p }, `${p} (${counts[p] || 0})`)));
  if (S.ovProject !== '__all__' && !projects.includes(S.ovProject)) S.ovProject = '__all__';
  sel.value = S.ovProject;
  S.list = all.filter(p => S.ovProject === '__all__' || p.project === S.ovProject).sort((a, b) => b.createdAt - a.createdAt);
  for (const id of [...S.selected]) if (!S.list.some(p => p.id === id)) S.selected.delete(id);
  renderGrid();
}
function renderGrid() {
  gridUrls.forEach(u => URL.revokeObjectURL(u)); gridUrls = [];
  const g = $('#ovGrid'); g.replaceChildren();
  g.classList.toggle('selecting', S.selecting);
  for (const p of S.list) {
    const u = URL.createObjectURL(p.thumb); gridUrls.push(u);
    const cell = el('div', { class: 'cell' + (S.selected.has(p.id) ? ' sel' : '') },
      el('img', { src: u, alt: '', loading: 'lazy' }),
      el('span', { class: 'nr' }, (S.ovProject === '__all__' ? p.project.slice(0, 10) + ' ' : '') + '#' + p.nr),
      p.tags.length ? el('span', { class: 'dots' }, p.tags.map(t => el('i', { style: `background:${tagColor(t)}` }))) : null,
      el('span', { class: 'cap' }, p.note || `${fmtDate(p.createdAt)} ${fmtTime(p.createdAt)}`));
    onTapOrHold(cell, () => {
      if (S.selecting) toggleSel(p.id); else openViewer(p.id);
    }, () => { if (!S.selecting) setSelecting(true); toggleSel(p.id, true); });
    g.append(cell);
  }
  $('#ovEmpty').classList.toggle('hidden', S.list.length > 0);
  updateActions();
}
function toggleSel(id, force) {
  if (force === true || !S.selected.has(id)) S.selected.add(id); else S.selected.delete(id);
  renderGrid();
}
function setSelecting(on, silent) {
  S.selecting = on; S.selected.clear();
  $('#ovSelect').classList.toggle('on', on);
  $('#ovSelect').textContent = on ? 'Klaar' : 'Selecteer';
  if (!silent) renderGrid();
}
function updateActions() {
  const a = $('#ovActions'), n = S.selected.size;
  a.classList.toggle('selecting', S.selecting && n > 0);
  const label = S.selecting && n ? ` (${n})` : '';
  a.querySelectorAll('button').forEach(b => {
    const base = { share: 'Delen', save: 'Opslaan', excel: 'Excel', pdf: 'PDF', zip: 'ZIP', delete: 'Wis' }[b.dataset.act];
    b.querySelector('span').textContent = base + (b.dataset.act === 'share' || b.dataset.act === 'delete' ? label : '');
  });
}
function targets() {
  const arr = S.selecting && S.selected.size ? S.list.filter(p => S.selected.has(p.id)) : S.list;
  return [...arr].sort((a, b) => a.project.localeCompare(b.project) || a.nr - b.nr);
}
function exportName(list) {
  const projs = [...new Set(list.map(p => p.project))];
  return `Werfnotities_${projs.length === 1 ? safe(projs[0]) : 'alle'}_${isoDay(Date.now())}`;
}
async function annFiles(list) {
  const out = [];
  for (const p of list) out.push(new File([await getBlob(p.id + ':ann')], fileBase(p) + '.jpg', { type: 'image/jpeg' }));
  return out;
}

/* ---------------- delen / downloaden ---------------- */
function download(file) {
  const u = URL.createObjectURL(file);
  const a = el('a', { href: u, download: file.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
async function downloadMany(files) {
  for (const f of files) { download(f); await sleep(350); }
  toast(`${files.length} bestand(en) in Downloads`);
}
async function shareFiles(files, title) {
  if (!navigator.canShare?.({ files })) return false;
  try { await navigator.share({ files, title }); }
  catch (e) {
    if (e.name === 'AbortError') return true;
    if (e.name === 'NotAllowedError') { deliverSheet(files, title); return true; } // tik verlopen: via knop opnieuw
    throw e;
  }
  return true;
}
function deliverSheet(files, title) {
  const canShare = navigator.canShare?.({ files });
  openSheet(el('div', {},
    el('h3', {}, title),
    el('p', {}, files.length === 1 ? files[0].name : `${files.length} bestanden`),
    canShare ? el('button', { class: 'big', onclick: async () => { closeSheet(); try { await navigator.share({ files, title }); } catch (e) { if (e.name !== 'AbortError') downloadMany(files); } } }, '📤 Delen… (WhatsApp, mail, Drive…)') : null,
    el('button', { class: 'big', onclick: () => { closeSheet(); downloadMany(files); } }, '💾 Opslaan op gsm (map Downloads)'),
  ));
}

async function ovAction(act) {
  const list = targets();
  if (!list.length) { toast('Geen foto\'s'); return; }
  try {
    if (act === 'share') {
      busy('Voorbereiden…'); const files = await annFiles(list); busy();
      if (!(await shareFiles(files, exportName(list)))) await downloadMany(files);
    } else if (act === 'save') {
      busy('Voorbereiden…'); const files = await annFiles(list); busy();
      await downloadMany(files);
    } else if (act === 'excel') {
      busy('Excel maken…'); const f = await buildExcel(list); busy();
      deliverSheet([f], 'Excel-export');
    } else if (act === 'pdf') {
      busy('PDF maken…'); const f = await buildPdf(list); busy();
      deliverSheet([f], 'PDF-werfverslag');
    } else if (act === 'zip') {
      busy('ZIP maken…'); const f = await buildZip(list); busy();
      deliverSheet([f], 'ZIP met alles');
    } else if (act === 'delete') {
      if (!S.selected.size) return;
      if (!confirm(`${list.length} foto('s) definitief verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
      for (const p of list) await deletePhoto(p.id);
      setSelecting(false, true); await loadOverview(); toast('Verwijderd');
    }
  } catch (e) { busy(); alert('Mislukt: ' + e.message); }
}

/* ---------------- exports ---------------- */
async function buildExcel(list) {
  const headers = ['Nr', 'Project', 'Datum', 'Uur', 'Adres', 'Breedtegraad', 'Lengtegraad', 'Kaart', 'Tags', 'Notitie', 'Foto met notitie', 'Foto origineel', 'Bron'];
  const rows = list.map(p => [
    p.nr, p.project, fmtDate(p.createdAt), fmtTime(p.createdAt), p.address || '',
    p.lat ?? '', p.lon ?? '',
    p.lat != null ? { f: `HYPERLINK("${mapUrl(p)}","Kaart")`, v: 'Kaart' } : '',
    p.tags.join(', '), p.note || '',
    fileBase(p) + '.jpg', fileBase(p) + '_origineel.' + extOf({ type: p.origType }), p.source || '',
  ]);
  const blob = await makeXlsx(headers, rows, [6, 20, 11, 7, 34, 12, 12, 8, 16, 50, 34, 38, 9]);
  return new File([blob], exportName(list) + '.xlsx', { type: blob.type });
}
async function buildPdf(list) {
  const imgs = [];
  for (const p of list) imgs.push({ blob: await getBlob(p.id + ':ann'), w: p.annW, h: p.annH });
  const projs = [...new Set(list.map(p => p.project))];
  const times = list.map(p => p.createdAt);
  const from = fmtDate(Math.min(...times)), to = fmtDate(Math.max(...times));
  const title = 'Werfverslag – ' + (projs.length === 1 ? projs[0] : projs.join(', '));
  const sub = `${list.length} foto's · ${from === to ? from : from + ' – ' + to} · opgemaakt ${fmtDate(Date.now())}`;
  const blob = await makePdf(title, sub, imgs);
  return new File([blob], exportName(list) + '.pdf', { type: 'application/pdf' });
}
async function buildZip(list) {
  const base = exportName(list);
  const files = [];
  for (const p of list) {
    files.push({ name: `${base}/met_notitie/${fileBase(p)}.jpg`, data: await getBlob(p.id + ':ann') });
    const ob = await getBlob(p.id + ':orig');
    files.push({ name: `${base}/origineel/${fileBase(p)}_origineel.${extOf(ob)}`, data: ob });
  }
  files.push({ name: `${base}/${base}.xlsx`, data: await buildExcel(list) });
  const blob = await makeZip(files);
  return new File([blob], base + '.zip', { type: 'application/zip' });
}

/* ---------------- detail ---------------- */
let vwUrl;
async function openViewer(id) {
  const p = await getPhoto(id);
  if (!p) { show('Overview'); loadOverview(); return; }
  S.viewId = id;
  if (vwUrl) URL.revokeObjectURL(vwUrl);
  vwUrl = URL.createObjectURL(await getBlob(id + ':ann'));
  $('#vwImg').src = vwUrl;
  $('#vwTitle').textContent = `#${p.nr} · ${p.project}`;
  $('#vwMeta').replaceChildren(
    el('div', {}, `🕒 ${fmtDate(p.createdAt)} ${fmtTime(p.createdAt)}`),
    el('div', {}, '📍 ', p.lat != null ? el('a', { href: mapUrl(p), target: '_blank', rel: 'noopener' }, locText(p)) : 'Geen locatie'),
    p.tags.length ? el('div', {}, '🏷️ ' + p.tags.join(', ')) : null,
    p.note ? el('div', { style: 'white-space:pre-wrap;margin-top:4px' }, p.note) : null,
  );
  show('Viewer');
}
async function vwAction(act) {
  const p = await getPhoto(S.viewId); if (!p) return;
  try {
    if (act === 'edit') {
      const ob = await getBlob(p.id + ':orig');
      openEditor({ ...p, tags: [...p.tags], shapes: p.shapes.map(s => ({ ...s, pts: s.pts.map(q => [...q]) })), origBlob: ob, wantPos: false }, 'Viewer');
    } else if (act === 'share') {
      const files = await annFiles([p]);
      if (!(await shareFiles(files, fileBase(p)))) download(files[0]);
    } else if (act === 'save') {
      download((await annFiles([p]))[0]); toast('Opgeslagen in Downloads');
    } else if (act === 'orig') {
      const ob = await getBlob(p.id + ':orig');
      deliverSheet([new File([ob], `${fileBase(p)}_origineel.${extOf(ob)}`, { type: ob.type || 'image/jpeg' })], 'Originele foto');
    } else if (act === 'delete') {
      if (!confirm(`Foto #${p.nr} definitief verwijderen?`)) return;
      await deletePhoto(p.id); show('Overview'); loadOverview(); toast('Verwijderd');
    }
  } catch (e) { alert('Mislukt: ' + e.message); }
}

/* ---------------- koppelingen ---------------- */
function wire() {
  $('#btnProject').onclick = () => pickProject();
  $('#btnSettings').onclick = openSettings;
  $('#btnGallery').onclick = () => $('#fileGallery').click();
  $('#btnOverview').onclick = openOverview;
  $('#btnTorch').onclick = () => {
    S.torch = !S.torch;
    S.track?.applyConstraints({ advanced: [{ torch: S.torch }] }).catch(() => {});
  };
  onTapOrHold($('#btnShutter'), () => capture(false), () => capture(true));
  $('#fileGallery').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'galerij'); };
  $('#fileCamera').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'camera'); };

  document.querySelectorAll('.tool[data-tool]').forEach(b => {
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.onclick = () => { ED.tool = b.dataset.tool; document.querySelectorAll('.tool[data-tool]').forEach(x => x.classList.toggle('active', x === b)); };
  });
  $('#edColor').addEventListener('pointerdown', e => e.preventDefault());
  $('#edColor').onclick = () => setColor(COLORS[(COLORS.indexOf(ED.color) + 1) % COLORS.length]);
  $('#edUndo').addEventListener('pointerdown', e => e.preventDefault());
  $('#edUndo').onclick = () => { if (ED.draft?.shapes.length) { ED.draft.shapes.pop(); ED.dirty = true; drawEditor(); } };
  $('#edSave').addEventListener('pointerdown', e => e.preventDefault());
  $('#edSave').onclick = editorSave;
  $('#edCancel').onclick = editorCancel;
  $('#edLoc').onclick = editorLocationSheet;
  $('#edTitle').onclick = editorProjectChange;

  $('#ovBack').onclick = () => show('Camera');
  $('#ovSelect').onclick = () => setSelecting(!S.selecting);
  $('#ovProject').onchange = e => { S.ovProject = e.target.value; S.selected.clear(); loadOverview(); };
  $('#ovActions').querySelectorAll('button').forEach(b => { b.onclick = () => ovAction(b.dataset.act); });
  $('#vwBack').onclick = () => { show('Overview'); loadOverview(); };
  document.querySelectorAll('[data-vw]').forEach(b => { b.onclick = () => vwAction(b.dataset.vw); });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(true); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopCamera(); stopGps(); }
    else { startGps(); if (S.screen === 'Camera') startCamera(); }
  });
  window.addEventListener('online', processPending);
}

function init() {
  wire();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  startGps();
  show('Camera');
  if (!S.project) setTimeout(() => pickProject(), 400);
  setTimeout(processPending, 3000);
}
init();
