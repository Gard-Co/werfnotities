'use strict';
/* Werfnotities: foto + notitie + project + locatie + datum, alles lokaal op de gsm. */

const APP_VERSION = '1.3';
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

/* ---------------- iconen (lijnstijl) ---------------- */
const ICONS = {
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  camera: '<path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.3h5.4l1.6 2.3h2.2a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  more: '<circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  flash: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  arrow: '<path d="M6 18 18 6M9 6h9v9"/>',
  circle: '<ellipse cx="12" cy="12" rx="8.5" ry="7"/>',
  pen: '<path d="M3 17c2.5-5 5-6 6.5-3.5S13 18 15.5 13 19 6 21 7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  share: '<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M5 20h14"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l.9 12.1A2 2 0 0 0 8.9 21h6.2a2 2 0 0 0 2-1.9L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  upload: '<path d="M12 21V9M7.5 13.5 12 9l4.5 4.5"/><path d="M5 4h14"/>',
  checkAll: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};
function ico(name) {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return t.content.firstChild;
}

const S = {
  project: LS.get('project', ''),
  projects: LS.get('projects', []),
  tags: LS.get('tags', ['Defect', 'Opvolgen', 'OK', 'Vraag']),
  autoDl: LS.get('autoDl', 'ann'), // 'off' | 'ann' | 'both'
  pos: null, gpsWatch: null, quickShot: false,
  screen: 'Camera',
  ovProject: null, selecting: false, selected: new Set(), list: [],
  viewId: null,
};
const TAG_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#a16207', '#64748b'];
const tagColor = t => { const i = S.tags.indexOf(t); return TAG_COLORS[(i < 0 ? 7 : i) % TAG_COLORS.length]; };
const COLORS = ['#ff3b30', '#ffcc00', '#ffffff', '#32d4ff'];

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
const plural = (n, one, more) => `${n} ${n === 1 ? one : more}`;

/* ---------------- kleine UI-hulpjes ---------------- */
let toastT;
function toast(msg, ok = true, ms = 1900) {
  const t = $('#toast'); t.replaceChildren(ok ? ico('check') : '', msg); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
function busy(msg) { $('#busy').classList.toggle('hidden', !msg); $('#busyMsg').textContent = msg || ''; }
const bigBtn = (iconName, label, onclick, cls = '') => el('button', { class: 'big ' + cls, onclick }, ico(iconName), label);

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
  if (name === 'Camera') refreshCamBar();
  else armBack();
  if (name !== 'Editor' && S.updateReady) location.reload();
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
  g.querySelector('b').textContent = p ? `±${Math.round(p.acc)} m` : 'GPS';
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

/* ---------------- camera: de gewone camera-app van de gsm ---------------- */
async function ensureProject() {
  if (S.project) return true;
  return !!(await pickProject());
}
function capture(quick) {
  $('#btnShutter').classList.remove('hold');
  if (!S.project) { ensureProject(); return; } // eerst project kiezen, daarna opnieuw tikken
  S.quickShot = !!quick;
  $('#fileCamera').click();
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
  const quick = source === 'camera' && S.quickShot; S.quickShot = false;
  if (!f) return;
  if (source === 'galerij' && await readMeta(f)) { await importAnnotated([f]); return; } // al een werfnotitie
  if (!(await ensureProject())) return;
  const ex = source === 'galerij' ? await readExif(f) : {};
  const draft = newDraft(f, { source, date: ex.date || (source === 'galerij' ? f.lastModified : Date.now()), lat: ex.lat, lon: ex.lon, name: f.name });
  if (!quick) { openEditor(draft); return; }
  busy('Opslaan…');
  let bmp;
  try {
    bmp = await createImageBitmap(f);
    const rec = await saveDraft(draft, bmp);
    busy(); toast(`#${rec.nr} opgeslagen zonder notitie`); refreshCamBar();
    autoExport(rec, f, true);
  } catch (e) { busy(); alert('Opslaan mislukt: ' + e.message); }
  finally { bmp?.close(); }
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
    const input = el('input', { type: 'text', placeholder: 'Nieuw project, bv. Kerkstraat 12', enterkeyhint: 'done', autocapitalize: 'sentences' });
    const choose = p => { setProject(p); closeSheet(); finish(p); };
    const add = () => { const v = input.value.trim(); if (v) choose(v); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    const rows = S.projects.map(p => {
      const row = el('div', { class: 'row' + (p === S.project ? ' on' : '') },
        el('button', { class: 'row-main', onclick: () => choose(p) }, p, p === S.project ? ico('check') : null),
        el('button', { class: 'row-x', 'aria-label': 'Uit lijst halen', onclick: () => {
          S.projects = S.projects.filter(x => x !== p); LS.set('projects', S.projects); row.remove();
        } }, ico('x')));
      return row;
    });
    openSheet(el('div', {},
      el('h3', {}, 'Project'),
      el('div', { class: 'add-row' }, input, el('button', { class: 'primary', onclick: add }, 'Toevoegen')),
      rows.length ? el('div', { class: 'list' }, rows) : el('p', {}, 'Geef je eerste project een naam.'),
      rows.length ? el('p', {}, 'Het kruisje haalt een project enkel uit deze lijst; de foto\'s blijven bewaard.') : null,
    ), () => finish(null));
    if (!S.projects.length) setTimeout(() => input.focus(), 150);
  });
}

