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

/* Tekstbreedte meten (Helvetica ~ Arial) en tekst afbreken voor de PDF-tabel. */
const _mctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
function pdfMeasure(t, size, bold) { _mctx.font = `${bold ? 'bold ' : ''}${size}px Helvetica, Arial, sans-serif`; return _mctx.measureText(t).width; }
function pdfWrap(text, maxW, size, bold) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const t = line ? line + ' ' + word : word;
      if (pdfMeasure(t, size, bold) <= maxW) { line = t; continue; }
      if (line) out.push(line);
      let w = word;
      while (pdfMeasure(w, size, bold) > maxW && w.length > 1) {
        let i = w.length; while (i > 1 && pdfMeasure(w.slice(0, i), size, bold) > maxW) i--;
        out.push(w.slice(0, i)); w = w.slice(i);
      }
      line = w;
    }
    out.push(line);
  }
  return out.length ? out : [''];
}
const pdfRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(v => v.toFixed(3)).join(' '); };
const pdfCircle = (cx, cy, r) => {
  const k = r * 0.5523;
  return `${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c `
    + `${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f\n`;
};

/* images: [{blob (JPEG), w, h}]
   table (optioneel): {headers: [..], widths: [relatief], rows: [[tekst | {t, c: '#kleur'}]]} -> eerst een oplijsting */
