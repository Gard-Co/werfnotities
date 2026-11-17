'use strict';
/* Kleine hulpbibliotheek zonder externe afhankelijkheden (werkt offline):
   ZIP, Excel (.xlsx), PDF en EXIF lezen. */

/* ---------- ZIP (zonder compressie, JPEG's comprimeren toch niet) ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

async function makeZip(files, mime = 'application/zip') {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  for (const f of files) {
    let data = f.data;
    if (typeof data === 'string') data = enc.encode(data);
    else if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true); // UTF-8 bestandsnamen
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true);
    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: mime });
}

/* ---------- Excel (.xlsx) ---------- */
function xmlEsc(s) {
  return String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
function colName(i) {
  let s = ''; i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
/* rows: array van arrays. Waarde mag string, number of {f: formule, v: tekst} zijn. */
async function makeXlsx(headers, rows, colWidths, titleLines = []) {
  const T = titleLines.length ? titleLines.length + 1 : 0; // titelregels + lege regel boven de tabel
  const cell = (v, r, c, style) => {
    const ref = colName(c) + (r + 1);
    const s = style ? ` s="${style}"` : '';
    if (v === '' || v == null) return '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    if (typeof v === 'object' && v.f) return `<c r="${ref}" t="str"${s}><f>${xmlEsc(v.f)}</f><v>${xmlEsc(v.v)}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  };
  let sd = titleLines.map((t, i) => `<row r="${i + 1}"${i === 0 ? ' ht="24" customHeight="1"' : ''}>${cell(t, i, 0, i === 0 ? 4 : 5)}</row>`).join('');
  sd += `<row r="${T + 1}">` + headers.map((h, c) => cell(h, T, c, 1)).join('') + '</row>';
  rows.forEach((row, ri) => {
    sd += `<row r="${T + ri + 2}">` + row.map((v, c) => cell(v, T + ri + 1, c, typeof v === 'object' && v ? 3 : 2)).join('') + '</row>';
  });
  const cols = '<cols>' + colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
  const firstRef = 'A' + (T + 1), lastRef = colName(headers.length - 1) + (T + rows.length + 1);
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const sheet = `${head}<worksheet xmlns="${NS}" xmlns:r="${RNS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${T + 1}" topLeftCell="A${T + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sd}</sheetData><autoFilter ref="${firstRef}:${lastRef}"/></worksheet>`;
  const absRef = '$A$' + (T + 1) + ':$' + colName(headers.length - 1) + '$' + (T + rows.length + 1);
  const workbook = `${head}<workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets><sheet name="Notities" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Notities!${absRef}</definedName></definedNames></workbook>`;
  const styles = `${head}<styleSheet xmlns="${NS}"><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3F3F46"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const types = `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rels = `${head}<Relationships xmlns="${PNS}"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wbRels = `${head}<Relationships xmlns="${PNS}"><Relationship Id="rId1" Type="${RNS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RNS}/styles" Target="styles.xml"/></Relationships>`;
  return makeZip([
    { name: '[Content_Types].xml', data: types },
    { name: '_rels/.rels', data: rels },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/styles.xml', data: styles },
    { name: 'xl/worksheets/sheet1.xml', data: sheet },
  ], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- PDF (A4, 2 foto's per pagina) ---------- */
const WINANSI = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };
function latin1(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], c = str.charCodeAt(i);
    out[i] = c < 256 ? c : (WINANSI[ch] ?? 63);
  }
  return out;
}
const pdfStr = s => String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[\r\n]+/g, ' ');

/* images: [{blob (JPEG), w, h}] */
async function makePdf(title, subtitle, images) {
  const chunks = []; let len = 0; const offsets = [];
  const push = x => { const b = typeof x === 'string' ? latin1(x) : x; chunks.push(b); len += b.length; };
  const perPage = 2;
  const pageCount = Math.max(1, Math.ceil(images.length / perPage));
  let next = 5;
  const pages = [];
  for (let p = 0; p < pageCount; p++) {
    const pg = { obj: next++, content: next++, imgs: [] };
    for (let i = p * perPage; i < Math.min(images.length, (p + 1) * perPage); i++) pg.imgs.push({ ...images[i], obj: next++ });
    pages.push(pg);
  }
  const total = next - 1;
  const obj = (n, ...body) => { offsets[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n'); };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map(p => p.obj + ' 0 R').join(' ')}] /Count ${pages.length} >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const W = 595, H = 842, M = 36;
  for (let p = 0; p < pages.length; p++) {
    const pg = pages[p];
    let s = '';
    s += `BT /F2 15 Tf ${M} ${H - M - 14} Td (${pdfStr(title)}) Tj ET\n`;
    s += `BT /F1 9 Tf ${M} ${H - M - 28} Td (${pdfStr(subtitle)}) Tj ET\n`;
    s += `0.3 w ${M} ${H - M - 36} m ${W - M} ${H - M - 36} l S\n`;
    const top = H - M - 46, bottom = M + 18, gap = 14;
    const slotH = (top - bottom - gap) / 2;
    pg.imgs.forEach((im, i) => {
      const maxW = W - 2 * M;
      const sc = Math.min(maxW / im.w, slotH / im.h);
      const dw = im.w * sc, dh = im.h * sc;
      const x = M + (maxW - dw) / 2;
      const y = top - i * (slotH + gap) - dh;
      s += `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${i} Do Q\n`;
    });
    s += `BT /F1 8 Tf ${W - M - 60} ${M} Td (Pagina ${p + 1} / ${pages.length}) Tj ET\n`;
    const xo = pg.imgs.map((im, i) => `/Im${i} ${im.obj} 0 R`).join(' ');
    obj(pg.obj, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${pg.content} 0 R >>`);
    const cb = latin1(s);
    obj(pg.content, `<< /Length ${cb.length} >>\nstream\n`, cb, '\nendstream');
    for (const im of pg.imgs) {
      const data = new Uint8Array(await im.blob.arrayBuffer());
      obj(im.obj, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`, data, '\nendstream');
    }
  }
  const xref = len;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= total; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

/* ---------- EXIF: opnamedatum en GPS uit een JPEG halen ---------- */
async function readExif(file) {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return {};
    let o = 2;
    while (o < v.byteLength - 10) {
      const marker = v.getUint16(o);
      if ((marker & 0xFF00) !== 0xFF00) break;
      const size = v.getUint16(o + 2);
      if (marker === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return parseTiff(v, o + 10);
      o += 2 + size;
    }
  } catch (e) { /* geen of kapotte EXIF */ }
  return {};
}
function parseTiff(v, t) {
  const le = v.getUint16(t) === 0x4949;
  const u16 = o => v.getUint16(o, le), u32 = o => v.getUint32(o, le);
  const readIfd = off => {
    const tags = {}; const n = u16(t + off);
    for (let i = 0; i < n; i++) { const e = t + off + 2 + i * 12; tags[u16(e)] = { count: u32(e + 4), valOff: e + 8 }; }
    return tags;
  };
  const str = tg => {
    if (!tg) return null;
    const off = tg.count > 4 ? t + u32(tg.valOff) : tg.valOff;
    let s = ''; for (let i = 0; i < tg.count - 1; i++) s += String.fromCharCode(v.getUint8(off + i));
    return s;
  };
  const rats = tg => {
    if (!tg) return null;
    const off = t + u32(tg.valOff); const a = [];
    for (let i = 0; i < tg.count; i++) { const d = u32(off + i * 8 + 4); a.push(d ? u32(off + i * 8) / d : 0); }
    return a;
  };
  const out = {};
  const ifd0 = readIfd(u32(t + 4));
  if (ifd0[0x8769]) {
    const ex = readIfd(u32(ifd0[0x8769].valOff));
    const d = str(ex[0x9003]) || str(ifd0[0x0132]);
    const m = d && d.match(/(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/);
    if (m) out.date = new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  }
  if (ifd0[0x8825]) {
    const g = readIfd(u32(ifd0[0x8825].valOff));
    const la = rats(g[2]), lo = rats(g[4]);
    if (la && lo && la.length === 3 && lo.length === 3) {
      let lat = la[0] + la[1] / 60 + la[2] / 3600, lon = lo[0] + lo[1] / 60 + lo[2] / 3600;
      if (str(g[1]) === 'S') lat = -lat;
      if (str(g[3]) === 'W') lon = -lon;
      if (lat || lon) { out.lat = lat; out.lon = lon; }
    }
  }
  return out;
}
