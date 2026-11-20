'use strict';
/* Fotonotities: foto + notitie + project + locatie + datum, alles lokaal op de gsm. */

const APP_VERSION = '4.9';
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
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/>',
  word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m8.5 12 1.2 5 1.3-3.5 1.3 3.5 1.2-5"/>',
  sort: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
};
function ico(name) {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return t.content.firstChild;
}

const DEFAULT_STATUS = ['NOK', 'ToDo', 'OK', 'Testen'];
// vast project voor algemene foto's/notities die niet bij een project horen (projectnaam komt dan niet op de foto)
const GENERAL = 'Notities Algemeen';
const isGeneral = p => p === GENERAL;
const OLD_TAGS = '["Defect","Opvolgen","OK","Vraag"]';
const S = {
  project: LS.get('project', ''),
  projects: [GENERAL, ...LS.get('projects', []).filter(p => p !== GENERAL)],
  tags: (t => (!t || JSON.stringify(t) === OLD_TAGS ? DEFAULT_STATUS : t))(LS.get('tags', null)),
  autoDl: LS.get('autoDl', 'ann'), // 'off' | 'ann' | 'both'
  pos: null, gpsWatch: null,
  screen: 'Camera',
  ovProject: null, selecting: false, selected: new Set(), list: [],
  people: LS.get('people', []),
  ntView: LS.get('ntView', 'list'), // notities: 'list' of 'tiles' // personen aan wie een notitie toegewezen kan worden (eigenaar)
  ntProject: null, ntStatus: new Set(), ntOwner: new Set(), ovOwner: new Set(),
  ovStatus: new Set(), ovSort: LS.get('ovSort', 'status'), // 'status' | 'date'
  viewId: null,
};
const STATUS_COLORS = { nok: '#ef4444', todo: '#f97316', ok: '#22c55e', testen: '#3b82f6' };
const TAG_COLORS = ['#a855f7', '#14b8a6', '#ec4899', '#64748b', '#84cc16', '#0ea5e9'];
const tagColor = t => STATUS_COLORS[String(t).toLowerCase()] || TAG_COLORS[Math.max(0, S.tags.indexOf(t)) % TAG_COLORS.length];
const PROJECT_YELLOW = '#f5b400'; // projectnaam: het enige gele element
const COLORS = [['#ff3b30', 'Rood'], ['#ff9500', 'Oranje'], ['#ffd60a', 'Geel'], ['#34c759', 'Groen'], ['#0a84ff', 'Blauw'], ['#ffffff', 'Wit'], ['#000000', 'Zwart']];

/* ---------------- opslag (IndexedDB) ---------------- */
let _db;
function dbOpen() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open('werfnotities', 2);
    r.onupgradeneeded = () => {
      const d = r.result, has = n => d.objectStoreNames.contains(n);
      if (!has('photos')) d.createObjectStore('photos', { keyPath: 'id' });
      if (!has('blobs')) d.createObjectStore('blobs');
      if (!has('notes')) d.createObjectStore('notes', { keyPath: 'id' }); // losse notities zonder foto
    };
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
const getAllNotes = async () => rq((await os('notes')).getAll());
const getNote = async id => rq((await os('notes')).get(id));
const putNote = async n => rq((await os('notes', 'readwrite')).put(n));
const deleteNote = async id => rq((await os('notes', 'readwrite')).delete(id));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
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
// foto uit de galerij zonder opnamedatum: datum en uur weglaten
const dateOf = p => (p.noDate ? '' : fmtDate(p.createdAt));
const timeOf = p => (p.noDate ? '' : fmtTime(p.createdAt));
// notitie aangepast: datum en uur van de laatste aanpassing tonen
const tsOf = p => (p.kind === 'note' && p.updatedAt ? p.updatedAt : p.createdAt);
// één nummering per project: foto #5, losse notitie #6°
const nrOf = p => '#' + p.nr + (p.kind === 'note' ? '°' : '');
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
/* anchor: knop waarop getikt werd -> het menu verschijnt als uitklapmenu op die plaats;
   zonder anchor: paneel onderaan (voor de knoppen onderaan het scherm). */
function openSheet(content, onDismiss, anchor) {
  const sh = $('#sheet'), body = $('#sheetBody');
  body.replaceChildren(content);
  sh.classList.toggle('pop', !!anchor);
  body.style.cssText = '';
  sh.classList.remove('hidden');
  popAnchor = anchor || null;
  if (anchor) fitPop();
  sheetClose = onDismiss || null;
  armBack();
}
/* Uitklapvenster altijd zichtbaar houden, ook als het toetsenbord opengaat (scherm wordt dan lager). */
let popAnchor = null;
function fitPop() {
  const sh = $('#sheet'), body = $('#sheetBody');
  if (!popAnchor || sh.classList.contains('hidden') || !sh.classList.contains('pop')) return;
  body.style.top = body.style.bottom = body.style.maxHeight = '';
  placePop(body, popAnchor);
  const vv = window.visualViewport, vh = vv ? vv.height : innerHeight, top0 = vv ? vv.offsetTop : 0;
  const r = body.getBoundingClientRect();
  if (r.bottom > top0 + vh - 8 || r.top < top0 + 8) {
    body.style.bottom = '';
    body.style.maxHeight = Math.round(vh - 16) + 'px';
    const h = Math.min(r.height, vh - 16);
    body.style.top = Math.round(top0 + Math.max(8, Math.min(r.top - top0, vh - h - 8))) + 'px';
  }
}
window.visualViewport?.addEventListener('resize', fitPop);
window.addEventListener('resize', fitPop);
function placePop(body, anchor) {
  const r = anchor.getBoundingClientRect(), vw = innerWidth, vh = window.visualViewport?.height || innerHeight, m = 8;
  const w = Math.min(360, vw - 2 * m);
  body.style.width = w + 'px';
  const cx = r.left + r.width / 2;
  body.style.left = Math.round(Math.min(vw - w - m, Math.max(m, cx < vw / 2 ? r.left : r.right - w))) + 'px';
  const below = vh - r.bottom - m, above = r.top - m;
  if (below >= 260 || below >= above) { body.style.top = Math.round(r.bottom + 6) + 'px'; body.style.maxHeight = Math.round(below - 6) + 'px'; }
  else { body.style.bottom = Math.round(vh - r.top + 6) + 'px'; body.style.maxHeight = Math.round(above - 6) + 'px'; }
}
function closeSheet(dismissed) {
  if ($('#sheet').classList.contains('hidden')) return;
  $('#sheet').classList.add('hidden');
  $('#sheetBody').replaceChildren();
  popAnchor = null;
  if (S.screen === 'Notes') setTimeout(updateComposer, 60);
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
  else if (S.screen === 'Editor') { if (ED.cropMode) setCropMode(false); else editorCancel(); }
  else if (S.screen === 'Viewer') viewerBack();
  else if (S.screen === 'Notes') { if (S.selecting) setSelecting(false); else show('Camera'); }
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
    if (S.screen === 'Notes') loadNotes();
  } finally { geoBusy = false; }
}

/* ---------------- camera: de gewone camera-app van de gsm ---------------- */
async function ensureProject() {
  if (S.project) return true;
  return !!(await pickProject());
}
function capture() {
  if (!S.project) { ensureProject(); return; } // eerst project kiezen, daarna opnieuw tikken
  $('#fileCamera').click();
}
function newDraft(blob, { source, date, lat, lon, name, noDate } = {}) {
  // camera: huidige GPS. Galerij: enkel de locatie uit de foto zelf (anders geen locatie).
  const usePos = source !== 'galerij' && lat == null;
  const p = usePos ? freshPos() : null;
  return {
    id: null, project: S.project, createdAt: date || Date.now(), noDate: !!noDate,
    lat: usePos ? (p?.lat ?? null) : (lat ?? null), lon: usePos ? (p?.lon ?? null) : (lon ?? null), acc: usePos ? (p?.acc ?? null) : null,
    address: null, note: '', tags: [], shapes: [], crop: null, source, origBlob: blob, origName: name || null,
    wantPos: usePos,
  };
}
/* Uit galerij: één foto = bewerken zoals gewoonlijk; meerdere foto's = batch met één gezamenlijke notitie. */
async function galleryFiles(files) {
  if (!files.length) return;
  if (files.length === 1) { importFile(files[0], 'galerij'); return; }
  // foto's die al uit deze app komen (met verborgen info) worden gewoon teruggezet
  const fresh = [], known = [];
  for (const f of files) (await readMeta(f) ? known : fresh).push(f);
  if (known.length) await importAnnotated(known);
  if (!fresh.length) return;
  if (!(await ensureProject())) return;
  batchSheet(fresh);
}
function batchSheet(files) {
  const n = files.length;
  const st = { project: S.project, tags: [], owner: '' };
  const ta = el('textarea', { class: 'nt-edit', rows: 3, placeholder: `Notitie voor alle ${n} foto's (mag leeg blijven)` });
  const opts = el('div', { class: 'tags pop-tags' });
  const render = () => {
    const pb = el('button', { class: 'tag projsel' }, ico('folder'), el('span', {}, st.project), ico('chevronDown'));
    pb.onclick = () => projectPickInline(pb, st.project, p => { st.project = p; render(); });
    opts.replaceChildren(pb,
      inlineSelect(st.tags[0] || '', 'Status', [...S.tags.map(t => ({ key: t, label: t, color: tagColor(t) })), { key: '', label: 'Geen status', color: '#71717a' }],
        v => { st.tags = v ? [v] : []; render(); }),
      ownerSelect(st.owner, v => { st.owner = v; render(); }));
  };
  render();
  const go = el('button', { class: 'primary', style: 'width:100%;margin-top:12px', onclick: async () => {
    closeSheet();
    await batchImport(files, { note: ta.value.trim(), tags: st.tags, owner: st.owner, project: st.project });
  } }, `${n} foto's importeren`);
  openSheet(el('div', {},
    el('h3', {}, `${n} foto's importeren`),
    el('div', { class: 'warn' }, ico('alert'), el('span', {},
      el('b', {}, `Let op: alle ${n} foto's krijgen dezelfde notitie, status en eigenaar.`),
      ' Elke foto krijgt wel een eigen nummer en de datum en locatie uit de foto zelf. Achteraf kun je elke foto apart bewerken.')),
    opts, ta, go,
  ));
}
/* projectkeuze als lijstje binnen een venster */
function projectPickInline(btn, current, onPick) {
  const wrap = btn.parentElement;
  const open = wrap.querySelector('.owner-list.projlist');
  if (open) { open.remove(); return; }
  btn.after(el('div', { class: 'owner-list menu projlist' },
    ...S.projects.map(p => el('button', { class: 'menu-item plain', onclick: () => onPick(p) }, ico('folder'), p, p === current ? ico('check') : null))));
}
async function batchImport(files, { note, tags, owner, project }) {
  let ok = 0, fail = 0, last = null;
  for (let i = 0; i < files.length; i++) {
    busy(`Importeren ${i + 1} / ${files.length}…`);
    const f = files[i];
    let bmp;
    try {
      const ex = await readExif(f);
      const d = newDraft(f, { source: 'galerij', name: f.name, lat: ex.lat, lon: ex.lon, date: ex.date || f.lastModified, noDate: !ex.date });
      Object.assign(d, { project, note, tags: [...tags], owner });
      bmp = await createImageBitmap(f);
      last = await saveDraft(d, bmp); ok++;
      if (S.autoDl !== 'off') { await autoExport(last, f, true); await sleep(400); } // kopie in Downloads, zoals bij één foto
    } catch (e) { console.warn('Batch import mislukt', f.name, e); fail++; }
    finally { bmp?.close?.(); }
  }
  busy();
  addProject(project);
  if (last) S.flashId = last.id;
  toast(`${plural(ok, 'foto', 'foto\'s')} geïmporteerd in ${project}${fail ? ` · ${fail} niet gelukt (bv. HEIC)` : ''}`, ok > 0, 3500);
  if (S.screen === 'Notes') loadNotes(); else refreshCamBar();
}
async function importFile(f, source) {
  if (!f) return;
  if (source === 'galerij' && await readMeta(f)) { await importAnnotated([f]); return; } // al een werfnotitie
  if (!(await ensureProject())) return;
  const ex = source === 'galerij' ? await readExif(f) : {};
  // galerij: datum en locatie van de foto zelf; ontbreekt die info, dan wordt ze weggelaten
  const gal = source === 'galerij';
  openEditor(newDraft(f, { source, name: f.name, lat: ex.lat, lon: ex.lon,
    date: ex.date || (gal ? f.lastModified : Date.now()), noDate: gal && !ex.date }));
}

