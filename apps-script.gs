// Google Apps Script: guarda las sesiones de la prueba en una hoja de cálculo.
// 1) Cambia CLAVE por una palabra tuya (la pedirá la página de resultados).
// 2) Implementar > Nueva implementación > Aplicación web > Ejecutar como: yo > Acceso: cualquier persona.
const CLAVE = 'cambia-esta-clave';
const COLS = ['sid', 'pid', 'name', 'start', 'last', 'tasks', 'ua', 'w', 'h', 'events'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('sesiones');
  if (!sh) { sh = ss.insertSheet('sesiones'); sh.appendRow(COLS); }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = hoja_();
    const row = COLS.map((c) => c === 'tasks' ? (d.tasks || []).join(',') : c === 'events' ? JSON.stringify(d.events || []).slice(0, 49000) : (d[c] == null ? '' : d[c]));
    const hit = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).createTextFinder(String(d.sid)).matchEntireCell(true).findNext();
    if (hit) sh.getRange(hit.getRow(), 1, 1, COLS.length).setValues([row]); else sh.appendRow(row);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  const out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  if ((e.parameter.k || '') !== CLAVE) return out.setContent(JSON.stringify({ error: 'clave' }));
  const v = hoja_().getDataRange().getValues(); v.shift();
  return out.setContent(JSON.stringify(v.map((r) => { const o = {}; COLS.forEach((c, i) => { o[c] = r[i]; }); return o; })));
}