/* ---------------- instellingen ---------------- */
function segControl(opts, current, onPick) {
  const seg = el('div', { class: 'seg' });
  opts.forEach(([v, t]) => seg.append(el('button', { class: current === v ? 'on' : '', onclick: () => {
    [...seg.children].forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); onPick(v);
  } }, t)));
  return seg;
}
async function openSettings() {
  const dlSeg = segControl([['off', 'Uit'], ['ann', 'Met notitie'], ['both', '+ Origineel']], S.autoDl, v => {
    S.autoDl = v; LS.set('autoDl', v);
  });
  const tagInput = el('input', { type: 'text', value: S.tags.join(', ') });
  tagInput.addEventListener('change', () => {
    const t = tagInput.value.split(',').map(s => s.trim()).filter(Boolean);
    S.tags = [...new Set(t)]; LS.set('tags', S.tags); toast('Tags bewaard');
  });
  const storage = el('p', {}, '…');
  openSheet(el('div', {},
    el('h3', {}, 'Instellingen'),
    el('h4', {}, 'Kopie automatisch in Downloads'), dlSeg,
    el('p', {}, 'Na elke foto komt een kopie in de map Downloads, zichtbaar in je galerij.'),
    el('p', {}, 'Vraagt Chrome telkens om te bevestigen? Zet in Chrome → Instellingen → Downloads de optie "Vragen waar bestanden moeten worden opgeslagen" uit.'),
    el('h4', {}, 'Snelle tags'), tagInput,
    el('p', {}, 'Gescheiden door komma\'s.'),
    el('h4', {}, 'Opslag'), storage,
    el('h4', {}, 'Tips'),
    el('p', {}, 'Lang drukken op de grote cameraknop: na de foto wordt die meteen opgeslagen, zonder notitiescherm.'),
    el('p', {}, 'Tik op de microfoon van je toetsenbord om een notitie in te spreken.'),
    el('p', {}, 'In het overzicht selecteer je foto\'s door lang te drukken.'),
    el('p', { style: 'color:var(--fg-3);margin-top:18px' }, 'Werfnotities ' + APP_VERSION),
  ));
  try {
    const persisted = await navigator.storage?.persisted?.();
    const est = await navigator.storage?.estimate?.();
    const n = (await getAllPhotos()).length;
    storage.textContent = `${plural(n, 'foto', 'foto\'s')} · ${est ? (est.usage / 1048576).toFixed(0) + ' MB' : ''} · ${persisted ? 'beschermd tegen automatisch wissen' : 'nog niet beschermd: installeer de app op je beginscherm'}`;
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
  $('#edTitle').textContent = `${d.nr ? '#' + d.nr + '  ' : ''}${d.project}  ·  ${fmtDate(d.createdAt)} ${fmtTime(d.createdAt)}`;
  const loc = d.address || (d.lat != null ? fmtCoords(d.lat, d.lon) + (navigator.onLine ? ' — adres zoeken…' : '') : d.wantPos ? 'Wachten op GPS…' : 'Geen locatie');
  $('#edLoc').replaceChildren(ico('pin'), loc);
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
  const lw = Math.max(2, Math.min(w, h) * 0.011);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of shapes) {
    const P = s.pts.map(([u, v]) => [x + u * w, y + v * h]);
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = lw * 0.8;
    const a = P[0], b = P[P.length - 1];
    if (s.type === 'arrow') {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = lw * 4.2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0] - Math.cos(ang) * hl * 0.8, b[1] - Math.sin(ang) * hl * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - hl * Math.cos(ang - 0.42), b[1] - hl * Math.sin(ang - 0.42));
      ctx.lineTo(b[0] - hl * Math.cos(ang + 0.42), b[1] - hl * Math.sin(ang + 0.42));
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
  const isNew = !d.id, orig = d.origBlob;
  busy('Opslaan…');
  let rec;
  try { rec = await saveDraft(d, ED.bmp); toast(`#${rec.nr} opgeslagen`); }
  catch (e) { busy(); alert('Opslaan mislukt: ' + e.message); return; }
  busy(); closeEditor();
  autoExport(rec, orig, isNew);
}
/* Kopie automatisch in de map Downloads zetten (zichtbaar in de galerij). */
async function autoExport(rec, origBlob, isNew) {
  if (S.autoDl === 'off') return;
  try {
    download((await annFiles([rec]))[0]);
    if (S.autoDl === 'both' && isNew && origBlob) {
      await sleep(500);
      download(new File([origBlob], `${fileBase(rec)}_origineel.${extOf(origBlob)}`, { type: origBlob.type || 'image/jpeg' }));
    }
  } catch (e) { console.warn('Automatisch opslaan mislukt', e); }
}
function editorLocationSheet() {
  const d = ED.draft, p = freshPos();
  openSheet(el('div', {},
    el('h3', {}, 'Locatie'),
    el('p', {}, d.lat != null ? locText(d) + (d.address ? `  (${fmtCoords(d.lat, d.lon)})` : '') : 'Geen locatie gekoppeld.'),
    p ? bigBtn('pin', `Huidige locatie gebruiken (±${Math.round(p.acc)} m)`, () => { Object.assign(d, { lat: p.lat, lon: p.lon, acc: p.acc, address: null, wantPos: false }); closeSheet(); updateEdInfo(); lookupAddress(d); }) : el('p', {}, 'Geen actuele GPS-positie beschikbaar.'),
    d.lat != null ? bigBtn('map', 'Tonen op kaart', () => window.open(mapUrl(d), '_blank')) : null,
    d.lat != null || d.wantPos ? bigBtn('ban', 'Geen locatie op deze foto', () => { Object.assign(d, { lat: null, lon: null, acc: null, address: null, wantPos: false }); closeSheet(); updateEdInfo(); }) : null,
  ));
}
async function editorProjectChange() {
  if (ED.draft.id) { toast('Project wijzigen kan enkel bij een nieuwe foto', false); return; }
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
    imported: d.imported || false,
  };
  const r = await renderAnnotated(bmp, rec);
  await putBlob(rec.id + ':ann', r.blob);
  Object.assign(rec, { annW: r.w, annH: r.h, imgH: r.ih, thumb: r.thumb });
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
    Object.assign(rec, { annW: r.w, annH: r.h, imgH: r.ih, thumb: r.thumb });
    await putPhoto(rec);
  } finally { bmp.close(); }
}
const FONT = (px, w = 400) => `${w} ${px}px Roboto, "Segoe UI", system-ui, -apple-system, Arial, sans-serif`;
const PIN = new Path2D('M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z');
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
  const fs = Math.max(14, Math.round(Math.min(W, IH) * 0.034)), sfs = Math.round(fs * 0.78);
  const pad = Math.round(fs * 0.75), gap = Math.round(fs * 0.4);
  const m = document.createElement('canvas').getContext('2d');
  m.font = FONT(fs);
  const noteLines = rec.note ? wrapText(m, rec.note, W - 2 * pad) : [];
  const L1 = fs * 1.3, L2 = sfs * 1.45, LT = rec.tags.length ? fs * 1.25 : 0, LN = fs * 1.32;
  const barH = Math.round(pad + L1 + gap * 0.3 + L2 + (LT ? gap + LT : 0) + (noteLines.length ? gap + noteLines.length * LN : 0) + pad * 0.8);

  const c = document.createElement('canvas'); c.width = W; c.height = IH + barH;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, W, IH);
  drawShapes(ctx, rec.shapes, 0, 0, W, IH);
  ctx.fillStyle = '#111113'; ctx.fillRect(0, IH, W, barH);
  ctx.fillStyle = '#f5b400'; ctx.fillRect(0, IH, W, Math.max(2, Math.round(fs * 0.08)));
  ctx.textBaseline = 'top';
  let y = IH + pad;
  // regel 1: #nr  project ......... datum uur
  ctx.font = FONT(fs, 700); ctx.fillStyle = '#f5b400';
  const nrTxt = `#${rec.nr}`; ctx.fillText(nrTxt, pad, y);
  const x = pad + ctx.measureText(nrTxt).width + fs * 0.55;
  ctx.font = FONT(fs, 400); ctx.fillStyle = '#a1a1aa';
  const dt = `${fmtDate(rec.createdAt)}  ${fmtTime(rec.createdAt)}`, dtW = ctx.measureText(dt).width;
  ctx.fillText(dt, W - pad - dtW, y);
  ctx.font = FONT(fs, 600); ctx.fillStyle = '#ffffff';
  ctx.fillText(ellipsize(ctx, rec.project, W - pad - dtW - fs - x), x, y);
  y += L1 + gap * 0.3;
  // regel 2: locatie met speld-icoon
  const ps = sfs / 24;
  ctx.save(); ctx.translate(pad - ps, y - ps * 1.5); ctx.scale(ps * 1.05, ps * 1.05);
  ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2; ctx.stroke(PIN); ctx.restore();
  ctx.font = FONT(sfs, 400); ctx.fillStyle = '#a1a1aa';
  ctx.fillText(ellipsize(ctx, locText(rec), W - 2 * pad - sfs * 1.3), pad + sfs * 1.25, y);
  y += L2;
  // tags
  if (LT) {
    y += gap;
    const tfs = Math.round(fs * 0.72); ctx.font = FONT(tfs, 600);
    let tx = pad; const th = fs * 1.15;
    for (const t of rec.tags) {
      const tw = ctx.measureText(t).width + tfs * 1.9;
      if (tx + tw > W - pad) break;
      ctx.fillStyle = tagColor(t) + '33';
      ctx.beginPath(); ctx.roundRect(tx, y, tw, th, th / 2); ctx.fill();
      ctx.strokeStyle = tagColor(t); ctx.lineWidth = Math.max(1, fs * 0.05); ctx.stroke();
      ctx.fillStyle = tagColor(t); ctx.beginPath(); ctx.arc(tx + tfs * 0.75, y + th / 2, tfs * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(t, tx + tfs * 1.2, y + (th - tfs) / 2 + 1);
      tx += tw + fs * 0.3;
    }
    y += LT;
  }
  // notitie
  if (noteLines.length) {
    y += gap; ctx.font = FONT(fs, 400); ctx.fillStyle = '#f4f4f5';
    for (const l of noteLines) { ctx.fillText(l, pad, y); y += LN; }
  }
  const blob = await toBlob(c, 0.8);
  const tw = 360, th = Math.round(IH * tw / W);
  const tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(c, 0, 0, W, IH, 0, 0, tw, th);
  const thumb = await toBlob(tc, 0.7);
  return { blob, w: W, h: c.height, ih: IH, thumb };
}