async function refreshCamBar() {
  $('#projName').textContent = S.project || 'Kies project';
  const mine = (await getAllPhotos()).filter(p => p.project === S.project).sort((a, b) => b.createdAt - a.createdAt);

  // teller op de knop Notities: losse notities + fotonotities van dit project
  const nNotes = (await getAllNotes()).filter(n => n.project === S.project).length + mine.length;
  $('#ntCount').textContent = nNotes || '';
}


/* ---------------- projecten ---------------- */
function addProject(p) {
  S.projects = [GENERAL, ...[p, ...S.projects].filter((x, i, arr) => x !== GENERAL && arr.indexOf(x) === i)];
  LS.set('projects', S.projects);
}
function setProject(p) { S.project = p; LS.set('project', p); addProject(p); refreshCamBar(); }
// een project kiezen in Overzicht of Notities = ook het actieve project op het startscherm en in het andere scherm
function syncProject(v) { if (v && v !== '__all__' && v !== S.project) setProject(v); }
/* Projectnaam wijzigen: ook in alle foto's (de balk onder de foto wordt opnieuw gemaakt). */
async function renameProject(old) {
  if (isGeneral(old)) { toast('"' + GENERAL + '" is een vast project', false); return false; }
  const v = prompt(`Nieuwe naam voor project "${old}":`, old);
  const nu = (v || '').trim();
  if (!nu || nu === old) return false;
  if (isGeneral(nu)) { alert(`"${GENERAL}" is een vaste naam.`); return false; }
  const all = await getAllPhotos(), notes = await getAllNotes();
  if (S.projects.includes(nu) || all.some(p => p.project === nu) || notes.some(n => n.project === nu)) { alert(`Er bestaat al een project "${nu}".`); return false; }
  const mine = all.filter(p => p.project === old);
  busy(`Naam wijzigen (${plural(mine.length, 'foto', 'foto\'s')})…`);
  try {
    for (const p of mine) { p.project = nu; await rerender(p); }
    for (const n of notes.filter(n => n.project === old)) { n.project = nu; await putNote(n); }
  } catch (e) { busy(); alert('Naam wijzigen mislukt: ' + e.message); return false; }
  busy();
  S.projects = S.projects.map(x => (x === old ? nu : x)); LS.set('projects', S.projects);
  if (S.project === old) { S.project = nu; LS.set('project', nu); }
  if (S.ovProject === old) S.ovProject = nu;
  if (S.ovProject === old) S.ovProject = nu;
  refreshCamBar(); if (S.screen === 'Overview') loadOverview(); if (S.screen === 'Notes') loadNotes();
  toast(`Project heet nu "${nu}"`);
  return true;
}
function pickProject(anchor = $('#btnProject')) {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; res(v); };
    const input = el('input', { type: 'text', placeholder: 'Nieuw project', enterkeyhint: 'done', autocapitalize: 'sentences' });
    const choose = p => { setProject(p); closeSheet(); finish(p); };
    const add = () => { const v = input.value.trim(); if (v) choose(v); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    const rows = S.projects.map(p => {
      const row = el('div', { class: 'row' + (p === S.project ? ' on' : '') },
        el('button', { class: 'row-main', onclick: () => choose(p) }, p, p === S.project ? ico('check') : null),
        isGeneral(p) ? el('span', { class: 'row-fixed' }, 'vast') : el('button', { class: 'row-x', 'aria-label': 'Naam wijzigen', onclick: async () => {
          if (!(await renameProject(p))) return;
          closeSheet(); pickProject(anchor).then(finish); // lijst opnieuw tonen met de nieuwe naam
        } }, ico('edit')),
        isGeneral(p) ? null : el('button', { class: 'row-x', 'aria-label': 'Uit lijst halen', onclick: () => {
          if (!confirm(`Project "${p}" uit de lijst verwijderen?\n\nDe foto's van dit project blijven bewaard.`)) return;
          S.projects = S.projects.filter(x => x !== p); LS.set('projects', S.projects); row.remove();
          if (S.project === p) { S.project = ''; LS.set('project', ''); refreshCamBar(); }
        } }, ico('x')));
      return row;
    });
    openSheet(el('div', {},
      el('h3', {}, 'Project'),
      el('div', { class: 'add-row' }, input, el('button', { class: 'primary', onclick: add }, 'Toevoegen')),
      rows.length ? el('div', { class: 'list' }, rows) : el('p', {}, 'Geef je eerste project een naam.'),
      rows.length ? el('p', {}, 'Potlood: naam wijzigen (ook op de foto\'s). Kruisje: enkel uit deze lijst halen; de foto\'s blijven bewaard.') : null,
    ), () => finish(null), anchor);
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
    S.tags = t.length ? [...new Set(t)] : DEFAULT_STATUS; LS.set('tags', S.tags); toast('Statussen bewaard');
  });
  const peopleInput = el('input', { type: 'text', value: S.people.join(', '), placeholder: 'bv. Jan, Els, Aannemer Peeters' });
  peopleInput.addEventListener('change', () => {
    S.people = [...new Set(peopleInput.value.split(',').map(s => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    LS.set('people', S.people); toast('Personen bewaard');
  });
  const storage = el('p', {}, '…');
  openSheet(el('div', {},
    el('h3', {}, 'Instellingen'),
    el('h4', {}, 'Kopie automatisch in Downloads'), dlSeg,
    el('p', {}, 'Na elke foto komt een kopie in de map Downloads, zichtbaar in je galerij.'),
    el('p', {}, 'Vraagt Chrome telkens om te bevestigen? Zet in Chrome → Instellingen → Downloads de optie "Vragen waar bestanden moeten worden opgeslagen" uit.'),
    el('h4', {}, 'Statussen'), tagInput,
    el('p', {}, 'Gescheiden door komma\'s. NOK is rood, ToDo oranje, OK groen en Testen blauw.'),
    el('h4', {}, 'Personen (eigenaar)'), peopleInput,
    el('p', {}, 'Gescheiden door komma\'s. Je kunt ook rechtstreeks een nieuwe persoon toevoegen in de keuzelijst Eigenaar.'),
    el('h4', {}, 'Opslag'), storage,
    el('h4', {}, 'Tips'),
    el('p', {}, 'Tik op de microfoon van je toetsenbord om een notitie in te spreken.'),
    el('p', {}, 'In het overzicht selecteer je foto\'s door lang te drukken. In een geopende foto veeg je naar links of rechts voor de volgende.'),
    el('p', { style: 'color:var(--fg-3);margin-top:18px' }, 'Fotonotities ' + APP_VERSION + ' · Gard&Co'),
  ), null, $('#btnSettings'));
  try {
    const persisted = await navigator.storage?.persisted?.();
    const est = await navigator.storage?.estimate?.();
    const n = (await getAllPhotos()).length;
    storage.textContent = `${plural(n, 'foto', 'foto\'s')} · ${est ? (est.usage / 1048576).toFixed(0) + ' MB' : ''} · ${persisted ? 'beschermd tegen automatisch wissen' : 'nog niet beschermd: installeer de app op je beginscherm'}`;
  } catch { storage.textContent = ''; }
}

/* ---------------- editor ---------------- */
const ED = { draft: null, bmp: null, tool: 'arrow', color: COLORS[0][0], cur: null, fit: null, src: null, dirty: false, returnTo: 'Camera',
  cropMode: false, cropRect: null, cropDrag: null };
const cv = $('#edCanvas');
const FULL = { x: 0, y: 0, w: 1, h: 1 };
const cropOf = d => d.crop || FULL;

async function openEditor(draft, returnTo = 'Camera') {
  try { ED.bmp = await createImageBitmap(draft.origBlob); }
  catch { alert('Deze foto kan niet geopend worden (formaat niet ondersteund, bv. HEIC).'); return; }
  ED.draft = draft; ED.dirty = false; ED.cur = null; ED.returnTo = returnTo;
  setCropMode(false);
  $('#edNote').value = draft.note || '';
  show('Editor');
  renderTags(); updateEdInfo(); setColor(ED.color); layoutCanvas();
  if (draft.lat != null && !draft.address) lookupAddress(draft);
  if (!draft.id) setTimeout(() => $('#edNote').focus(), 80);
}
function updateEdInfo() {
  const d = ED.draft; if (!d) return;
  $('#edTitle').textContent = `${d.nr ? '#' + d.nr + '  ' : ''}${d.project}${d.noDate ? '' : '  ·  ' + fmtDate(d.createdAt) + ' ' + fmtTime(d.createdAt)}`;
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
  const b = ED.bmp;
  // Normaal: enkel het bijgesneden stuk tonen. Bijsnijden: de volledige foto met wat marge voor de hoekgrepen.
  const c = ED.cropMode ? FULL : cropOf(ED.draft);
  ED.src = { x: c.x * b.width, y: c.y * b.height, w: c.w * b.width, h: c.h * b.height };
  const m = ED.cropMode ? 22 * dpr : 0;
  const sc = Math.min((cv.width - 2 * m) / ED.src.w, (cv.height - 2 * m) / ED.src.h);
  const w = ED.src.w * sc, h = ED.src.h * sc;
  ED.fit = { x: (cv.width - w) / 2, y: (cv.height - h) / 2, w, h };
  drawEditor();
}
function drawEditor() {
  if (!ED.bmp || !ED.fit) return;
  const ctx = cv.getContext('2d'), f = ED.fit, s = ED.src;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(ED.bmp, s.x, s.y, s.w, s.h, f.x, f.y, f.w, f.h);
  if (!ED.cropMode) { drawShapes(ctx, ED.cur ? [...ED.draft.shapes, ED.cur] : ED.draft.shapes, f.x, f.y, f.w, f.h); return; }
  // bijsnijden: tekeningen op hun plaats tonen, buiten het kader verduisteren, kader + grepen
  const c = cropOf(ED.draft);
  drawShapes(ctx, ED.draft.shapes, f.x + c.x * f.w, f.y + c.y * f.h, c.w * f.w, c.h * f.h);
  const r = ED.cropRect, rx = f.x + r.x * f.w, ry = f.y + r.y * f.h, rw = r.w * f.w, rh = r.h * f.h;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.rect(0, 0, cv.width, cv.height); ctx.rect(rx, ry, rw, rh); ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = dpr;
  ctx.beginPath();
  for (const k of [1, 2]) { ctx.moveTo(rx + rw * k / 3, ry); ctx.lineTo(rx + rw * k / 3, ry + rh); ctx.moveTo(rx, ry + rh * k / 3); ctx.lineTo(rx + rw, ry + rh * k / 3); }
  ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * dpr; ctx.strokeRect(rx, ry, rw, rh);
  const L = 20 * dpr; ctx.lineWidth = 4 * dpr; ctx.lineCap = 'square';
  ctx.beginPath();
  for (const [px, py, dx, dy] of [[rx, ry, 1, 1], [rx + rw, ry, -1, 1], [rx, ry + rh, 1, -1], [rx + rw, ry + rh, -1, -1]]) {
    ctx.moveTo(px + dx * L, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * L);
  }
  ctx.stroke(); ctx.restore();
}
new ResizeObserver(() => { if (S.screen === 'Editor') layoutCanvas(); }).observe($('#stage'));

function toNorm(e, clamp) {
  const r = cv.getBoundingClientRect(), k = cv.width / r.width, f = ED.fit;
  const x = ((e.clientX - r.left) * k - f.x) / f.w, y = ((e.clientY - r.top) * k - f.y) / f.h;
  if (!clamp && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
}

/* bijsnijden */
function setCropMode(on) {
  ED.cropMode = on; ED.cropDrag = null;
  if (on) { $('#edNote').blur(); ED.cropRect = { ...cropOf(ED.draft) }; closeColorPop(); }
  $('#scrEditor').classList.toggle('cropping', on);
  layoutCanvas();
}
function applyCrop() {
  const d = ED.draft, o = cropOf(d), n = ED.cropRect;
  const same = Math.abs(o.x - n.x) + Math.abs(o.y - n.y) + Math.abs(o.w - n.w) + Math.abs(o.h - n.h) < 1e-4;
  if (!same) {
    // tekeningen omrekenen naar het nieuwe kader
    d.shapes.forEach(s => { s.pts = s.pts.map(([u, v]) => [(o.x + u * o.w - n.x) / n.w, (o.y + v * o.h - n.y) / n.h]); });
    d.crop = n.x < 0.002 && n.y < 0.002 && n.w > 0.996 && n.h > 0.996 ? null : n;
    ED.dirty = true;
  }
  setCropMode(false);
}
function cropDown(e) {
  const r = cv.getBoundingClientRect(), k = cv.width / r.width, f = ED.fit, c = ED.cropRect;
  const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k, tol = 26 * (window.devicePixelRatio || 1);
  const L = f.x + c.x * f.w, R = L + c.w * f.w, T = f.y + c.y * f.h, B = T + c.h * f.h;
  const inY = py > T - tol && py < B + tol, inX = px > L - tol && px < R + tol;
  const edge = { l: inY && Math.abs(px - L) < tol, r: inY && Math.abs(px - R) < tol, t: inX && Math.abs(py - T) < tol, b: inX && Math.abs(py - B) < tol };
  const any = edge.l || edge.r || edge.t || edge.b;
  if (!any && !(px > L && px < R && py > T && py < B)) return;
  cv.setPointerCapture(e.pointerId);
  ED.cropDrag = { edge: any ? edge : null, start: toNorm(e, true), rect: { ...c } };
}
function cropMove(e) {
  const g = ED.cropDrag; if (!g) return;
  const p = toNorm(e, true), dx = p[0] - g.start[0], dy = p[1] - g.start[1], o = g.rect, MIN = 0.08;
  let { x, y, w, h } = o;
  if (!g.edge) {
    x = Math.min(1 - w, Math.max(0, o.x + dx)); y = Math.min(1 - h, Math.max(0, o.y + dy));
  } else {
    let l = o.x, r = o.x + o.w, t = o.y, b = o.y + o.h;
    if (g.edge.l) l = Math.min(r - MIN, Math.max(0, l + dx));
    if (g.edge.r) r = Math.max(l + MIN, Math.min(1, r + dx));
    if (g.edge.t) t = Math.min(b - MIN, Math.max(0, t + dy));
    if (g.edge.b) b = Math.max(t + MIN, Math.min(1, b + dy));
    x = l; y = t; w = r - l; h = b - t;
  }
  ED.cropRect = { x, y, w, h }; drawEditor();
}

cv.addEventListener('pointerdown', e => {
  if (document.activeElement === $('#edNote')) { $('#edNote').blur(); e.preventDefault(); return; } // eerste tik sluit toetsenbord
  closeColorPop();
  if (ED.cropMode) { cropDown(e); return; }
  const p = toNorm(e); if (!p) return;
  cv.setPointerCapture(e.pointerId);
  ED.cur = { type: ED.tool, color: ED.color, pts: ED.tool === 'pen' ? [p] : [p, p] };
  drawEditor();
});
cv.addEventListener('pointermove', e => {
  if (ED.cropMode) { cropMove(e); return; }
  if (!ED.cur) return;
  const p = toNorm(e, true);
  if (ED.cur.type === 'pen') ED.cur.pts.push(p); else ED.cur.pts[1] = p;
  drawEditor();
});
cv.addEventListener('pointerup', () => {
  if (ED.cropMode) { ED.cropDrag = null; return; }
  const s = ED.cur; if (!s) return; ED.cur = null;
  const a = s.pts[0], b = s.pts[s.pts.length - 1];
  const big = s.type === 'pen' ? s.pts.length > 2 : Math.hypot((b[0] - a[0]) * ED.fit.w, (b[1] - a[1]) * ED.fit.h) > 14 * (window.devicePixelRatio || 1);
  if (big) { ED.draft.shapes.push(s); ED.dirty = true; }
  drawEditor();
});
cv.addEventListener('pointercancel', () => { ED.cur = null; ED.cropDrag = null; drawEditor(); });

/* kleurkeuze */
function openColorPop() {
  const pop = $('#colorPop');
  pop.replaceChildren(...COLORS.map(([c, n]) => {
    const b = el('button', { class: 'cp-item' + (c === ED.color ? ' on' : ''), onclick: () => { setColor(c); closeColorPop(); } },
      el('span', { class: 'swatch', style: `--sw:${c}` }), n, c === ED.color ? ico('check') : null);
    b.addEventListener('pointerdown', e => e.preventDefault());
    return b;
  }));
  pop.classList.remove('hidden');
}
function closeColorPop() { $('#colorPop')?.classList.add('hidden'); }

function drawShapes(ctx, shapes, x, y, w, h) {
  const lw = Math.max(2, Math.min(w, h) * 0.011);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
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
/* ---------------- eigenaar (persoon aan wie de notitie/actie is toegewezen) ---------------- */
function addPerson(name) { if (name && !S.people.includes(name)) { S.people = [...S.people, name].sort((a, b) => a.localeCompare(b)); LS.set('people', S.people); } }
function ownerMenu(anchor, current, onPick) {
  const input = el('input', { type: 'text', placeholder: 'Nieuwe persoon', enterkeyhint: 'done', autocapitalize: 'words' });
  const pick = v => { closeSheet(); onPick(v); };
  const add = () => { const v = input.value.trim(); if (!v) return; addPerson(v); pick(v); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Eigenaar'),
    ...S.people.map(p => el('button', { class: 'menu-item plain', onclick: () => pick(p) }, ico('user'), p, p === current ? ico('check') : null)),
    el('button', { class: 'menu-item plain muted', onclick: () => pick('') }, ico('ban'), 'Geen eigenaar', current ? null : ico('check')),
    el('div', { class: 'add-row', style: 'margin-top:8px' }, input, el('button', { class: 'primary', onclick: add }, 'Toevoegen')),
  ), null, anchor);
}
const ownerBtn = (owner, onclick) => {
  const b = el('button', { class: 'tag owner' + (owner ? ' on' : '') }, ico('user'), owner || 'Eigenaar');
  b.addEventListener('pointerdown', e => e.preventDefault()); // toetsenbord open houden
  b.onclick = () => onclick(b);
  return b;
};
/* editor: project, status en eigenaar als uitklaplijsten */
function renderTags() {
  const box = $('#edTags'), d = ED.draft;
  const pb = el('button', { class: 'tag projsel' }, ico('folder'), el('span', {}, d.project), ico('chevronDown'));
  pb.addEventListener('pointerdown', e => e.preventDefault()); // toetsenbord open houden
  pb.onclick = () => editorProjectChange(pb);
  box.replaceChildren(pb,
    statusBtn(d.tags[0] || '', b => statusMenu(b, d.tags[0] || '', v => { d.tags = v ? [v] : []; ED.dirty = true; renderTags(); })),
    ownerBtn(d.owner, b => ownerMenu(b, d.owner, v => { d.owner = v; ED.dirty = true; renderTags(); })));
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
  try {
    const moved = d.id && d.movedFrom != null && d.movedFrom !== d.project;
    if (moved) d.nr = await nextNr(d.project); // nieuw volgnummer in het andere project
    rec = await saveDraft(d, ED.bmp);
    toast(moved ? `Verplaatst naar ${rec.project} als #${rec.nr}` : `#${rec.nr} opgeslagen`, true, 2400);
    S.flashId = rec.id;
  }
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
  ), null, $('#edLoc'));
}
/* Project van de foto wijzigen. Bestaande foto: verplaatsen naar een ander project (krijgt daar een nieuw volgnummer). */
async function editorProjectChange(anchor = $('#edTitle')) {
  const d = ED.draft; if (!d) return;
  if (!d.id) { const p = await pickProject(anchor); if (p && ED.draft) { d.project = p; updateEdInfo(); renderTags(); } return; }
  projectPick(anchor, d.project, p => {
    if (p === d.project) return;
    if (d.movedFrom == null) d.movedFrom = d.project;
    d.project = p; ED.dirty = true;
    updateEdInfo(); renderTags();
    if (p !== d.movedFrom) toast(`Wordt verplaatst naar "${p}" bij opslaan`, true, 2600);
  });
}
/* eenvoudige projectlijst (zonder het actieve project te wijzigen) */
function projectPick(anchor, current, onPick) {
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Project'),
    ...S.projects.map(p => el('button', { class: 'menu-item plain', onclick: () => { closeSheet(); onPick(p); } }, ico('folder'), p, p === current ? ico('check') : null)),
  ), null, anchor);
}