async function makePdf(title, subtitle, images, table) {
  const chunks = []; let len = 0; const offsets = [];
  const push = x => { const b = typeof x === 'string' ? latin1(x) : x; chunks.push(b); len += b.length; };
  // A4 liggend
  const W = 842, H = 595, M = 30;
  const top = H - M - 43, bottom = M + 16;
  let next = 5;
  const pages = [];

  // ---- tabelpagina's opmaken ----
  const FS = 8.5, LH = 11, PAD = 4, HEAD_H = 18;
  let tw = [];
  if (table && table.rows.length) {
    const tot = table.widths.reduce((a, b) => a + b, 0);
    tw = table.widths.map(w => w / tot * (W - 2 * M));
    let cur = null, y = 0;
    for (const row of table.rows) {
      const lines = row.map((cell, i) => {
        const isObj = cell && typeof cell === 'object';
        return pdfWrap(isObj ? cell.t : cell, tw[i] - 2 * PAD - (isObj && cell.c ? 9 : 0), FS, false);
      });
      const h = Math.max(...lines.map(l => l.length)) * LH + 2 * PAD;
      if (!cur || y - h < bottom) { cur = { obj: next++, content: next++, imgs: [], rows: [] }; pages.push(cur); y = top - HEAD_H; }
      cur.rows.push({ row, lines, h, y }); y -= h;
    }
  }
  // ---- fotopagina's: 3 vakken naast elkaar van gelijke breedte ----
  const perPage = 3;
  for (let i = 0; i < images.length; i += perPage) {
    const pg = { obj: next++, content: next++, imgs: [] };
    for (const im of images.slice(i, i + perPage)) pg.imgs.push({ ...im, obj: next++ });
    pages.push(pg);
  }
  if (!pages.length) pages.push({ obj: next++, content: next++, imgs: [] });
  const total = next - 1;
  const obj = (n, ...body) => { offsets[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n'); };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map(p => p.obj + ' 0 R').join(' ')}] /Count ${pages.length} >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const txt = (font, size, x, y, t) => `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfStr(t)}) Tj ET\n`;
  for (let p = 0; p < pages.length; p++) {
    const pg = pages[p];
    let s = '0 0 0 rg 0 0 0 RG\n';
    s += txt('F2', 14, M, H - M - 12, title);
    s += txt('F1', 9, M, H - M - 25, subtitle);
    s += `0.3 w ${M} ${H - M - 33} m ${W - M} ${H - M - 33} l S\n`;
    if (pg.rows) {
      // kopregel
      s += `0.247 0.247 0.275 rg ${M} ${top - HEAD_H} ${W - 2 * M} ${HEAD_H} re f\n1 1 1 rg\n`;
      let x = M;
      table.headers.forEach((h, i) => { s += txt('F2', FS, x + PAD, top - HEAD_H + 6, h); x += tw[i]; });
      pg.rows.forEach((r, ri) => {
        if (ri % 2) s += `0.965 0.965 0.97 rg ${M} ${(r.y - r.h).toFixed(2)} ${W - 2 * M} ${r.h.toFixed(2)} re f\n`;
        s += `0.85 0.85 0.87 RG 0.4 w ${M} ${(r.y - r.h).toFixed(2)} m ${W - M} ${(r.y - r.h).toFixed(2)} l S\n`;
        let cx = M;
        r.row.forEach((cell, i) => {
          let tx = cx + PAD;
          if (cell && typeof cell === 'object' && cell.c) { s += `${pdfRgb(cell.c)} rg ` + pdfCircle(tx + 2.8, r.y - PAD - FS * 0.42, 2.8); tx += 9; }
          s += '0.1 0.1 0.12 rg\n';
          r.lines[i].forEach((l, li) => { if (l) s += txt('F1', FS, tx, r.y - PAD - FS * 0.8 - li * LH, l); });
          cx += tw[i];
        });
      });
      s += '0 0 0 rg\n';
    }
    const gap = 14, cellW = (W - 2 * M - (perPage - 1) * gap) / perPage, cellH = top - bottom;
    pg.imgs.forEach((im, i) => {
      const sc = Math.min(cellW / im.w, cellH / im.h);
      const dw = im.w * sc, dh = im.h * sc;
      const x = M + i * (cellW + gap) + (cellW - dw) / 2;
      s += `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${(top - dh).toFixed(2)} cm /Im${i} Do Q\n`;
    });
    s += txt('F1', 8, W - M - 60, M, `Pagina ${p + 1} / ${pages.length}`);
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

/* ---------- Word (.docx): zelfde opbouw als de PDF ----------
   A4 liggend, titel + subtitel in de koptekst (elke pagina), paginanummer in de voettekst,
   eerst de tabel (kopregel herhaalt), daarna per pagina 3 foto's naast elkaar. */
async function makeDocx(title, subtitle, images, table) {
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const PW = 16838, PH = 11906, ML = 600, MT = 1500, MB = 750;
  const UW = PW - 2 * ML;
  const run = (t, { b, sz = 17, color } = {}) => String(t ?? '').split('\n').map((part, i) =>
    `<w:r><w:rPr>${b ? '<w:b/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:sz w:val="${sz}"/></w:rPr>${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEsc(part)}</w:t></w:r>`).join('');
  const para = (runs, ppr = '') => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${ppr}</w:pPr>${runs}</w:p>`;
  let body = '';

  // tabel
  if (table && table.rows.length) {
    const tot = table.widths.reduce((a, b) => a + b, 0);
    const tw = table.widths.map(w => Math.round(w / tot * UW));
    const cell = (i, content, shade) => `<w:tc><w:tcPr><w:tcW w:w="${tw[i]}" w:type="dxa"/>${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}</w:tcPr>${para(content)}</w:tc>`;
    const border = '<w:top w:val="single" w:sz="4" w:color="D9D9DE"/><w:bottom w:val="single" w:sz="4" w:color="D9D9DE"/><w:insideH w:val="single" w:sz="4" w:color="D9D9DE"/>';
    body += `<w:tbl><w:tblPr><w:tblW w:w="${UW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${tw.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
    body += `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${table.headers.map((h, i) => cell(i, run(h, { b: true, color: 'FFFFFF' }), '3F3F46')).join('')}</w:tr>`;
    table.rows.forEach((row, ri) => {
      body += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map((c, i) => {
        const isObj = c && typeof c === 'object';
        const content = isObj ? (c.c ? run('● ', { color: c.c.slice(1).toUpperCase() }) : '') + run(c.t) : run(c);
        return cell(i, content, ri % 2 ? 'F6F6F8' : null);
      }).join('')}</w:tr>`;
    });
    body += '</w:tbl>';
  }

  // foto's: 3 per pagina
  const media = [];
  const colW = Math.floor(UW / 3), padX = 140;
  const maxW = colW - 2 * padX, maxH = PH - MT - MB - 300;
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  for (let g = 0; g < images.length; g += 3) {
    if (body) body += pageBreak;
    const cells = [];
    for (let k = 0; k < 3; k++) {
      const im = images[g + k];
      if (!im) { cells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`); continue; }
      const n = media.length + 1, rid = 'rIdImg' + n;
      media.push({ name: `image${n}.jpeg`, rid, blob: im.blob });
      const sc = Math.min(maxW / im.w, maxH / im.h);
      const cx = Math.round(im.w * sc * 635), cy = Math.round(im.h * sc * 635);
      const pic = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Foto ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
      cells.push(`<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>${para(pic, '<w:jc w:val="center"/>')}</w:tc>`);
    }
    body += `<w:tbl><w:tblPr><w:tblW w:w="${colW * 3}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="${padX}" w:type="dxa"/><w:right w:w="${padX}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${'<w:gridCol w:w="' + colW + '"/>'.repeat(3)}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr></w:tbl>`;
  }
  body += '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';

  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="${PW}" w:h="${PH}" w:orient="landscape"/><w:pgMar w:top="${MT}" w:right="${ML}" w:bottom="${MB}" w:left="${ML}" w:header="560" w:footer="380" w:gutter="0"/></w:sectPr>`;
  const doc = `${head}<w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
  const hdr = `${head}<w:hdr ${NS}>${para(run(title, { b: true, sz: 28 }))}${para(run(subtitle, { sz: 18 }), '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="000000"/></w:pBdr>')}</w:hdr>`;
  const fld = c => `<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> ${c} </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
  const ftr = `${head}<w:ftr ${NS}>${para(run('Pagina ', { sz: 16 }) + fld('PAGE') + run(' / ', { sz: 16 }) + fld('NUMPAGES'), '<w:jc w:val="right"/>')}</w:ftr>`;
  const styles = `${head}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="17"/><w:lang w:val="nl-BE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const types = `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;
  const RT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rels = `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSty" Type="${RT}/styles" Target="styles.xml"/><Relationship Id="rIdHdr" Type="${RT}/header" Target="header1.xml"/><Relationship Id="rIdFtr" Type="${RT}/footer" Target="footer1.xml"/>${media.map(m => `<Relationship Id="${m.rid}" Type="${RT}/image" Target="media/${m.name}"/>`).join('')}</Relationships>`;
  return makeZip([
    { name: '[Content_Types].xml', data: types },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: doc },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/header1.xml', data: hdr },
    { name: 'word/footer1.xml', data: ftr },
    ...media.map(m => ({ name: 'word/media/' + m.name, data: m.blob })),
  ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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