/* ---------------- verborgen info in de JPEG (om later terug te importeren) ---------------- */
const META_TAG = 'WERFNOTITIES:';
async function withMeta(blob, p) {
  const meta = {
    app: 'werfnotities', v: 1, id: p.id, project: p.project, nr: p.nr, createdAt: p.createdAt,
    lat: p.lat, lon: p.lon, acc: p.acc, address: p.address, note: p.note, tags: p.tags, source: p.source,
    imgH: p.imgH || Math.round(p.origH * p.annW / p.origW),
  };
  const txt = new TextEncoder().encode(META_TAG + JSON.stringify(meta));
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf[0] !== 0xFF || buf[1] !== 0xD8 || txt.length > 65000) return blob;
  let at = 2; // na JFIF-blok invoegen
  if (buf[2] === 0xFF && buf[3] === 0xE0) at = 4 + ((buf[4] << 8) | buf[5]);
  const len = txt.length + 2;
  const seg = new Uint8Array(4 + txt.length);
  seg[0] = 0xFF; seg[1] = 0xFE; seg[2] = len >> 8; seg[3] = len & 0xFF; seg.set(txt, 4);
  return new Blob([buf.subarray(0, at), seg, buf.subarray(at)], { type: 'image/jpeg' });
}
async function readMeta(file) {
  try {
    const buf = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
    if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
    let o = 2;
    while (o + 4 < buf.length) {
      if (buf[o] !== 0xFF) return null;
      const m = buf[o + 1];
      if (m === 0xDA || m === 0xD9) return null;
      const len = (buf[o + 2] << 8) | buf[o + 3];
      if (m === 0xFE) {
        const s = new TextDecoder().decode(buf.subarray(o + 4, o + 2 + len));
        if (s.startsWith(META_TAG)) {
          const j = JSON.parse(s.slice(META_TAG.length));
          if (j.app === 'werfnotities' && j.id) return j;
        }
      }
      o += 2 + len;
    }
  } catch { /* geen werfnotitie */ }
  return null;
}
async function importAnnotated(files) {
  let added = 0, skipped = 0, noMeta = 0;
  busy('Importeren…');
  for (const f of files) {
    try {
      const meta = await readMeta(f);
      if (!meta) { noMeta++; continue; }
      if (await getPhoto(meta.id)) { skipped++; continue; }
      const bmp = await createImageBitmap(f);
      const W = bmp.width, H = bmp.height, ih = Math.min(H, meta.imgH || H);
      const c = document.createElement('canvas'); c.width = W; c.height = ih;
      c.getContext('2d').drawImage(bmp, 0, 0); bmp.close();
      const base = await toBlob(c, 0.92);
      const tw = 360, tc = document.createElement('canvas'); tc.width = tw; tc.height = Math.round(ih * tw / W);
      tc.getContext('2d').drawImage(c, 0, 0, tc.width, tc.height);
      const rec = {
        id: meta.id, project: meta.project || 'Geïmporteerd', nr: meta.nr || 0, createdAt: meta.createdAt || f.lastModified,
        savedAt: Date.now(), lat: meta.lat ?? null, lon: meta.lon ?? null, acc: meta.acc ?? null, address: meta.address || null,
        note: meta.note || '', tags: meta.tags || [], shapes: [], source: meta.source || '', origName: f.name, origType: 'image/jpeg',
        origW: W, origH: ih, annW: W, annH: H, imgH: ih, imported: true, thumb: await toBlob(tc, 0.7),
      };
      await putBlob(rec.id + ':orig', base);
      await putBlob(rec.id + ':ann', f);
      await putPhoto(rec);
      addProject(rec.project); added++;
    } catch (e) { console.warn('Import mislukt', f.name, e); noMeta++; }
  }
  busy();
  const parts = [`${plural(added, 'foto', 'foto\'s')} geïmporteerd`];
  if (skipped) parts.push(`${skipped} stonden al in de app`);
  if (noMeta) parts.push(`${noMeta} zonder notitie-info overgeslagen`);
  if (noMeta && !added) alert(parts.join('\n') + '\n\nAlleen foto\'s die met Werfnotities 1.2 of later zijn opgeslagen of gedeeld, bevatten de info. Via WhatsApp verstuurde foto\'s verliezen die info.');
  else toast(parts.join(' · '), added > 0, 3000);
  if (S.screen === 'Overview') loadOverview(); else refreshCamBar();
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
      el('span', { class: 'nr' }, (S.ovProject === '__all__' ? p.project.slice(0, 12) + '  ' : '') + '#' + p.nr),
      p.tags.length ? el('span', { class: 'dots' }, p.tags.map(t => el('i', { style: `background:${tagColor(t)}` }))) : null,
      el('span', { class: 'cap' }, p.note || `${fmtDate(p.createdAt)} ${fmtTime(p.createdAt)}`),
      el('span', { class: 'chk' }, ico('check')));
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
function selectAll() {
  setSelecting(true, true);
  S.list.forEach(p => S.selected.add(p.id));
  renderGrid();
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
  for (const p of list) out.push(new File([await withMeta(await getBlob(p.id + ':ann'), p)], fileBase(p) + '.jpg', { type: 'image/jpeg' }));
  return out;
}
function overviewMenu() {
  const proj = S.ovProject !== '__all__' ? S.ovProject : null;
  openSheet(el('div', {},
    el('h3', {}, 'Meer'),
    bigBtn('checkAll', 'Alles selecteren', () => { closeSheet(); selectAll(); }),
    bigBtn('upload', 'Foto\'s met notitie importeren', () => { closeSheet(); $('#fileImport').click(); }),
    proj ? bigBtn('lock', `Project "${proj}" afsluiten`, () => { closeSheet(); closeProject(proj); })
      : el('p', {}, 'Kies bovenaan één project om het af te sluiten.'),
    el('p', {}, 'Importeren: kies foto\'s met notitie die je eerder uit deze app bewaard of gedeeld hebt. Project, nummer, tags, notitie, datum en adres worden teruggelezen, zodat je opnieuw een Excel of PDF kunt maken.'),
  ));
}
async function closeProject(proj) {
  const list = (await getAllPhotos()).filter(p => p.project === proj).sort((a, b) => a.nr - b.nr);
  if (!list.length) return;
  busy('ZIP maken…');
  let zip;
  try { zip = await buildZip(list); } catch (e) { busy(); alert('ZIP maken mislukt: ' + e.message); return; }
  busy();
  const files = [zip];
  const canShare = navigator.canShare?.({ files });
  const delBtn = bigBtn('trash', `${plural(list.length, 'foto', 'foto\'s')} uit de app wissen`, async () => {
    if (!confirm(`Alle ${plural(list.length, 'foto', 'foto\'s')} van "${proj}" uit de app wissen?\n\nDe ZIP en de kopieën in Downloads blijven bestaan.`)) return;
    closeSheet(); busy('Wissen…');
    for (const p of list) await deletePhoto(p.id);
    busy();
    S.projects = S.projects.filter(x => x !== proj); LS.set('projects', S.projects);
    if (S.project === proj) { S.project = ''; LS.set('project', ''); }
    S.ovProject = '__all__'; setSelecting(false, true); await loadOverview();
    toast(`Project "${proj}" afgesloten`);
  }, 'danger');
  delBtn.disabled = true;
  const saved = () => { delBtn.disabled = false; };
  openSheet(el('div', {},
    el('h3', {}, `Project "${proj}" afsluiten`),
    el('p', {}, `${plural(list.length, 'foto', 'foto\'s')} · ZIP met originelen, foto's met notitie en Excel · ${(zip.size / 1048576).toFixed(1)} MB`),
    el('h4', {}, 'Stap 1 · Bewaar de ZIP'),
    canShare ? bigBtn('share', 'Delen (Drive, mail…)', async () => {
      try { await navigator.share({ files, title: zip.name }); saved(); }
      catch (e) { if (e.name !== 'AbortError') { download(zip); saved(); } }
    }) : null,
    bigBtn('download', 'Opslaan op gsm (Downloads)', () => { download(zip); saved(); }),
    el('h4', {}, 'Stap 2 · Opruimen'),
    delBtn,
    el('p', {}, 'Wissen kan pas nadat je de ZIP bewaard hebt.'),
  ));
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
  toast(`${plural(files.length, 'bestand', 'bestanden')} in Downloads`);
}
/* Delen via het deelmenu van Android (WhatsApp, Gmail, Outlook, Drive…).
   Chrome laat maximaal 10 bestanden per keer delen: grotere reeksen gaan in porties. */