/* ---------------- opslaan + foto met balk renderen ---------------- */
async function nextNr(project) { // foto's en losse notities delen één volgnummer per project
  const all = [...await getAllPhotos(), ...await getAllNotes()];
  return all.filter(p => p.project === project).reduce((m, p) => Math.max(m, p.nr || 0), 0) + 1;
}
/* Eenmalig: losse notities met de oude eigen nummering (N1, N2…) achter de foto's nummeren. */
async function renumberNotesOnce() {
  if (LS.get('nrVersion', 0) >= 1) return;
  const photos = await getAllPhotos(), notes = await getAllNotes();
  const max = {};
  photos.forEach(p => { max[p.project] = Math.max(max[p.project] || 0, p.nr || 0); });
  for (const n of notes.sort((a, b) => a.createdAt - b.createdAt)) {
    max[n.project] = (max[n.project] || 0) + 1;
    if (n.nr !== max[n.project]) { n.nr = max[n.project]; await putNote(n); }
  }
  LS.set('nrVersion', 1);
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
    id: d.id, project: d.project, nr: d.nr, createdAt: d.createdAt, noDate: !!d.noDate, savedAt: Date.now(),
    lat: d.lat, lon: d.lon, acc: d.acc, address: d.address, note: d.note, tags: [...d.tags], owner: d.owner || '', shapes: d.shapes, crop: d.crop || null,
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
  const cr = rec.crop || FULL;
  const sx = cr.x * bmp.width, sy = cr.y * bmp.height, sw = cr.w * bmp.width, sh = cr.h * bmp.height;
  const sc = Math.min(1, MAX / Math.max(sw, sh));
  const W = Math.max(1, Math.round(sw * sc)), IH = Math.max(1, Math.round(sh * sc));
  // tekst evenredig met de breedte: in de PDF (gelijke breedte) even groot voor staande en liggende foto's
  const fs = Math.max(14, Math.round(W * 0.034)), sfs = Math.round(fs * 0.74);
  const pad = Math.round(fs * 0.75), gap = Math.round(fs * 0.45);
  const m = document.createElement('canvas').getContext('2d');
  m.font = FONT(fs);
  const noteLines = rec.note ? wrapText(m, rec.note, W - 2 * pad) : [];
  const hasLoc = !!(rec.address || rec.lat != null);
  const L1 = hasLoc || !rec.noDate ? sfs * 1.45 : 0, L2 = fs * 1.3, LT = rec.tags.length || rec.owner ? fs * 1.2 : 0, LN = fs * 1.32;
  const barH = Math.round(pad + L2 + (LT ? gap + LT : 0) + (noteLines.length ? gap + noteLines.length * LN : 0) + (L1 ? gap * 1.2 + L1 : 0) + pad * 0.7);

  const c = document.createElement('canvas'); c.width = W; c.height = IH + barH;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, W, IH);
  drawShapes(ctx, rec.shapes, 0, 0, W, IH);
  ctx.fillStyle = '#111113'; ctx.fillRect(0, IH, W, barH);
  let y = IH + pad;
  // regel 1: #nr  project (alles wit; bij "Notities Algemeen" enkel het nummer)
  ctx.textBaseline = 'alphabetic';
  let base = y + fs * 0.98;
  ctx.font = FONT(fs, 700); ctx.fillStyle = '#ffffff';
  const nrT = `#${rec.nr}  `, nrW = ctx.measureText(nrT).width;
  ctx.fillText(nrT, pad, base);
  if (!isGeneral(rec.project)) ctx.fillText(ellipsize(ctx, rec.project, W - 2 * pad - nrW), pad + nrW, base);
  y += L2;
  ctx.textBaseline = 'top';
  // status + eigenaar
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
    if (rec.owner) {
      ctx.font = FONT(Math.round(fs * 0.78), 500); ctx.fillStyle = '#d4d4d8';
      ctx.fillText(ellipsize(ctx, '→ ' + rec.owner, W - pad - tx), tx + (rec.tags.length ? fs * 0.1 : 0), y + (fs * 1.15 - fs * 0.78) / 2);
    }
    y += LT;
  }
  // notitie
  if (noteLines.length) {
    y += gap; ctx.font = FONT(fs, 400); ctx.fillStyle = '#f4f4f5';
    for (const l of noteLines) { ctx.fillText(l, pad, y); y += LN; }
  }
  // helemaal onderaan: speld adres ............ datum uur (kleine grijze letters)
  if (L1) {
    y += gap * 1.2;
    ctx.textBaseline = 'alphabetic';
    const grey = '#a1a1aa';
    base = y + sfs * 0.95;
    ctx.font = FONT(sfs, 400); ctx.fillStyle = grey;
    const dt = rec.noDate ? '' : `${fmtDate(rec.createdAt)}  ${fmtTime(rec.createdAt)}`, dtW = ctx.measureText(dt).width;
    ctx.fillText(dt, W - pad - dtW, base);
    if (hasLoc) {
      const ps = sfs * 1.05 / 24;
      ctx.save(); ctx.translate(pad - 4 * ps, base - sfs * 0.9 - 2 * ps); ctx.scale(ps, ps);
      ctx.strokeStyle = grey; ctx.lineWidth = 2.2; ctx.stroke(PIN); ctx.restore();
      const ax = pad + sfs * 1.05;
      ctx.fillText(ellipsize(ctx, locText(rec), W - pad - dtW - fs * 0.8 - ax), ax, base);
    }
  }
  const blob = await toBlob(c, 0.8);
  const tw = 360, th = Math.round(IH * tw / W);
  const tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(c, 0, 0, W, IH, 0, 0, tw, th);
  const thumb = await toBlob(tc, 0.7);
  return { blob, w: W, h: c.height, ih: IH, thumb };
}

