'use strict';
/* Werfnotities: foto + notitie + project + locatie + datum, alles lokaal op de gsm. */

const APP_VERSION = '1.7';
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
const OLD_TAGS = '["Defect","Opvolgen","OK","Vraag"]';
const S = {
  project: LS.get('project', ''),
  projects: LS.get('projects', []),
  tags: (t => (!t || JSON.stringify(t) === OLD_TAGS ? DEFAULT_STATUS : t))(LS.get('tags', null)),
  autoDl: LS.get('autoDl', 'ann'), // 'off' | 'ann' | 'both'
  pos: null, gpsWatch: null,
  screen: 'Camera',
  ovProject: null, selecting: false, selected: new Set(), list: [],
  ovStatus: new Set(), ovSort: LS.get('ovSort', 'status'), // 'status' | 'date'
  viewId: null,
};
const STATUS_COLORS = { nok: '#ef4444', todo: '#f97316', ok: '#22c55e', testen: '#3b82f6' };
const TAG_COLORS = ['#a855f7', '#14b8a6', '#ec4899', '#64748b', '#84cc16', '#0ea5e9'];
const tagColor = t => STATUS_COLORS[String(t).toLowerCase()] || TAG_COLORS[Math.max(0, S.tags.indexOf(t)) % TAG_COLORS.length];
const COLORS = [['#ff3b30', 'Rood'], ['#ff9500', 'Oranje'], ['#ffd60a', 'Geel'], ['#34c759', 'Groen'], ['#0a84ff', 'Blauw'], ['#ffffff', 'Wit'], ['#000000', 'Zwart']];

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
  else if (S.screen === 'Editor') { if (ED.cropMode) setCropMode(false); else editorCancel(); }
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
function capture() {
  if (!S.project) { ensureProject(); return; } // eerst project kiezen, daarna opnieuw tikken
  $('#fileCamera').click();
}
function newDraft(blob, { source, date, lat, lon, name } = {}) {
  const usePos = lat == null;
  const p = usePos ? freshPos() : null;
  return {
    id: null, project: S.project, createdAt: date || Date.now(),
    lat: usePos ? (p?.lat ?? null) : lat, lon: usePos ? (p?.lon ?? null) : lon, acc: usePos ? (p?.acc ?? null) : null,
    address: null, note: '', tags: [], shapes: [], crop: null, source, origBlob: blob, origName: name || null,
    wantPos: usePos,
  };
}
async function importFile(f, source) {
  if (!f) return;
  if (source === 'galerij' && await readMeta(f)) { await importAnnotated([f]); return; } // al een werfnotitie
  if (!(await ensureProject())) return;
  const ex = source === 'galerij' ? await readExif(f) : {};
  openEditor(newDraft(f, { source, date: ex.date || (source === 'galerij' ? f.lastModified : Date.now()), lat: ex.lat, lon: ex.lon, name: f.name }));
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
/* Projectnaam wijzigen: ook in alle foto's (de balk onder de foto wordt opnieuw gemaakt). */
async function renameProject(old) {
  const v = prompt(`Nieuwe naam voor project "${old}":`, old);
  const nu = (v || '').trim();
  if (!nu || nu === old) return false;
  const all = await getAllPhotos();
  if (S.projects.includes(nu) || all.some(p => p.project === nu)) { alert(`Er bestaat al een project "${nu}".`); return false; }
  const mine = all.filter(p => p.project === old);
  busy(`Naam wijzigen (${plural(mine.length, 'foto', 'foto\'s')})…`);
  try {
    for (const p of mine) { p.project = nu; await rerender(p); }
  } catch (e) { busy(); alert('Naam wijzigen mislukt: ' + e.message); return false; }
  busy();
  S.projects = S.projects.map(x => (x === old ? nu : x)); LS.set('projects', S.projects);
  if (S.project === old) { S.project = nu; LS.set('project', nu); }
  if (S.ovProject === old) S.ovProject = nu;
  refreshCamBar(); if (S.screen === 'Overview') loadOverview();
  toast(`Project heet nu "${nu}"`);
  return true;
}
function pickProject() {
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
        el('button', { class: 'row-x', 'aria-label': 'Naam wijzigen', onclick: async () => {
          if (!(await renameProject(p))) return;
          closeSheet(); pickProject().then(finish); // lijst opnieuw tonen met de nieuwe naam
        } }, ico('edit')),
        el('button', { class: 'row-x', 'aria-label': 'Uit lijst halen', onclick: () => {
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
    S.tags = t.length ? [...new Set(t)] : DEFAULT_STATUS; LS.set('tags', S.tags); toast('Statussen bewaard');
  });
  const storage = el('p', {}, '…');
  openSheet(el('div', {},
    el('h3', {}, 'Instellingen'),
    el('h4', {}, 'Kopie automatisch in Downloads'), dlSeg,
    el('p', {}, 'Na elke foto komt een kopie in de map Downloads, zichtbaar in je galerij.'),
    el('p', {}, 'Vraagt Chrome telkens om te bevestigen? Zet in Chrome → Instellingen → Downloads de optie "Vragen waar bestanden moeten worden opgeslagen" uit.'),
    el('h4', {}, 'Statussen'), tagInput,
    el('p', {}, 'Gescheiden door komma\'s. NOK is rood, ToDo oranje, OK groen en Testen blauw.'),
    el('h4', {}, 'Opslag'), storage,
    el('h4', {}, 'Tips'),
    el('p', {}, 'Tik op de microfoon van je toetsenbord om een notitie in te spreken.'),
    el('p', {}, 'In het overzicht selecteer je foto\'s door lang te drukken. In een geopende foto veeg je naar links of rechts voor de volgende.'),
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
function renderTags() {
  const box = $('#edTags'); box.replaceChildren();
  for (const t of S.tags) {
    const on = ED.draft.tags.includes(t);
    const b = el('button', { class: 'tag' + (on ? ' on' : ''), style: `--c:${tagColor(t)}` }, t);
    b.addEventListener('pointerdown', e => e.preventDefault()); // toetsenbord open houden
    b.addEventListener('click', () => { // één status per foto; nogmaals tikken = geen status
      ED.draft.tags = ED.draft.tags.includes(t) ? [] : [t];
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
    lat: d.lat, lon: d.lon, acc: d.acc, address: d.address, note: d.note, tags: [...d.tags], shapes: d.shapes, crop: d.crop || null,
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
  const L1 = sfs * 1.45, L2 = fs * 1.3, LT = rec.tags.length ? fs * 1.2 : 0, LN = fs * 1.32;
  const barH = Math.round(pad + L1 + L2 + (LT ? gap + LT : 0) + (noteLines.length ? gap + noteLines.length * LN : 0) + pad * 0.8);

  const c = document.createElement('canvas'); c.width = W; c.height = IH + barH;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, W, IH);
  drawShapes(ctx, rec.shapes, 0, 0, W, IH);
  ctx.fillStyle = '#111113'; ctx.fillRect(0, IH, W, barH);
  let y = IH + pad;
  // regel 1: speld adres ............ datum uur  (kleine grijze letters)
  ctx.textBaseline = 'alphabetic';
  const grey = '#a1a1aa';
  let base = y + sfs * 0.95;
  ctx.font = FONT(sfs, 400); ctx.fillStyle = grey;
  const dt = `${fmtDate(rec.createdAt)}  ${fmtTime(rec.createdAt)}`, dtW = ctx.measureText(dt).width;
  ctx.fillText(dt, W - pad - dtW, base);
  const ps = sfs * 1.05 / 24;
  ctx.save(); ctx.translate(pad - 4 * ps, base - sfs * 0.9 - 2 * ps); ctx.scale(ps, ps);
  ctx.strokeStyle = grey; ctx.lineWidth = 2.2; ctx.stroke(PIN); ctx.restore();
  const ax = pad + sfs * 1.05;
  ctx.fillText(ellipsize(ctx, locText(rec), W - pad - dtW - fs * 0.8 - ax), ax, base);
  y += L1;
  // regel 2: #nr  project
  base = y + fs * 0.98;
  ctx.font = FONT(fs, 700); ctx.fillStyle = '#ffffff';
  ctx.fillText(ellipsize(ctx, `#${rec.nr}  ${rec.project}`, W - 2 * pad), pad, base);
  y += L2;
  ctx.textBaseline = 'top';
  // status
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
  S.ovProject = S.project || '__all__'; S.ovStatus.clear();
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
  const inProj = all.filter(p => S.ovProject === '__all__' || p.project === S.ovProject);
  renderFilter(inProj);
  S.list = inProj.filter(p => !S.ovStatus.size || S.ovStatus.has(statusOf(p))).sort(listOrder);
  for (const id of [...S.selected]) if (!S.list.some(p => p.id === id)) S.selected.delete(id);
  renderGrid();
}
/* ---- status-filter + volgorde (bepaalt ook de volgorde van PDF, Excel, ZIP en delen) ---- */
const statusOf = p => p.tags?.[0] || '';
const statusRank = p => { const t = statusOf(p); if (!t) return 999; const i = S.tags.indexOf(t); return i < 0 ? 900 : i; };
const byNr = (a, b) => a.project.localeCompare(b.project) || a.nr - b.nr;
const listOrder = (a, b) => (S.ovSort === 'status' ? statusRank(a) - statusRank(b) || byNr(a, b) : b.createdAt - a.createdAt);
function renderFilter(inProj) {
  const cnt = {}; inProj.forEach(p => { const s = statusOf(p); cnt[s] = (cnt[s] || 0) + 1; });
  const extra = Object.keys(cnt).filter(s => s && !S.tags.includes(s));
  const chip = (key, label, color) => {
    const on = key === null ? !S.ovStatus.size : S.ovStatus.has(key);
    const n = key === null ? inProj.length : cnt[key] || 0;
    return el('button', { class: 'fchip' + (on ? ' on' : '') + (n ? '' : ' zero'), style: color ? `--c:${color}` : null, onclick: () => {
      if (key === null) S.ovStatus.clear();
      else if (S.ovStatus.has(key)) S.ovStatus.delete(key); else S.ovStatus.add(key);
      loadOverview();
    } }, color ? el('i') : null, label, el('b', {}, String(n)));
  };
  $('#ovFilter').replaceChildren(
    el('button', { class: 'fsort', onclick: () => { S.ovSort = S.ovSort === 'status' ? 'date' : 'status'; LS.set('ovSort', S.ovSort); loadOverview(); } },
      ico('sort'), S.ovSort === 'status' ? 'Status' : 'Nieuwste'),
    chip(null, 'Alle'),
    ...[...S.tags, ...extra].map(t => chip(t, t, tagColor(t))),
    cnt[''] ? chip('', 'Geen status', '#71717a') : null,
  );
}
const filterNote = () => (S.ovStatus.size ? 'filter: ' + [...S.ovStatus].map(s => s || 'geen status').join(', ') : '');
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
  // gesorteerd op status: zelfde volgorde als op het scherm (NOK, ToDo, OK, Testen); anders per nummer
  return S.ovSort === 'status' ? [...arr] : [...arr].sort(byNr);
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
    proj ? bigBtn('edit', 'Projectnaam wijzigen', () => { closeSheet(); renameProject(proj); }) : null,
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
    el('p', {}, `${plural(list.length, 'foto', 'foto\'s')} · ZIP met originelen, foto's met notitie, Excel en PDF · ${(zip.size / 1048576).toFixed(1)} MB`),
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
function shareSheet(files, title, intro) {
  if (!files.every(shareableType)) { savedSheet(files, title); return; }
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
        if (e.name === 'AbortError') return;
        closeSheet(); savedSheet(g, 'Delen lukt niet in deze browser');
      }
    });
    return b;
  });
  openSheet(el('div', {},
    el('h3', {}, title),
    intro ? el('p', {}, intro) : null,
    groups.length > 1 && shareable ? el('p', {}, `Android deelt maximaal ${SHARE_MAX} bestanden per keer. Tik de knoppen na elkaar aan.`) : null,
    shareable ? btns : el('p', {}, 'Deze browser kan niet rechtstreeks delen. Sla op en deel daarna vanuit de app Bestanden (map Downloads). Chrome werkt hier het best.'),
    bigBtn('download', 'Opslaan op gsm (Downloads)', () => { closeSheet(); downloadMany(files); }),
  ));
}
const deliverSheet = (files, title) => shareSheet(files, title, files.length === 1 ? files[0].name : null);
async function shareFiles(files, title) {
  // Rechtstreeks het deelmenu openen als het kan; anders (te veel bestanden, tik verlopen) via het keuzemenu.
  if (files.length <= SHARE_MAX && canShareFiles(files)) {
    try { await navigator.share({ files, title }); return; }
    catch (e) { if (e.name === 'AbortError') return; } // tik verlopen: deelknop tonen (nieuwe tik)
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
      busy('Excel maken…'); const f = await buildExcel(list, filterNote()); busy();
      deliverSheet([f], 'Excel-export');
    } else if (act === 'pdf') {
      busy('PDF maken…'); const f = await buildPdf(list, filterNote()); busy();
      deliverSheet([f], 'PDF-verslag');
    } else if (act === 'zip') {
      busy('ZIP maken…'); const f = await buildZip(list, filterNote()); busy();
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
function reportTitle(list, note = '') {
  const projs = [...new Set(list.map(p => p.project))];
  const times = list.map(p => p.createdAt);
  const from = fmtDate(Math.min(...times)), to = fmtDate(Math.max(...times));
  return {
    title: 'Verslag – ' + (projs.length === 1 ? projs[0] : projs.join(', ')),
    sub: `${plural(list.length, 'foto', 'foto\'s')} · ${from === to ? from : from + ' – ' + to} · opgemaakt ${fmtDate(Date.now())}${note ? ' · ' + note : ''}`,
  };
}
async function buildExcel(list, note = '') {
  const headers = ['Nr', 'Project', 'Status', 'Notitie', 'Datum', 'Uur', 'Adres', 'Foto met notitie', 'Foto origineel', 'Bron'];
  const { title, sub } = reportTitle(list, note);
  const rows = list.map(p => [
    p.nr, p.project, p.tags.join(', '), p.note || '', fmtDate(p.createdAt), fmtTime(p.createdAt),
    p.address || (p.lat != null ? fmtCoords(p.lat, p.lon) : ''),
    fileBase(p) + '.jpg', fileBase(p) + '_origineel.' + extOf({ type: p.origType }), p.source || '',
  ]);
  const blob = await makeXlsx(headers, rows, [6, 20, 12, 50, 11, 7, 34, 34, 38, 12], [title, sub]);
  return new File([blob], exportName(list) + '.xlsx', { type: blob.type });
}
async function buildPdf(list, note = '') {
  const imgs = [];
  for (const p of list) imgs.push({ blob: await getBlob(p.id + ':ann'), w: p.annW, h: p.annH });
  const { title, sub } = reportTitle(list, note);
  const blob = await makePdf(title, sub, imgs);
  return new File([blob], exportName(list) + '.pdf', { type: 'application/pdf' });
}
async function buildZip(list, note = '') {
  const base = exportName(list);
  const files = [];
  for (const p of list) {
    files.push({ name: `${base}/met_notitie/${fileBase(p)}.jpg`, data: await withMeta(await getBlob(p.id + ':ann'), p) });
    const ob = await getBlob(p.id + ':orig');
    files.push({ name: `${base}/origineel/${fileBase(p)}_origineel.${extOf(ob)}`, data: ob });
  }
  files.push({ name: `${base}/${base}.xlsx`, data: await buildExcel(list, note) });
  files.push({ name: `${base}/${base}.pdf`, data: await buildPdf(list, note) });
  const blob = await makeZip(files);
  return new File([blob], base + '.zip', { type: 'application/zip' });
}

/* ---------------- detail ---------------- */
let vwUrl;
async function openViewer(id, dir = 0) {
  const p = await getPhoto(id);
  if (!p) { show('Overview'); loadOverview(); return; }
  S.viewId = id;
  const url = URL.createObjectURL(await getBlob(id + ':ann'));
  const img = $('#vwImg');
  await new Promise(res => { img.onload = img.onerror = res; img.src = url; });
  if (vwUrl) URL.revokeObjectURL(vwUrl);
  vwUrl = url;
  img.style.transition = 'none';
  img.style.transform = dir ? `translateX(${dir * 40}%)` : '';
  img.style.opacity = dir ? '0' : '';
  if (dir) {
    void img.offsetWidth; // startpositie vastleggen, daarna inschuiven
    img.style.transition = 'transform .22s ease, opacity .22s ease'; img.style.transform = ''; img.style.opacity = '';
  }
  const i = S.list.findIndex(x => x.id === id);
  $('#vwTitle').textContent = `#${p.nr}  ${p.project}`;
  $('#vwPos').textContent = i >= 0 && S.list.length > 1 ? `${i + 1} / ${S.list.length}` : '';
  $('#vwPrev').disabled = i <= 0; $('#vwNext').disabled = i < 0 || i >= S.list.length - 1;
  const row = (i, ...c) => el('div', { class: 'row-i' }, ico(i), el('span', {}, ...c));
  $('#vwMeta').replaceChildren(...[
    row('clock', `${fmtDate(p.createdAt)}  ${fmtTime(p.createdAt)}`),
    row('pin', p.lat != null ? el('a', { href: mapUrl(p), target: '_blank', rel: 'noopener' }, locText(p)) : 'Geen locatie'),
    p.tags.length ? row('tag', ...p.tags.map(t => el('span', { class: 'st', style: `--c:${tagColor(t)}` }, t))) : null,
    p.note ? el('div', { class: 'note' }, p.note) : null,
  ].filter(Boolean));
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
function wireSwipe() {
  const box = $('.viewer-img'), img = $('#vwImg');
  let sx = null, sy = 0, dx = 0, horiz = null;
  box.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; dx = 0; horiz = null; img.style.transition = 'none'; });
  box.addEventListener('pointermove', e => {
    if (sx == null) return;
    dx = e.clientX - sx;
    if (horiz == null && Math.hypot(dx, e.clientY - sy) > 10) horiz = Math.abs(dx) > Math.abs(e.clientY - sy);
    if (horiz) img.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    if (sx == null) return; sx = null;
    if (horiz && Math.abs(dx) > Math.min(90, box.clientWidth * 0.18)) {
      img.style.transition = 'transform .15s ease, opacity .15s ease';
      img.style.transform = `translateX(${dx < 0 ? -60 : 60}%)`; img.style.opacity = '0';
      setTimeout(() => { if (!viewerStep(dx < 0 ? 1 : -1)) img.style.opacity = ''; }, 140);
    } else snapBack();
  };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
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
      const i = S.list.findIndex(x => x.id === p.id);
      await deletePhoto(p.id); toast('Verwijderd');
      S.list = S.list.filter(x => x.id !== p.id);
      const n = S.list[Math.min(i, S.list.length - 1)];
      if (i >= 0 && n) openViewer(n.id); else { show('Overview'); loadOverview(); }
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
  $('#btnShutter').onclick = capture;
  $('#fileGallery').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importFile(f, 'galerij'); };
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
  $('#edTitle').onclick = editorProjectChange;

  $('#ovBack').onclick = () => show('Camera');
  $('#ovSelect').onclick = () => setSelecting(!S.selecting);
  $('#ovMenu').onclick = overviewMenu;
  $('#ovProject').onchange = e => { S.ovProject = e.target.value; S.ovStatus.clear(); S.selected.clear(); loadOverview(); };
  $('#ovActions').querySelectorAll('button').forEach(b => { b.onclick = () => ovAction(b.dataset.act); });
  $('#vwBack').onclick = () => { show('Overview'); loadOverview(); };
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
  setTimeout(processPending, 3000);
}
init();