const SHARE_MAX = 10;
const canShareFiles = files => !!navigator.share && !!navigator.canShare?.({ files });
function shareSheet(files, title, intro) {
  const groups = [];
  for (let i = 0; i < files.length; i += SHARE_MAX) groups.push(files.slice(i, i + SHARE_MAX));
  const shareable = canShareFiles(groups[0]);
  const btns = groups.map((g, i) => {
    const label = groups.length === 1
      ? (files.length === 1 ? 'Delen via WhatsApp, mail…' : `${plural(files.length, 'foto', 'foto\'s')} delen via WhatsApp, mail…`)
      : `Deel ${i + 1} van ${groups.length}: foto ${i * SHARE_MAX + 1}–${i * SHARE_MAX + g.length}`;
    const b = bigBtn('share', label, async () => {
      try {
        await navigator.share({ files: g, title });
        b.classList.add('done'); b.firstChild.replaceWith(ico('check'));
        if (groups.length === 1) closeSheet();
      } catch (e) {
        if (e.name !== 'AbortError') alert('Delen mislukt: ' + e.message);
      }
    });
    return b;
  });
  openSheet(el('div', {},
    el('h3', {}, title),
    intro ? el('p', {}, intro) : null,
    groups.length > 1 && shareable ? el('p', {}, `Android deelt maximaal ${SHARE_MAX} bestanden per keer. Tik de knoppen na elkaar aan.`) : null,
    shareable ? btns : el('p', {}, 'Dit bestandstype kan Chrome niet rechtstreeks delen. Sla het op en deel het daarna vanuit de app Bestanden (map Downloads).'),
    bigBtn('download', 'Opslaan op gsm (Downloads)', () => { closeSheet(); downloadMany(files); }),
  ));
}
const deliverSheet = (files, title) => shareSheet(files, title, files.length === 1 ? files[0].name : null);
async function shareFiles(files, title) {
  // Rechtstreeks het deelmenu openen als het kan; anders (te veel bestanden, tik verlopen) via het keuzemenu.
  if (files.length <= SHARE_MAX && canShareFiles(files)) {
    try { await navigator.share({ files, title }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  shareSheet(files, title);
}

async function ovAction(act) {
  const list = targets();
  if (!list.length) { toast('Geen foto\'s', false); return; }
  try {
    if (act === 'share') {
      busy(`${plural(list.length, 'foto', 'foto\'s')} klaarzetten…`); const files = await annFiles(list); busy();
      await shareFiles(files, exportName(list));
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
      if (!confirm(`${plural(list.length, 'foto', 'foto\'s')} definitief uit de app verwijderen?`)) return;
      for (const p of list) await deletePhoto(p.id);
      setSelecting(false, true); await loadOverview(); toast('Verwijderd');
    }
  } catch (e) { busy(); alert('Mislukt: ' + e.message); }
}

/* ---------------- exports ---------------- */
async function buildExcel(list) {
  const headers = ['Nr', 'Project', 'Tags', 'Notitie', 'Datum', 'Uur', 'Adres', 'Foto met notitie', 'Foto origineel', 'Bron'];
  const rows = list.map(p => [
    p.nr, p.project, p.tags.join(', '), p.note || '', fmtDate(p.createdAt), fmtTime(p.createdAt),
    p.address || (p.lat != null ? fmtCoords(p.lat, p.lon) : ''),
    fileBase(p) + '.jpg', fileBase(p) + '_origineel.' + extOf({ type: p.origType }), p.source || '',
  ]);
  const blob = await makeXlsx(headers, rows, [6, 20, 16, 50, 11, 7, 34, 34, 38, 12]);
  return new File([blob], exportName(list) + '.xlsx', { type: blob.type });
}
async function buildPdf(list) {
  const imgs = [];
  for (const p of list) imgs.push({ blob: await getBlob(p.id + ':ann'), w: p.annW, h: p.annH });
  const projs = [...new Set(list.map(p => p.project))];
  const times = list.map(p => p.createdAt);
  const from = fmtDate(Math.min(...times)), to = fmtDate(Math.max(...times));
  const title = 'Werfverslag – ' + (projs.length === 1 ? projs[0] : projs.join(', '));
  const sub = `${plural(list.length, 'foto', 'foto\'s')} · ${from === to ? from : from + ' – ' + to} · opgemaakt ${fmtDate(Date.now())}`;
  const blob = await makePdf(title, sub, imgs);
  return new File([blob], exportName(list) + '.pdf', { type: 'application/pdf' });
}
async function buildZip(list) {
  const base = exportName(list);
  const files = [];
  for (const p of list) {
    files.push({ name: `${base}/met_notitie/${fileBase(p)}.jpg`, data: await withMeta(await getBlob(p.id + ':ann'), p) });
    const ob = await getBlob(p.id + ':orig');
    files.push({ name: `${base}/origineel/${fileBase(p)}_origineel.${extOf(ob)}`, data: ob });
  }
  files.push({ name: `${base}/${base}.xlsx`, data: await buildExcel(list) });
  files.push({ name: `${base}/${base}.pdf`, data: await buildPdf(list) });
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
  $('#vwTitle').textContent = `#${p.nr}  ${p.project}`;
  const row = (i, ...c) => el('div', { class: 'row-i' }, ico(i), el('span', {}, ...c));
  $('#vwMeta').replaceChildren(
    row('clock', `${fmtDate(p.createdAt)}  ${fmtTime(p.createdAt)}`),
    row('pin', p.lat != null ? el('a', { href: mapUrl(p), target: '_blank', rel: 'noopener' }, locText(p)) : 'Geen locatie'),
    p.tags.length ? row('tag', p.tags.join(', ')) : null,
    p.note ? el('div', { class: 'note' }, p.note) : null,
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
      await shareFiles(await annFiles([p]), fileBase(p));
    } else if (act === 'save') {
      download((await annFiles([p]))[0]); toast('Opgeslagen in Downloads');
    } else if (act === 'orig') {
      const ob = await getBlob(p.id + ':orig');
      deliverSheet([new File([ob], `${fileBase(p)}_origineel.${extOf(ob)}`, { type: ob.type || 'image/jpeg' })], 'Originele foto');
    } else if (act === 'delete') {
      if (!confirm(`Foto #${p.nr} definitief uit de app verwijderen?`)) return;
      await deletePhoto(p.id); show('Overview'); loadOverview(); toast('Verwijderd');
    }
  } catch (e) { alert('Mislukt: ' + e.message); }
}

/* ---------------- koppelingen ---------------- */
function wire() {
  document.querySelectorAll('i[data-i]').forEach(e => e.replaceWith(ico(e.dataset.i)));
  $('#btnProject').onclick = () => pickProject();
  $('#btnSettings').onclick = openSettings;
  $('#btnGallery').onclick = () => $('#fileGallery').click();
  $('#btnOverview').onclick = openOverview;
  const sh = $('#btnShutter');
  onTapOrHold(sh, () => capture(false), () => capture(true));
  sh.addEventListener('pointerdown', () => setTimeout(() => { if (sh.matches(':active')) sh.classList.add('hold'); }, 350));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => sh.addEventListener(ev, () => sh.classList.remove('hold')));
  $('#fileGallery').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'galerij'); };
  $('#fileCamera').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'camera'); };
  $('#fileImport').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) importAnnotated(fs); };

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
  $('#ovMenu').onclick = overviewMenu;
  $('#ovProject').onchange = e => { S.ovProject = e.target.value; S.selected.clear(); loadOverview(); };
  $('#ovActions').querySelectorAll('button').forEach(b => { b.onclick = () => ovAction(b.dataset.act); });
  $('#vwBack').onclick = () => { show('Overview'); loadOverview(); };
  document.querySelectorAll('[data-vw]').forEach(b => { b.onclick = () => vwAction(b.dataset.vw); });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(true); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopGps(); else startGps();
  });
  window.addEventListener('online', processPending);
}

function init() {
  wire();
  if ('serviceWorker' in navigator) {
    // Nieuwe versie actief geworden? Herladen zodra je niet aan het bewerken bent.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      if (S.screen === 'Editor') S.updateReady = true; else location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  }
  startGps();
  show('Camera');
  if (!S.project) setTimeout(() => pickProject(), 400);
  setTimeout(processPending, 3000);
}
init();