/* Eenmalig na een update van de balk-opmaak: alle foto's opnieuw opmaken (op de achtergrond). */
const BAR_VERSION = 4;
async function refreshAllBars() {
  if (LS.get('barVersion', 0) >= BAR_VERSION) return;
  for (const p of await getAllPhotos()) {
    if (S.screen === 'Editor') { setTimeout(refreshAllBars, 15000); return; } // niet storen tijdens bewerken
    try { await rerender(p); } catch (e) { console.warn('Balk vernieuwen mislukt', p.id, e); }
    await sleep(50);
  }
  LS.set('barVersion', BAR_VERSION);
  if (S.screen === 'Overview') loadOverview(); else if (S.screen === 'Notes') loadNotes(); else refreshCamBar();
}

/* ---------------- verborgen info in de JPEG (om later terug te importeren) ---------------- */
const META_TAG = 'WERFNOTITIES:';
/* Kopie voor de galerij/delen: gele stip als herkenning + verborgen info.
   Een geel lipje rechtsboven met het camera-icoon, vast aan de rechterrand, zodat ze ook op de vierkante tegeltjes van de galerij zichtbaar blijft. */
const CAM_BODY = new Path2D('M3 8.5a2 2 0 0 1 2-2h2.4l1.6-2.4h6l1.6 2.4H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
async function exportJpeg(p) {
  const blob = await getBlob(p.id + ':ann');
  let marked = blob;
  try {
    const bmp = await createImageBitmap(blob);
    const W = bmp.width, H = bmp.height, side = Math.min(W, H);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0); bmp.close();
    // geel lipje rechtsboven (in het midden-vierkant), vast aan de rechterrand, met het camera-icoon van de app
    const h = Math.max(16, Math.round(side * 0.06)), w = Math.round(side * 0.1), y = Math.round((H - side) / 2 + side * 0.04);
    ctx.fillStyle = '#ffc107'; ctx.beginPath(); ctx.roundRect(W - w, y, w + h, h, h / 2); ctx.fill();
    const cs = h * 0.72, cx = W - w + h * 0.62, cy = y + h / 2;
    ctx.save(); ctx.translate(cx - cs / 2, cy - cs / 2); ctx.scale(cs / 24, cs / 24);
    ctx.fillStyle = '#141414'; ctx.fill(CAM_BODY);
    ctx.fillStyle = '#ffc107'; ctx.beginPath(); ctx.arc(12, 13, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(12, 13, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();    marked = await toBlob(c, 0.9);
  } catch (e) { console.warn('Stip toevoegen mislukt', e); }
  return withMeta(marked, p);
}
async function withMeta(blob, p) {
  const meta = {
    app: 'werfnotities', v: 1, id: p.id, project: p.project, nr: p.nr, createdAt: p.createdAt, noDate: !!p.noDate,
    lat: p.lat, lon: p.lon, acc: p.acc, address: p.address, note: p.note, tags: p.tags, owner: p.owner || '', source: p.source,
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
        id: meta.id, project: meta.project || 'Geïmporteerd', nr: meta.nr || 0, createdAt: meta.createdAt || f.lastModified, noDate: !!meta.noDate,
        savedAt: Date.now(), lat: meta.lat ?? null, lon: meta.lon ?? null, acc: meta.acc ?? null, address: meta.address || null,
        note: meta.note || '', tags: meta.tags || [], owner: meta.owner || '', shapes: [], source: meta.source || '', origName: f.name, origType: 'image/jpeg',
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
  if (noMeta && !added) alert(parts.join('\n') + '\n\nAlleen foto\'s die met deze app (versie 1.2 of later) zijn opgeslagen of gedeeld, bevatten de info. Via WhatsApp verstuurde foto\'s verliezen die info.');
  else toast(parts.join(' · '), added > 0, 3000);
  if (S.screen === 'Notes') loadNotes(); else refreshCamBar();
}

/* ---------------- overzicht ---------------- */
let gridUrls = [];
// Exports zit nu in Notities (weergave lijst of tegels); oude namen blijven werken
const openOverview = () => openNotes();
const loadOverview = () => loadNotes();
/* ---- status-filter + volgorde (bepaalt ook de volgorde van PDF, Excel, ZIP en delen) ---- */
const statusOf = p => p.tags?.[0] || '';
const statusRank = p => { const t = statusOf(p); if (!t) return 999; const i = S.tags.indexOf(t); return i < 0 ? 900 : i; };
const isNote = p => (p.kind === 'note' ? 1 : 0);
const byNr = (a, b) => a.project.localeCompare(b.project) || isNote(a) - isNote(b) || a.nr - b.nr;
const listOrder = (a, b) => (S.ovSort === 'status' ? statusRank(a) - statusRank(b) || byNr(a, b) : tsOf(b) - tsOf(a));
const ownerOf = p => p.owner || '';
const ownerOk = (set, p) => !set.size || set.has(ownerOf(p));
/* Filtermenu (uitklaplijst) met aanvinkbare opties. opts: [{ key, label, color?, icon? }] */
function multiFilterMenu(anchor, title, opts, items, keyOf, set, reload, allLabel) {
  const cnt = {}; items.forEach(p => { const k = keyOf(p); cnt[k] = (cnt[k] || 0) + 1; });
  const render = () => {
    const row = o => {
      const on = o.key === null ? !set.size : set.has(o.key);
      return el('button', { class: 'menu-item plain' + (o.key === '' ? ' muted' : ''), style: o.color ? `--c:${o.color}` : null, onclick: () => {
        if (o.key === null) set.clear(); else if (set.has(o.key)) set.delete(o.key); else set.add(o.key);
        reload(); render();
      } }, o.color ? el('i') : ico(o.icon || 'checkAll'), o.label,
        el('b', { class: 'menu-n' }, String(o.key === null ? items.length : cnt[o.key] || 0)), on ? ico('check') : null);
    };
    $('#sheetBody').replaceChildren(el('div', { class: 'menu' },
      el('h4', {}, title),
      row({ key: null, label: allLabel }),
      ...opts.map(row),
      el('button', { class: 'primary', style: 'margin-top:8px', onclick: () => closeSheet() }, 'Klaar')));
  };
  openSheet(el('div'), null, anchor);
  render(); fitPop();
  popAnchor = null; // de filterknop wordt hertekend; venster blijft op zijn plaats
}
function sortMenu(anchor, reload) {
  const pick = v => { S.ovSort = v; LS.set('ovSort', v); closeSheet(); reload(); };
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Volgorde'),
    el('button', { class: 'menu-item plain', onclick: () => pick('status') }, ico('sort'), 'Op status (NOK eerst)', S.ovSort === 'status' ? ico('check') : null),
    el('button', { class: 'menu-item plain', onclick: () => pick('date') }, ico('clock'), 'Nieuwste eerst', S.ovSort !== 'status' ? ico('check') : null),
  ), null, anchor);
}
/* Filterbalk: drie uitklaplijsten (volgorde, status, eigenaar). */
function renderFilter(inProj, box = '#ovFilter', set = S.ovStatus, reload = loadOverview, ownerSet = S.ovOwner) {
  const present = new Set(inProj.map(statusOf));
  const stOpts = [...S.tags, ...[...present].filter(s => s && !S.tags.includes(s))].map(t => ({ key: t, label: t, color: tagColor(t) }));
  if (present.has('')) stOpts.push({ key: '', label: 'Geen status', color: '#71717a' });
  const owners = [...new Set([...S.people, ...inProj.map(ownerOf).filter(Boolean)])];
  const owOpts = [...owners.map(o => ({ key: o, label: o, icon: 'user' })), { key: '', label: 'Geen eigenaar', icon: 'ban' }];
  const dd = (cls, icon, label, on, onclick) => {
    const b = el('button', { class: 'fdrop ' + cls + (on ? ' on' : '') }, ico(icon), el('span', {}, label), ico('chevronDown'));
    b.onclick = () => onclick(b);
    return b;
  };
  const stLabel = set.size ? [...set].map(s => s || 'geen').join(', ') : 'Alle statussen';
  const owLabel = ownerSet.size ? [...ownerSet].map(o => o || 'geen').join(', ') : 'Alle eigenaars';
  const stDot = set.size === 1 && [...set][0] ? el('i', { class: 'fdot', style: `--c:${tagColor([...set][0])}` }) : null;
  const stBtn = dd('fstatus', 'tag', stLabel, set.size > 0, b => multiFilterMenu(b, 'Filter op status', stOpts, inProj, statusOf, set, reload, 'Alle statussen'));
  if (stDot) stBtn.firstChild.replaceWith(stDot);
  $(box).replaceChildren(
    dd('fsortdd', 'sort', S.ovSort === 'status' ? 'Op status' : 'Nieuwste', false, b => sortMenu(b, reload)),
    stBtn,
    dd('fownerdd', 'user', owLabel, ownerSet.size > 0, b => multiFilterMenu(b, 'Filter op eigenaar', owOpts, inProj, ownerOf, ownerSet, reload, 'Alle eigenaars')),
  );
}/* Welke filters zijn gebruikt (staat in elke export en mail). */
function filterDesc() {
  const parts = [];
  if (S.ovProject === '__all__') parts.push('alle projecten');
  parts.push(S.ovStatus.size ? 'status ' + [...S.ovStatus].map(s => s || 'geen status').join(', ') : 'alle statussen');
  parts.push(S.ovOwner.size ? 'eigenaar ' + [...S.ovOwner].map(o => o || 'geen eigenaar').join(', ') : 'alle eigenaars');
  if (S.selecting && S.selected.size) parts.push('eigen selectie');
  parts.push(S.ovSort === 'status' ? 'volgorde op status' : 'volgorde op nummer');
  return 'Filter: ' + parts.join(', ');
}

/* ---------------- notitielijst: losse notities zonder foto ---------------- */
const NT = { status: '', owner: '' };
const nextNoteNr = project => nextNr(project); // zelfde volgnummer voor foto's en losse notities
const ntTargetProject = () => (S.ovProject && S.ovProject !== '__all__' ? S.ovProject : S.project);
async function openNotes() {
  S.ovProject = S.project || '__all__'; S.ovStatus.clear(); S.ovOwner.clear(); NT.status = ''; NT.owner = '';
  S.viewReturn = 'Notes';
  setSelecting(false, true);
  $('#ntText').value = '';
  show('Notes');
  await loadNotes();
}
/* Notities: alles van het project (fotonotities + losse notities), als lijst of als tegels. */
let ntUrls = [];
async function loadNotes() {
  const notes = (await getAllNotes()).map(n => ({ ...n, kind: 'note' }));
  const photos = await getAllPhotos();
  const all = [...photos, ...notes];
  const counts = {};
  all.forEach(n => { counts[n.project] = (counts[n.project] || 0) + 1; });
  const projects = [...new Set([...S.projects, ...Object.keys(counts)])];
  const sel = $('#ntProject'); sel.replaceChildren();
  sel.append(el('option', { value: '__all__' }, `Alle projecten (${all.length})`));
  projects.forEach(p => sel.append(el('option', { value: p }, `${p} (${counts[p] || 0})`)));
  if (S.ovProject !== '__all__' && !projects.includes(S.ovProject)) S.ovProject = '__all__';
  sel.value = S.ovProject; syncSelBtn(sel);
  const inProj = all.filter(n => S.ovProject === '__all__' || n.project === S.ovProject);
  renderFilter(inProj, '#ntFilter', S.ovStatus, loadNotes, S.ovOwner);
  S.list = inProj.filter(n => (!S.ovStatus.size || S.ovStatus.has(statusOf(n))) && ownerOk(S.ovOwner, n)).sort(listOrder);
  for (const id of [...S.selected]) if (!S.list.some(p => p.id === id)) S.selected.delete(id);
  renderView();
  renderNoteTags();
  const tp = ntTargetProject();
  $('#ntText').placeholder = tp ? `Nieuwe losse notitie voor ${tp}` : 'Nieuwe losse notitie (kies eerst een project)';
  refreshCamBar();
}
/* weergave: 'list' (lijst) of 'tiles' (tegels zoals vroeger in Exports) */
function renderView() {
  const tiles = S.ntView === 'tiles';
  $('#ntList').classList.toggle('hidden', tiles);
  $('#ntGrid').classList.toggle('hidden', !tiles);
  $('#ntView').replaceChildren(ico(tiles ? 'list' : 'grid'));
  $('#ntView').setAttribute('aria-label', tiles ? 'Lijstweergave' : 'Tegelweergave');
  if (tiles) renderGrid(); else renderList();
  $('#ntEmpty').classList.toggle('hidden', S.list.length > 0);
  updateActions();
}
function renderList() {
  const list = S.list;
  ntUrls.forEach(u => URL.revokeObjectURL(u)); ntUrls = [];
  const box = $('#ntList'); box.replaceChildren();
  box.classList.toggle('selecting', S.selecting);
  for (const n of list) {
    const isPhoto = n.kind !== 'note', st = statusOf(n);
    const row = el('div', { class: 'nt-row' + (isPhoto ? ' is-photo' : ' is-note') + (S.selected.has(n.id) ? ' sel' : ''), 'data-id': n.id });
    // enkel het statuslampje; tikken = status kiezen
    const stBtn = el('button', { class: 'nt-dot' + (st ? '' : ' none'), style: st ? `--c:${tagColor(st)}` : null, 'aria-label': st || 'Status kiezen', title: st || 'Geen status',
      onclick: e => { e.stopPropagation(); if (S.selecting) toggleSel(n.id); else noteStatusMenu(stBtn, n); } });
    const open = () => { if (S.selecting) { toggleSel(n.id); return; } if (isPhoto) openPhotoFromNotes(n.id, list); else editNote(row, n); };
    let lead;
    if (isPhoto) {
      const u = URL.createObjectURL(n.thumb); ntUrls.push(u);
      lead = el('button', { class: 'nt-lead', 'aria-label': 'Foto openen', onclick: open }, el('img', { src: u, alt: '' }), el('span', { class: 'nt-cam' }, ico('camera')));
    } else {
      lead = el('button', { class: 'nt-lead', 'aria-label': 'Notitie bewerken', onclick: open }, ico('list'));
    }
    const text = isPhoto ? n.note : n.text;
    const main = el('div', { class: 'nt-main', onclick: open },
      el('div', { class: 'nt-head' }, stBtn, el('span', { class: 'nt-kind' }, nrOf(n)), n.owner ? el('span', { class: 'nt-owner' }, ico('user'), n.owner) : null),
      text ? el('div', { class: 'nt-text' }, text) : null,
      S.ovProject === '__all__' ? el('div', { class: 'nt-sub' }, el('span', { class: 'nt-proj' }, n.project)) : null);
    row.append(lead, main, el('span', { class: 'chk' }, ico('check')));
    // lang drukken = selecteren
    let t; row.addEventListener('pointerdown', () => { t = setTimeout(() => { navigator.vibrate?.(30); if (!S.selecting) setSelecting(true, true); toggleSel(n.id, true); row._held = true; }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => row.addEventListener(ev, () => clearTimeout(t)));
    row.addEventListener('click', e => { if (row._held) { row._held = false; e.stopPropagation(); e.preventDefault(); } }, true);
    box.append(row);
  }
  flashChanged('#ntList', 'Notes');
}/* Openen vanuit de notitielijst: vegen gaat door de hele lijst (fotonotities én losse notities), terug = notitielijst. */
function openPhotoFromNotes(id, viewList) {
  S.list = viewList; S.viewReturn = 'Notes';
  openViewer(id);
}
/* item uit de viewer-lijst halen en de volgende tonen (of terug als de lijst leeg is) */
function viewerRemove(id) {
  const i = S.list.findIndex(x => x.id === id);
  S.list = S.list.filter(x => x.id !== id);
  const n = S.list[Math.min(i, S.list.length - 1)];
  if (i >= 0 && n) openViewer(n.id); else viewerBack();
}
/* na aanpassen/wissen van een losse notitie: lijst of viewer bijwerken */
async function afterNoteChange(id, deleted) {
  if (S.screen !== 'Viewer') { loadNotes(); return; }
  if (deleted) { viewerRemove(id); return; }
  const i = S.list.findIndex(x => x.id === id), fresh = await getNote(id);
  if (i >= 0 && fresh) S.list[i] = { ...fresh, kind: 'note' };
  openViewer(id);
}
/* Na een aanpassing: in de lijst naar die regel scrollen en ze kort laten oplichten
   (handig als de lijst op status gesorteerd is en de regel daardoor verschuift). */
function flashChanged(box, screen) {
  if (!S.flashId || S.screen !== screen) return;
  const elx = document.querySelector(`${box} [data-id="${S.flashId}"]`);
  S.flashId = null;
  if (!elx) return;
  requestAnimationFrame(() => {
    elx.scrollIntoView({ block: 'center', behavior: 'smooth' });
    elx.classList.remove('flash'); void elx.offsetWidth; elx.classList.add('flash');
    setTimeout(() => elx.classList.remove('flash'), 1800);
  });
}
function viewerBack() {
  if (S.viewReturn === 'Notes') { show('Notes'); loadNotes(); }
  else { show('Notes'); loadNotes(); }
}/* status kiezen in een uitklaplijst (één keuze) */
function statusMenu(anchor, current, onPick) {
  const pick = t => { closeSheet(); onPick(t); };
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Status'),
    ...S.tags.map(t => el('button', { class: 'menu-item', style: `--c:${tagColor(t)}`, onclick: () => pick(t) }, el('i'), t, current === t ? ico('check') : null)),
    el('button', { class: 'menu-item', style: '--c:#71717a', onclick: () => pick('') }, el('i'), 'Geen status', current ? null : ico('check')),
  ), null, anchor);
}
const statusBtn = (status, onclick) => {
  const b = el('button', { class: 'tag stsel' + (status ? ' on' : ''), style: `--c:${status ? tagColor(status) : '#71717a'}` }, status || 'Status', ico('chevronDown'));
  b.addEventListener('pointerdown', e => e.preventDefault()); // toetsenbord open houden
  b.onclick = () => onclick(b);
  return b;
};
function renderNoteTags() {
  const box = $('#ntTags'); box.replaceChildren(
    statusBtn(NT.status, b => statusMenu(b, NT.status, v => { NT.status = v; renderNoteTags(); $('#ntText').focus(); })),
    ownerBtn(NT.owner, b => ownerMenu(b, NT.owner, v => { NT.owner = v; renderNoteTags(); $('#ntText').focus(); })));
  updateComposer();
}
/* status/eigenaar pas tonen als je een notitie begint te typen */
function updateComposer() {
  const t = $('#ntText'), on = document.activeElement === t || !!t.value.trim() || !!NT.status || !!NT.owner || sheetOpen();
  $('#scrNotes').classList.toggle('composing', on);
}
async function addNote() {
  const text = $('#ntText').value.trim();
  if (!text) { $('#ntText').focus(); return; }
  let project = ntTargetProject();
  if (!project) { project = await pickProject($('#ntProject')); if (!project) return; }
  const n = { id: newId(), kind: 'note', project, nr: await nextNoteNr(project), text, tags: NT.status ? [NT.status] : [], owner: NT.owner || '', createdAt: Date.now() };
  await putNote(n);
  addProject(project); S.flashId = n.id;
  $('#ntText').value = ''; NT.status = ''; NT.owner = ''; renderNoteTags();
  toast(`Notitie ${nrOf(n)} toegevoegd`);
  await loadNotes();
}
function noteStatusMenu(anchor, n) {
  const pick = async t => {
    closeSheet();
    if (n.kind !== 'note') { // fotonotitie: status aanpassen en de balk op de foto opnieuw maken
      const p = await getPhoto(n.id); if (!p) return;
      p.tags = t ? [t] : []; busy('Opslaan…');
      try { await rerender(p); } finally { busy(); }
    } else await putNote({ ...n, tags: t ? [t] : [], updatedAt: Date.now() });
    S.flashId = n.id; loadNotes();
  };
  openSheet(el('div', { class: 'menu' },
    ...S.tags.map(t => el('button', { class: 'menu-item', style: `--c:${tagColor(t)}`, onclick: () => pick(t) }, el('i'), t, statusOf(n) === t ? ico('check') : null)),
    el('button', { class: 'menu-item', style: '--c:#71717a', onclick: () => pick('') }, el('i'), 'Geen status', statusOf(n) ? null : ico('check')),
  ), null, anchor);
}
function noteProjectMenu(anchor, n) {
  const pick = async p => {
    closeSheet();
    if (p === n.project) return;
    await putNote({ ...n, project: p, nr: await nextNoteNr(p), updatedAt: Date.now() });
    S.flashId = n.id; loadNotes();
  };
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Project'),
    ...S.projects.map(p => el('button', { class: 'menu-item plain', onclick: () => pick(p) }, p, p === n.project ? ico('check') : null)),
  ), null, anchor);
}
function editNote(anchor, n) {
  const ta = el('textarea', { class: 'nt-edit', rows: 4 }); ta.value = n.text;
  const st = { tags: [...(n.tags || [])], owner: n.owner || '' };
  const projBtn = el('button', { class: 'nt-proj', onclick: () => { closeSheet(); noteProjectMenu(anchor, n); } }, n.project);
  const tagBox = el('div', { class: 'tags pop-tags' });
  const renderPopTags = () => {
    tagBox.replaceChildren(
      inlineSelect(st.tags[0] || '', 'Status', [...S.tags.map(t => ({ key: t, label: t, color: tagColor(t) })), { key: '', label: 'Geen status', color: '#71717a' }],
        v => { st.tags = v ? [v] : []; renderPopTags(); }),
      ownerSelect(st.owner, v => { st.owner = v; renderPopTags(); }));
  };
  renderPopTags();
  openSheet(el('div', {},
    el('div', { class: 'pop-head' },
      el('div', { class: 'pop-title' }, el('b', {}, nrOf({ ...n, kind: 'note' })), projBtn),
      el('button', { class: 'ibtn pop-x', 'aria-label': 'Sluiten', onclick: () => closeSheet(true) }, ico('x'))),
    el('div', { class: 'pop-meta' }, ico('clock'), `${fmtDate(tsOf(n))}  ${fmtTime(tsOf(n))}`, n.updatedAt ? el('span', {}, ' (aangepast)') : null),
    tagBox,
    ta,
    el('div', { class: 'add-row', style: 'margin-top:10px' },
      el('button', { class: 'big danger', style: 'margin:0;flex:1', onclick: async () => {
        if (!confirm(`Notitie #${n.nr}° verwijderen?`)) return;
        await deleteNote(n.id); closeSheet(); toast('Verwijderd'); afterNoteChange(n.id, true);
      } }, ico('trash'), 'Wis'),
      el('button', { class: 'primary', style: 'flex:1', onclick: async () => {
        const t = ta.value.trim(); if (!t) return;
        const { kind, ...rest } = n;
        await putNote({ ...rest, text: t, tags: st.tags, owner: st.owner, updatedAt: Date.now() }); closeSheet(); S.flashId = n.id; afterNoteChange(n.id);
      } }, 'Opslaan')),
  ), null, anchor);
}
/* keuzelijst binnen een uitklapvenster (bv. status in het notitievenster) */
function inlineSelect(current, placeholder, opts, onPick) {
  const wrap = el('span', { class: 'owner-sel' });
  const cur = opts.find(o => o.key === current && o.key);
  const b = el('button', { class: 'tag stsel' + (cur ? ' on' : ''), style: `--c:${cur ? cur.color : '#71717a'}` }, cur ? cur.label : placeholder, ico('chevronDown'));
  b.onclick = () => {
    if (wrap.querySelector('.owner-list')) { wrap.querySelector('.owner-list').remove(); return; }
    wrap.append(el('div', { class: 'owner-list menu' },
      ...opts.map(o => el('button', { class: 'menu-item', style: `--c:${o.color}`, onclick: () => onPick(o.key) }, el('i'), o.label, o.key === current ? ico('check') : null))));
  };
  wrap.append(b);
  return wrap;
}
/* eigenaar kiezen binnen een uitklapvenster: een tweede lijstje direct onder de knop */
function ownerSelect(current, onPick) {
  const wrap = el('span', { class: 'owner-sel' });
  const b = el('button', { class: 'tag owner' + (current ? ' on' : '') }, ico('user'), current || 'Eigenaar', ico('chevronDown'));
  b.onclick = () => {
    if (wrap.querySelector('.owner-list')) { wrap.querySelector('.owner-list').remove(); return; }
    const input = el('input', { type: 'text', placeholder: 'Nieuwe persoon', autocapitalize: 'words' });
    const add = () => { const v = input.value.trim(); if (v) { addPerson(v); onPick(v); } };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    wrap.append(el('div', { class: 'owner-list menu' },
      ...S.people.map(p => el('button', { class: 'menu-item plain', onclick: () => onPick(p) }, ico('user'), p, p === current ? ico('check') : null)),
      el('button', { class: 'menu-item plain muted', onclick: () => onPick('') }, ico('ban'), 'Geen eigenaar'),
      el('div', { class: 'add-row' }, input, el('button', { class: 'primary', onclick: add }, '+'))));
  };
  wrap.append(b);
  return wrap;
}/* Notities die meegaan in de exports: zelfde project en statusfilter als het overzicht.
   Met een eigen selectie van foto's gaan er geen notities mee. */
