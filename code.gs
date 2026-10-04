/**
 * Survei Bolpoin - Google Apps Script
 * Tempel kode ini di Extensions > Apps Script pada spreadsheet kamu.
 * Sheet "Survey Bolpoin" dibuat otomatis saat jawaban pertama masuk.
 */

const SHEET_NAME = 'Survey Bolpoin';
const HEADERS = [
  'Timestamp', 'Nama', 'Status', 'Merek', 'Tipe Tinta', 'Ukuran Mata Pena',
  'Frekuensi', 'Harga Wajar', 'Rating', 'Faktor Penting', 'Saran'
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Cegah teks yang dianggap rumus oleh spreadsheet
function clean_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max || 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);

    const rating = Number(d.rating);
    const wajib = [d.nama, d.status, d.merek, d.tinta, d.ukuran, d.frekuensi, d.harga];
    if (wajib.some(function (v) { return !String(v || '').trim(); }) ||
        !(rating >= 1 && rating <= 5)) {
      return json_({ ok: false, error: 'Data belum lengkap' });
    }

    getSheet_().appendRow([
      new Date(),
      clean_(d.nama, 60),
      clean_(d.status),
      clean_(d.merek),
      clean_(d.tinta),
      clean_(d.ukuran),
      clean_(d.frekuensi),
      clean_(d.harga),
      rating,
      clean_(d.faktor, 300),
      clean_(d.saran, 500)
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet(e) {
  try {
    const sh = getSheet_();
    const last = sh.getLastRow();
    const merek = {};
    const tinta = {};
    let total = 0;
    let sum = 0;

    if (last > 1) {
      const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
      rows.forEach(function (r) {
        total++;
        merek[r[3]] = (merek[r[3]] || 0) + 1;
        tinta[r[4]] = (tinta[r[4]] || 0) + 1;
        sum += Number(r[8]) || 0;
      });
    }

    return json_({
      ok: true,
      total: total,
      rating: total ? sum / total : 0,
      merek: merek,
      tinta: tinta
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