async function exportNotes() {
  if (S.selecting && S.selected.size) return [];
  return (await getAllNotes()).map(n => ({ ...n, kind: 'note' }))
    .filter(n => (S.ovProject === '__all__' || n.project === S.ovProject) && (!S.ovStatus.size || S.ovStatus.has(statusOf(n))) && ownerOk(S.ovOwner, n));
}
const mergeItems = (photos, notes = []) => [...photos, ...notes].sort(S.ovSort === 'status' ? (a, b) => statusRank(a) - statusRank(b) || byNr(a, b) : byNr);
function renderGrid() {
  gridUrls.forEach(u => URL.revokeObjectURL(u)); gridUrls = [];
  const g = $('#ntGrid'); g.replaceChildren();
  g.classList.toggle('selecting', S.selecting);
  for (const p of S.list) {
    if (p.kind === 'note') { // losse notitie: tekstkaartje, ook selecteerbaar (komt enkel in de tabellen)
      const cell = el('div', { class: 'cell note-cell' + (S.selected.has(p.id) ? ' sel' : ''), 'data-id': p.id },
        el('span', { class: 'nr' }, (S.ovProject === '__all__' ? p.project.slice(0, 12) + '  ' : '') + nrOf(p)),
        p.tags.length ? el('span', { class: 'dots' }, p.tags.map(t => el('i', { style: `background:${tagColor(t)}` }))) : null,
        el('span', { class: 'note-ic' }, ico('list')),
        el('span', { class: 'note-txt' }, p.text || ''),
        p.owner ? el('span', { class: 'note-own' }, '→ ' + p.owner) : null,
        el('span', { class: 'chk' }, ico('check')));
      onTapOrHold(cell, () => {
        if (S.selecting) toggleSel(p.id); else { S.viewReturn = 'Notes'; openViewer(p.id); }
      }, () => { if (!S.selecting) setSelecting(true, true); toggleSel(p.id, true); });
      g.append(cell);
      continue;
    }
    const u = URL.createObjectURL(p.thumb); gridUrls.push(u);
    const cell = el('div', { class: 'cell' + (S.selected.has(p.id) ? ' sel' : ''), 'data-id': p.id },
      el('img', { src: u, alt: '', loading: 'lazy' }),
      el('span', { class: 'nr' }, (S.ovProject === '__all__' ? p.project.slice(0, 12) + '  ' : '') + '#' + p.nr),
      p.tags.length ? el('span', { class: 'dots' }, p.tags.map(t => el('i', { style: `background:${tagColor(t)}` }))) : null,
      el('span', { class: 'cap' }, p.note || `${dateOf(p)} ${timeOf(p)}`),
      el('span', { class: 'chk' }, ico('check')));
    onTapOrHold(cell, () => {
      if (S.selecting) toggleSel(p.id); else { S.viewReturn = 'Notes'; openViewer(p.id); }
    }, () => { if (!S.selecting) setSelecting(true, true); toggleSel(p.id, true); });
    g.append(cell);
  }
  flashChanged('#ntGrid', 'Notes');
}
function toggleSel(id, force) {
  if (force === true || !S.selected.has(id)) S.selected.add(id); else S.selected.delete(id);
  renderView();
}
function setSelecting(on, silent) {
  S.selecting = on; S.selected.clear();
  $('#scrNotes').classList.toggle('selecting', on);
  if (!silent) renderView(); else updateActions();
}
function selectAll() {
  setSelecting(true, true);
  S.list.forEach(p => S.selected.add(p.id));
  renderView();
}
/* knop Selecteer toont het aantal; tijdens selecteren is het "Klaar (3)" */
function updateActions() {
  const b = $('#ntSelect'); if (!b) return;
  const n = S.selected.size;
  b.classList.toggle('on', S.selecting);
  if (S.selecting) b.textContent = n ? `Klaar (${n})` : 'Klaar'; else b.replaceChildren(ico('checkAll'));
  b.setAttribute('aria-label', S.selecting ? 'Klaar met selecteren' : 'Selecteren');
  b.classList.toggle('icon-only', !S.selecting);
}
function targets() {
  const arr = S.selecting && S.selected.size ? S.list.filter(p => S.selected.has(p.id)) : S.list;
  // gesorteerd op status: zelfde volgorde als op het scherm (NOK, ToDo, OK, Testen); anders per nummer
  return S.ovSort === 'status' ? [...arr] : [...arr].sort(byNr);
}
// bestandsnaam: Notities_Projectnaam_datum
function exportName(items) { const pn = projName(items); return `Notities_${isGeneral(pn) ? '' : safe(pn) + '_'}${isoDay(Date.now())}${S.exportTag || ''}`; }
/* Achtervoegsel met de gebruikte filters + uur, zodat elke export een eigen bestandsnaam heeft
   (anders opent Android in Downloads soms een vorige export met dezelfde naam). */
function filterTag() {
  const parts = [];
  if (S.ovStatus.size) parts.push(...[...S.ovStatus].map(s => s || 'zonder-status'));
  if (S.ovOwner.size) parts.push(...[...S.ovOwner].map(o => o || 'zonder-eigenaar'));
  if (S.selecting && S.selected.size) parts.push('selectie');
  const d = new Date();
  return (parts.length ? '_' + parts.map(p => safe(p)).join('-') : '') + '_' + pad2(d.getHours()) + pad2(d.getMinutes());
}
async function annFiles(list) {
  const out = [];
  for (const p of list) out.push(new File([await exportJpeg(p)], fileBase(p) + '.jpg', { type: 'image/jpeg' }));
  return out;
}
/* Export-menu (uitklaplijst onder de knop): zelfde functies als de vroegere pagina Exports */
function exportMenu() {
  const proj = S.ovProject !== '__all__' ? S.ovProject : null;
  const n = S.selecting && S.selected.size ? S.selected.size : 0;
  const what = n ? `selectie (${n})` : 'alles in de lijst';
  const act = a => () => { closeSheet(); ovAction(a); };
  const item2 = (icon, label, desc, fn) => el('button', { class: 'menu-item plain two', onclick: fn }, ico(icon), el('span', { class: 'mi-txt' }, el('b', {}, label), el('small', {}, desc)));
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, `Exporteren · ${what}`),
    item2('share', 'Foto\'s delen / mailen', 'foto\'s met notitie · in de mail ook de notitielijst', act('share')),
    item2('download', 'Foto\'s opslaan', 'foto\'s met notitie in Downloads', act('save')),
    item2('doc', 'PDF delen / mailen', 'tabel met alle notities + foto\'s met notitie', act('pdf')),
    item2('sheet', 'Excel', 'tabel met alle notities · opslaan in Downloads', act('excel')),
    item2('word', 'Word', 'zelfde als PDF, nog aan te passen · opslaan', act('word')),
    item2('archive', 'ZIP met alles', 'originele foto\'s + foto\'s met notitie + Excel + PDF · opslaan', act('zip')),
  ), null, $('#ntExport'));
}
/* ⋮-menu: selecteren, importeren, project */
function moreMenu() {
  const proj = S.ovProject !== '__all__' ? S.ovProject : null;
  const n = S.selecting && S.selected.size ? S.selected.size : 0;
  const item = (icon, label, fn, cls = '') => el('button', { class: 'menu-item plain ' + cls, onclick: () => { closeSheet(); fn(); } }, ico(icon), label);
  openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Meer'),
    item('checkAll', 'Alles selecteren', selectAll),
    n ? item('trash', `Selectie wissen (${n})`, () => ovAction('delete'), 'danger') : null,
    item('upload', 'Foto\'s met notitie importeren', () => $('#fileImport').click()),
    proj && !isGeneral(proj) ? item('edit', 'Projectnaam wijzigen', () => renameProject(proj)) : null,
    proj ? item('lock', `Project "${proj}" afsluiten`, () => closeProject(proj)) : null,
    proj ? null : el('p', {}, 'Kies bovenaan één project om het te hernoemen of af te sluiten.'),
  ), null, $('#ntMore'));
}
async function closeProject(proj) {
  const list = (await getAllPhotos()).filter(p => p.project === proj).sort((a, b) => a.nr - b.nr);
  const notes = (await getAllNotes()).filter(n => n.project === proj).map(n => ({ ...n, kind: 'note' }));
  if (!list.length && !notes.length) return;
  const what = [list.length ? plural(list.length, 'foto', 'foto\'s') : '', notes.length ? plural(notes.length, 'notitie', 'notities') : ''].filter(Boolean).join(' en ');
  busy('ZIP maken…');
  let zip;
  S.exportTag = '_' + pad2(new Date().getHours()) + pad2(new Date().getMinutes());
  try { zip = await buildZip(list, 'Filter: geen (volledig project, project afgesloten)', notes); } catch (e) { busy(); alert('ZIP maken mislukt: ' + e.message); return; }
  busy();
  const delBtn = bigBtn('trash', 'Alles uit de app wissen', async () => {
    if (!confirm(`Alle ${what} van "${proj}" uit de app wissen?\n\nDe ZIP en de kopieën in Downloads blijven bestaan.`)) return;
    closeSheet(); busy('Wissen…');
    for (const p of list) await deletePhoto(p.id);
    for (const n of notes) await deleteNote(n.id);
    busy();
    S.projects = S.projects.filter(x => x !== proj); LS.set('projects', S.projects);
    if (S.project === proj) { S.project = ''; LS.set('project', ''); }
    S.ovProject = '__all__'; setSelecting(false, true); await loadNotes();
    toast(`Project "${proj}" afgesloten`);
  }, 'danger');
  delBtn.disabled = true;
  const saved = () => { delBtn.disabled = false; };
  openSheet(el('div', {},
    el('h3', {}, `Project "${proj}" afsluiten`),
    el('p', {}, `${what} · ZIP met originelen, foto's met notitie, Excel en PDF · ${(zip.size / 1048576).toFixed(1)} MB`),
    el('h4', {}, 'Stap 1 · Bewaar de ZIP'),
    bigBtn('download', 'Opslaan op gsm (Downloads)', () => { download(zip); saved(); }),
    el('p', {}, SHARE_HINT),
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
// Android-browsers laten enkel foto's en PDF delen; ZIP en Excel geven "Permission denied".
const shareableType = f => /^image\//.test(f.type) || f.type === 'application/pdf';
const canShareFiles = files => files.every(shareableType) && !!navigator.share && !!navigator.canShare?.({ files });
const SHARE_HINT = 'Delen via WhatsApp of mail: open de app Bestanden → Downloads, druk lang op het bestand en kies Delen.';
function savedSheet(files, title) {
  downloadMany(files);
  openSheet(el('div', {},
    el('h3', {}, title),
    el('p', {}, `${files.map(f => f.name).join(', ')} staat in de map Downloads.`),
    el('p', {}, SHARE_HINT),
    bigBtn('check', 'OK', () => closeSheet()),
  ));
}
/* Met text: twee keuzes. "Mailen" geeft onderwerp + notities in de tekst mee (Outlook, Gmail);
   "WhatsApp, andere apps" stuurt enkel de bestanden, zonder tekst. */
function shareSheet(files, title, intro, text) {
  if (!files.every(shareableType)) { savedSheet(files, title); return; }
  const groups = [];
  for (let i = 0; i < files.length; i += SHARE_MAX) groups.push(files.slice(i, i + SHARE_MAX));
  const shareable = canShareFiles(groups[0]);
  const mkBtn = (g, i, icon, label, withText) => {
    const b = bigBtn(icon, label, async () => {
      try {
        await navigator.share(shareData(g, title, withText && i === 0 ? text : null));
        b.classList.add('done'); b.firstChild.replaceWith(ico('check'));
        if (groups.length === 1) closeSheet();
      } catch (e) {
        if (e.name === 'AbortError') return;
        closeSheet(); savedSheet(g, 'Delen lukt niet in deze browser');
      }
    });
    return b;
  };
  const part = (g, i) => (groups.length > 1 ? ` (deel ${i + 1}/${groups.length}: ${i * SHARE_MAX + 1}–${i * SHARE_MAX + g.length})` : '');
  const what = files.length === 1 || files.some(f => !/^image\//.test(f.type)) ? '' : ' ' + plural(files.length, 'foto', 'foto\'s');
  const btns = text
    ? [el('h4', {}, 'Mail (met notities in de tekst)'), ...groups.map((g, i) => mkBtn(g, i, 'mail', `Mailen${what}${part(g, i)}`, true)),
       el('h4', {}, 'WhatsApp of andere apps (zonder tekst)'), ...groups.map((g, i) => mkBtn(g, i, 'share', `Delen${what}${part(g, i)}`, false))]
    : groups.map((g, i) => mkBtn(g, i, 'share', `Delen${what} via WhatsApp, mail…${part(g, i)}`, false));
  openSheet(el('div', {},
    el('h3', {}, title),
    intro ? el('p', {}, intro) : null,
    groups.length > 1 && shareable ? el('p', {}, `Android deelt maximaal ${SHARE_MAX} bestanden per keer. Tik de knoppen na elkaar aan.`) : null,
    shareable ? btns : el('p', {}, 'Deze browser kan niet rechtstreeks delen. Sla op en deel daarna vanuit de app Bestanden (map Downloads). Chrome werkt hier het best.'),
    el('h4', {}, 'Bewaren'),
    bigBtn('download', 'Opslaan op gsm (Downloads)', () => { closeSheet(); downloadMany(files); }),
  ));
}const deliverSheet = (files, title, text) => shareSheet(files, title, files.length === 1 ? files[0].name : null, text);
// title wordt in Gmail/Outlook het onderwerp, text de inhoud van de mail
const shareData = (files, title, text) => (text ? { files, title, text } : { files, title });
async function shareFiles(files, title, text) {
  // Met mailtekst: eerst kiezen tussen Mail en WhatsApp/andere. Zonder: rechtstreeks het deelmenu openen.
  if (!text && files.length <= SHARE_MAX && canShareFiles(files)) {
    try { await navigator.share(shareData(files, title, text)); return; }
    catch (e) { if (e.name === 'AbortError') return; } // tik verlopen: deelknop tonen (nieuwe tik)
  }
  shareSheet(files, title, null, text);
}

async function ovAction(act) {
  const sel = targets();
  S.exportTag = filterTag();
  const list = sel.filter(p => p.kind !== 'note'); // foto's
  const notes = sel.filter(p => p.kind === 'note'); // losse notities: enkel in de tabellen
  if (!sel.length) { toast('Niets geselecteerd', false); return; }
  if (['share', 'save'].includes(act) && !list.length) { toast('Geen foto\'s geselecteerd (losse notities zitten enkel in Excel, PDF, Word en ZIP)', false, 3500); return; }
  try {
    if (act === 'share') {
      busy(`${plural(list.length, 'foto', 'foto\'s')} klaarzetten…`); const files = await annFiles(list); busy();
      const items = mergeItems(list, notes);
      const rt = reportTitle(items, filterDesc());
      await shareFiles(files, rt.title, mailBody(items, rt));
    } else if (act === 'save') {
      busy('Voorbereiden…'); const files = await annFiles(list); busy();
      await downloadMany(files);
    } else if (act === 'excel') {
      busy('Excel maken…'); const f = await buildExcel(list, filterDesc(), notes); busy();
      deliverSheet([f], reportTitle(mergeItems(list, notes)).title);
    } else if (act === 'pdf') {
      busy('PDF maken…'); const f = await buildPdf(list, filterDesc(), notes); busy();
      const items = mergeItems(list, notes), rt = reportTitle(items, filterDesc());
      deliverSheet([f], rt.title, mailBody(items, rt));

    } else if (act === 'word') {
      busy('Word maken…'); const f = await buildWord(list, filterDesc(), notes); busy();
      deliverSheet([f], reportTitle(mergeItems(list, notes)).title);
    } else if (act === 'zip') {
      busy('ZIP maken…'); const f = await buildZip(list, filterDesc(), notes); busy();
      deliverSheet([f], 'ZIP met alles');
    } else if (act === 'delete') {
      if (!S.selected.size) return;
      const what = [list.length ? plural(list.length, 'foto', 'foto\'s') : '', notes.length ? plural(notes.length, 'losse notitie', 'losse notities') : ''].filter(Boolean).join(' en ');
      if (!confirm(`${what} definitief uit de app verwijderen?`)) return;
      for (const p of list) await deletePhoto(p.id);
      for (const n of notes) await deleteNote(n.id);
      setSelecting(false, true); await loadNotes(); toast('Verwijderd');
    }
  } catch (e) { busy(); alert('Mislukt: ' + e.message); }
}

/* ---------------- exports ----------------
   list = foto's (in volgorde), notes = losse notities; de tabel bevat beide, de foto-pagina's enkel foto's. */
const projName = items => { const ps = [...new Set(items.map(p => p.project))]; return ps.length === 1 ? ps[0] : 'alle projecten'; };
/* Onderwerp/titel: "Notities Projectnaam datum". sub: aantallen + periode. filter: welke filters gebruikt zijn. */
function reportTitle(items, filter = '') {
  const times = items.filter(p => !p.noDate).map(tsOf);
  const from = times.length ? fmtDate(Math.min(...times)) : '', to = times.length ? fmtDate(Math.max(...times)) : '';
  const nP = items.filter(p => p.kind !== 'note').length, nN = items.length - nP;
  const counts = [nP ? plural(nP, 'fotonotitie', 'fotonotities') : '', nN ? plural(nN, 'losse notitie', 'losse notities') + ' (°)' : ''].filter(Boolean).join(' en ');
  const pn = projName(items), general = isGeneral(pn);
  const title = general ? `Notities ${fmtDate(Date.now())}` : `Notities ${pn} ${fmtDate(Date.now())}`; // Notities Algemeen: projectnaam weglaten
  const sub = [counts, from ? 'periode ' + (from === to ? from : from + ' – ' + to) : ''].filter(Boolean).join(' · ');
  return { title, sub, counts, filter, general, mail: [title, sub, filter].filter(Boolean).join('\n') };
}/* Overzichtstabel in de mail: dezelfde regels als de tabel in de PDF.
   Een browser-app kan enkel platte tekst aan Outlook/Gmail geven, dus één regel per notitie. */
function mailBody(items, rt) {
  // per notitie:  • tekst
  //                    nr | status | eigenaar   (+ project bij "alle projecten")
  const many = new Set(items.map(p => p.project)).size > 1;
  const blocks = items.map(p => {
    const text = (itemText(p) || '').replace(/\s*\n\s*/g, ' / ');
    const meta = [nrOf(p), statusOf(p), ownerOf(p), many ? p.project : ''].filter(Boolean).join(' | '); // leeg = weglaten
    return text ? `• ${text}\n  ${meta}` : `• ${meta}`; // geen tekst: enkel nummer/status/eigenaar
  });
  // mailtekst: titel, lege regel, meteen de lijst (geen aantallen of filters)
  const head = [rt.title, ''];

  return [...head, ...blocks.join('\n\n').split('\n')].join('\n');
}const itemText = p => (p.kind === 'note' ? p.text : p.note) || '';
async function buildExcel(list, note = '', notes = []) {
  const items = mergeItems(list, notes);
  const headers = ['Nr', 'Project', 'Status', 'Eigenaar', 'Notitie', 'Datum', 'Uur', 'Adres', 'Foto met notitie', 'Foto origineel', 'Bron'];
  const { title, sub, filter } = reportTitle(items, note);
  const rows = items.map(p => p.kind === 'note'
    ? [nrOf(p), p.project, p.tags.join(', '), ownerOf(p), itemText(p), fmtDate(tsOf(p)), fmtTime(tsOf(p)), '', '', '', 'notitie']
    : [nrOf(p), p.project, p.tags.join(', '), ownerOf(p), itemText(p), dateOf(p), timeOf(p),
      p.address || (p.lat != null ? fmtCoords(p.lat, p.lon) : ''),
      fileBase(p) + '.jpg', fileBase(p) + '_origineel.' + extOf({ type: p.origType }), p.source || '']);
  const blob = await makeXlsx(headers, rows, [6, 20, 12, 16, 50, 11, 7, 34, 34, 38, 12], [title, sub, filter].filter(Boolean));
  return new File([blob], exportName(items) + '.xlsx', { type: blob.type });
}
/* Oplijsting vooraan in PDF en Word: zoals Excel, tot en met Uur (foto's + losse notities). */
function reportTable(items) {
  return {
    headers: ['Nr', 'Project', 'Status', 'Eigenaar', 'Notitie', 'Datum', 'Uur'],
    widths: [5, 15, 9, 11, 44, 10, 6],
    rows: items.map(p => [
      nrOf(p), p.project,
      p.tags.length ? { t: p.tags.join(', '), c: tagColor(p.tags[0]) } : '',
      ownerOf(p), itemText(p), p.kind === 'note' ? fmtDate(tsOf(p)) : dateOf(p), p.kind === 'note' ? fmtTime(tsOf(p)) : timeOf(p),
    ]),
  };
}
async function reportImages(list) {
  const imgs = [];
  for (const p of list) imgs.push({ blob: await getBlob(p.id + ':ann'), w: p.annW, h: p.annH });
  return imgs;
}
async function buildPdf(list, note = '', notes = []) {
  const items = mergeItems(list, notes);
  const { title, sub, filter } = reportTitle(items, note);
  const blob = await makePdf(title, [sub, filter].filter(Boolean).join('  ·  '), await reportImages(list), reportTable(items));
  return new File([blob], exportName(items) + '.pdf', { type: 'application/pdf' });
}
async function buildWord(list, note = '', notes = []) {
  const items = mergeItems(list, notes);
  const { title, sub, filter } = reportTitle(items, note);
  const blob = await makeDocx(title, [sub, filter].filter(Boolean).join('  ·  '), await reportImages(list), reportTable(items));
  return new File([blob], exportName(items) + '.docx', { type: blob.type });
}
async function buildZip(list, note = '', notes = []) {
  const base = exportName([...list, ...notes]);
  const files = [];
  for (const p of list) {
    files.push({ name: `${base}/met_notitie/${fileBase(p)}.jpg`, data: await exportJpeg(p) });
    const ob = await getBlob(p.id + ':orig');
    files.push({ name: `${base}/origineel/${fileBase(p)}_origineel.${extOf(ob)}`, data: ob });
  }
  files.push({ name: `${base}/${base}.xlsx`, data: await buildExcel(list, note, notes) });
  files.push({ name: `${base}/${base}.pdf`, data: await buildPdf(list, note, notes) });
  const blob = await makeZip(files);
  return new File([blob], base + '.zip', { type: 'application/zip' });
}
/* ---------------- detail ---------------- */
let vwUrl;
/* Losse notitie in de viewer: als kaart getoond, zodat je er ook naartoe kunt vegen. */
async function noteCardBlob(n) {
  const W = 1000, pad = 64, fs = 46, LN = fs * 1.35;
  const m = document.createElement('canvas').getContext('2d'); m.font = FONT(fs);
  const lines = wrapText(m, n.text || '', W - 2 * pad);
  const H = Math.round(Math.max(760, pad * 2 + 250 + lines.length * LN));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#18181b'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  let y = pad + 48;
  ctx.font = FONT(56, 700); ctx.fillStyle = '#fff';
  const nrT = `#${n.nr}°  `, nrW = ctx.measureText(nrT).width; ctx.fillText(nrT, pad, y);
  ctx.fillStyle = PROJECT_YELLOW; ctx.fillText(ellipsize(ctx, n.project, W - 2 * pad - nrW), pad + nrW, y);
  y += 54; ctx.font = FONT(30, 400); ctx.fillStyle = '#a1a1aa';
  ctx.fillText(`${fmtDate(tsOf(n))}  ${fmtTime(tsOf(n))}${n.updatedAt ? '  (aangepast)' : ''}`, pad, y);
  y += 34; ctx.textBaseline = 'top';
  let x = pad; const th = 52, tfs = 30;
  for (const t of n.tags || []) {
    ctx.font = FONT(tfs, 600); const tw = ctx.measureText(t).width + tfs * 1.9;
    ctx.fillStyle = tagColor(t) + '33'; ctx.beginPath(); ctx.roundRect(x, y, tw, th, th / 2); ctx.fill();
    ctx.strokeStyle = tagColor(t); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = tagColor(t); ctx.beginPath(); ctx.arc(x + tfs * 0.75, y + th / 2, tfs * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(t, x + tfs * 1.2, y + (th - tfs) / 2 + 1);
    x += tw + 18;
  }
  if (n.owner) { ctx.font = FONT(34, 500); ctx.fillStyle = '#d4d4d8'; ctx.fillText('→ ' + n.owner, x, y + (th - 34) / 2); }
  y += th + 40;
  ctx.font = FONT(fs, 400); ctx.fillStyle = '#f4f4f5';
  for (const l of lines) { ctx.fillText(l, pad, y); y += LN; }
  return toBlob(c, 0.9);
}
async function openViewer(id, dir = 0) {
  const asNote = S.list.find(x => x.id === id)?.kind === 'note';
  const p = asNote ? await getNote(id) : await getPhoto(id);
  if (!p) { viewerBack(); return; }
  if (asNote) p.kind = 'note';
  S.viewId = id; S.viewNote = asNote ? p : null;
  $('#scrViewer').classList.toggle('is-note', asNote);
  const url = URL.createObjectURL(asNote ? await noteCardBlob(p) : await getBlob(id + ':ann'));
  const img = $('#vwImg');
  await new Promise(res => { img.onload = img.onerror = res; img.src = url; });
  if (vwUrl) URL.revokeObjectURL(vwUrl);
  vwUrl = url;
  resetZoom();
  img.style.transition = 'none';
  img.style.transform = dir ? `translateX(${dir * 40}%)` : '';
  img.style.opacity = dir ? '0' : '';
  if (dir) {
    void img.offsetWidth; // startpositie vastleggen, daarna inschuiven
    img.style.transition = 'transform .22s ease, opacity .22s ease'; img.style.transform = ''; img.style.opacity = '';
  }
  const i = S.list.findIndex(x => x.id === id);
  $('#vwTitle').textContent = `${nrOf(p)}  ${p.project}`;
  $('#vwPos').textContent = i >= 0 && S.list.length > 1 ? `${i + 1} / ${S.list.length}` : '';
  $('#vwPrev').disabled = i <= 0; $('#vwNext').disabled = i < 0 || i >= S.list.length - 1;
  // geen info onder de foto: die staat al in de balk op de foto zelf
  if (S.screen !== 'Viewer') show('Viewer');
}
function viewerStep(d) {
  const i = S.list.findIndex(x => x.id === S.viewId), n = S.list[i + d];
  if (i < 0 || !n) { snapBack(); return false; }
  openViewer(n.id, d);
  return true;
}
function snapBack() {
  const img = $('#vwImg');
  img.style.transition = 'transform .2s ease'; img.style.transform = '';
}
/* Zoomen in de foto: knijpen met twee vingers of dubbeltikken. Ingezoomd: één vinger verschuift.
   Niet ingezoomd: vegen naar links/rechts = vorige/volgende foto. */
const VZ = { s: 1, x: 0, y: 0 };
function resetZoom() { VZ.s = 1; VZ.x = 0; VZ.y = 0; $('.viewer-img').classList.remove('zoomed'); }
function wireSwipe() {
  const box = $('.viewer-img'), img = $('#vwImg');
  const pts = new Map();
  let one = null, pinch = null, lastTap = null;
  const center = () => { const r = box.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const clampPan = () => {
    const mx = Math.max(0, (img.clientWidth * VZ.s - box.clientWidth) / 2), my = Math.max(0, (img.clientHeight * VZ.s - box.clientHeight) / 2);
    VZ.x = Math.min(mx, Math.max(-mx, VZ.x)); VZ.y = Math.min(my, Math.max(-my, VZ.y));
  };
  const apply = anim => {
    img.style.transition = anim ? 'transform .2s ease' : 'none';
    img.style.transform = VZ.s === 1 && !VZ.x && !VZ.y ? '' : `translate(${VZ.x}px, ${VZ.y}px) scale(${VZ.s})`;
    box.classList.toggle('zoomed', VZ.s > 1);
  };
  const zoomAt = (s, mx, my, base = { s: VZ.s, x: VZ.x, y: VZ.y }, m0 = [mx, my]) => {
    // het beeldpunt dat onder m0 lag, komt onder (mx, my) te liggen
    const [cx, cy] = center();
    VZ.s = s;
    VZ.x = (mx - cx) - s * ((m0[0] - cx - base.x) / base.s);
    VZ.y = (my - cy) - s * ((m0[1] - cy - base.y) / base.s);
    if (s <= 1) { VZ.s = 1; VZ.x = 0; VZ.y = 0; }
    clampPan();
  };
  box.addEventListener('pointerdown', e => {
    if (e.target.closest('.vw-nav')) return;
    try { box.setPointerCapture(e.pointerId); } catch { /* niet erg */ }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], base: { ...VZ } };
      if (one?.horiz && VZ.s === 1) snapBack();
      one = null;
    } else if (pts.size === 1) {
      one = { sx: e.clientX, sy: e.clientY, base: { ...VZ }, dx: 0, horiz: null, t: Date.now(), moved: false };
      img.style.transition = 'none';
    }
  });
  box.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      zoomAt(Math.min(5, Math.max(1, pinch.base.s * d / pinch.d)), m[0], m[1], pinch.base, pinch.m);
      apply(false); return;
    }
    if (!one) return;
    const dx = e.clientX - one.sx, dy = e.clientY - one.sy;
    if (Math.hypot(dx, dy) > 10) one.moved = true;
    if (VZ.s > 1) { VZ.x = one.base.x + dx; VZ.y = one.base.y + dy; clampPan(); apply(false); return; }
    one.dx = dx;
    if (one.horiz == null && one.moved) one.horiz = Math.abs(dx) > Math.abs(dy);
    if (one.horiz) img.style.transform = `translateX(${dx}px)`;
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pinch) {
      if (pts.size === 1) { // nog één vinger: verder verschuiven zonder sprong
        const [p] = [...pts.values()];
        one = { sx: p[0], sy: p[1], base: { ...VZ }, dx: 0, horiz: null, t: 0, moved: true };
      }
      if (pts.size < 2) pinch = null;
      if (VZ.s < 1.05) { resetZoom(); apply(true); }
      return;
    }
    const g = one; one = null;
    if (!g || pts.size) return;
    if (!g.moved && Date.now() - g.t < 300) { // dubbeltik: in- of uitzoomen
      const now = Date.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
        if (VZ.s > 1) resetZoom(); else zoomAt(2.5, e.clientX, e.clientY);
        apply(true); lastTap = null; return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      return;
    }
    if (VZ.s > 1) return;
    if (g.horiz && Math.abs(g.dx) > Math.min(90, box.clientWidth * 0.18)) {
      img.style.transition = 'transform .15s ease, opacity .15s ease';
      img.style.transform = `translateX(${g.dx < 0 ? -60 : 60}%)`; img.style.opacity = '0';
      setTimeout(() => { if (!viewerStep(g.dx < 0 ? 1 : -1)) img.style.opacity = ''; }, 140);
    } else snapBack();
  };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}
async function vwAction(act) {
  if (S.viewNote) { // losse notitie
    const n = S.viewNote;
    if (act === 'edit') editNote(document.querySelector('[data-vw="edit"]'), n);
    else if (act === 'share') {
      const title = reportTitle([n]).title;
      const text = [title, '', `1 losse notitie: #${n.nr}°${n.tags.length ? ' · ' + n.tags.join(', ') : ''}${n.owner ? ' · eigenaar ' + n.owner : ''}`, n.text, `${fmtDate(tsOf(n))} ${fmtTime(tsOf(n))}`].join('\n');
      try { await navigator.share({ title, text }); } catch (e) { if (e.name !== 'AbortError') { try { await navigator.clipboard.writeText(text); toast('Tekst gekopieerd'); } catch { alert(text); } } }
    } else if (act === 'delete') {
      if (!confirm(`Notitie #${n.nr}° verwijderen?`)) return;
      await deleteNote(n.id); toast('Verwijderd'); afterNoteChange(n.id, true);
    }
    return;
  }
  const p = await getPhoto(S.viewId); if (!p) return;
  try {
    if (act === 'edit') {
      const ob = await getBlob(p.id + ':orig');
      openEditor({ ...p, tags: [...p.tags], shapes: p.shapes.map(s => ({ ...s, pts: s.pts.map(q => [...q]) })), origBlob: ob, wantPos: false }, 'Viewer');
    } else if (act === 'share') {
      const rt = reportTitle([p]);
      await shareFiles(await annFiles([p]), rt.title, mailBody([p], rt));
    } else if (act === 'save') {
      download((await annFiles([p]))[0]); toast('Opgeslagen in Downloads');
    } else if (act === 'orig') {
      const ob = await getBlob(p.id + ':orig');
      deliverSheet([new File([ob], `${fileBase(p)}_origineel.${extOf(ob)}`, { type: ob.type || 'image/jpeg' })], 'Originele foto');
    } else if (act === 'delete') {
      if (!confirm(`Foto #${p.nr} definitief uit de app verwijderen?`)) return;
      await deletePhoto(p.id); toast('Verwijderd');
      viewerRemove(p.id);
    }
  } catch (e) { alert('Mislukt: ' + e.message); }
}

/* Projectkeuze in Notities/Exports: eigen uitklaplijst direct onder de knop
   (de gewone keuzelijst van Android opent in het midden van het scherm). */
function enhanceSelect(sel) {
  const btn = el('button', { class: 'sel-btn' }, el('span'), ico('chevronDown'));
  sel.after(btn); sel.hidden = true;
  sel.parentElement.querySelector(':scope > .ic')?.remove();
  btn.onclick = () => openSheet(el('div', { class: 'menu' },
    el('h4', {}, 'Project'),
    ...[...sel.options].map(o => el('button', { class: 'menu-item plain' + (o.value === '__all__' ? ' muted' : ''), onclick: () => {
      closeSheet(); if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event('change')); }
    } }, ico(o.value === '__all__' ? 'grid' : 'folder'), o.textContent, o.value === sel.value ? ico('check') : null)),
  ), null, btn);
  sel._btn = btn;
}
function syncSelBtn(sel) { if (sel._btn) sel._btn.firstChild.textContent = sel.selectedOptions[0]?.textContent || ''; }

/* ---------------- koppelingen ---------------- */
function wire() {
  document.querySelectorAll('i[data-i]').forEach(e => e.replaceWith(ico(e.dataset.i)));
  document.querySelectorAll('.select-wrap select').forEach(enhanceSelect);
  $('#btnProject').onclick = () => pickProject();
  $('#btnSettings').onclick = openSettings;
  $('#btnGallery').onclick = () => $('#fileGallery').click();
  $('#btnNotes').onclick = openNotes;
  $('#ntBack').onclick = () => show('Camera');
  $('#ntProject').onchange = e => { S.ovProject = e.target.value; S.ovStatus.clear(); S.selected.clear(); syncProject(e.target.value); loadNotes(); };
  $('#ntAdd').addEventListener('pointerdown', e => e.preventDefault());
  $('#ntAdd').onclick = addNote;
  $('#ntText').addEventListener('focus', updateComposer);
  $('#ntText').addEventListener('pointerdown', () => $('#scrNotes').classList.add('composing')); // meteen tonen bij aantikken
  $('#ntText').addEventListener('input', updateComposer);
  $('#ntText').addEventListener('blur', () => setTimeout(updateComposer, 250));
  $('#btnShutter').onclick = capture;
  $('#fileGallery').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; galleryFiles(fs); };
  $('#fileCamera').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'camera'); };
  $('#fileImport').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) importAnnotated(fs); };

  document.querySelectorAll('.tool[data-tool]').forEach(b => {
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.onclick = () => { ED.tool = b.dataset.tool; document.querySelectorAll('.tool[data-tool]').forEach(x => x.classList.toggle('active', x === b)); };
  });
  $('#edColor').addEventListener('pointerdown', e => e.preventDefault());
  $('#edColor').onclick = () => ($('#colorPop').classList.contains('hidden') ? openColorPop() : closeColorPop());
  $('#edCrop').addEventListener('pointerdown', e => e.preventDefault());
  $('#edCrop').onclick = () => setCropMode(true);
  $('#cropReset').onclick = () => { ED.cropRect = { ...FULL }; drawEditor(); };
  $('#cropCancel').onclick = () => setCropMode(false);
  $('#cropDone').onclick = applyCrop;
  $('#edUndo').addEventListener('pointerdown', e => e.preventDefault());
  $('#edUndo').onclick = () => { if (ED.draft?.shapes.length) { ED.draft.shapes.pop(); ED.dirty = true; drawEditor(); } };
  $('#edSave').addEventListener('pointerdown', e => e.preventDefault());
  $('#edSave').onclick = editorSave;
  $('#edCancel').onclick = editorCancel;
  $('#edLoc').onclick = editorLocationSheet;
  $('#edTitle').onclick = () => editorProjectChange($('#edTitle'));

  $('#ntSelect').onclick = () => setSelecting(!S.selecting);
  $('#ntExport').onclick = exportMenu;
  $('#ntMore').onclick = moreMenu;
  $('#ntView').onclick = () => { S.ntView = S.ntView === 'tiles' ? 'list' : 'tiles'; LS.set('ntView', S.ntView); renderView(); };
  $('#vwBack').onclick = viewerBack;
  document.querySelectorAll('[data-vw]').forEach(b => { b.onclick = () => vwAction(b.dataset.vw); });
  $('#vwPrev').onclick = () => viewerStep(-1);
  $('#vwNext').onclick = () => viewerStep(1);
  wireSwipe();
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
  renumberNotesOnce().catch(e => console.warn('Hernummeren mislukt', e));
  setTimeout(processPending, 3000);
  setTimeout(refreshAllBars, 5000);
}
init();
