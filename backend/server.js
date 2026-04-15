// Backend Cloud Run para Test de Orientación Profesional IES Luis Bueno Crespo
// - Firestore para el stock de premios y los códigos canjeados (atómico vía runTransaction)
// - Google Sheets para el log de escaneos y los resultados del test
// - Contraseña del profesor en Secret Manager (env var TEACHER_PASSWORD)

const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');

const FAMILIES = ['admin', 'comercio', 'obra', 'electro', 'textil'];
const PRIZE_TYPES = [1, 2, 3];

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '';
const SHEET_ID = process.env.SHEET_ID || '';

const db = new Firestore();
const STOCK_DOC = db.collection('lbc_orientacion').doc('stock');
const SCANS_COL = db.collection('lbc_orientacion_scans');

const app = express();
app.use(express.text({ type: '*/*', limit: '100kb' }));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'lbc-orientacion', version: 1 });
});

app.post(['/', '/api'], async (req, res) => {
  let body = {};
  try {
    body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : (req.body || {});
  } catch (err) {
    return res.json({ ok: false, error: 'body inválido: ' + err.message });
  }
  try {
    const action = body.action || '';
    let result;
    switch (action) {
      case 'login':         result = await actionLogin(body); break;
      case 'getStock':      result = await actionGetStock(body); break;
      case 'updatePrize':   result = await actionUpdatePrize(body); break;
      case 'redeem':        result = await actionRedeem(body); break;
      case 'submitResults': result = await actionSubmitResults(body); break;
      default:              result = { ok: false, error: 'accion desconocida: ' + action };
    }
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: String((err && err.message) || err) });
  }
});

/* ───── auth ───── */

function checkAuth(body) {
  if (!TEACHER_PASSWORD) throw new Error('TEACHER_PASSWORD no configurada en el servidor');
  if (!body.password || body.password !== TEACHER_PASSWORD) throw new Error('unauthorized');
}

/* ───── stock ───── */

function defaultStockFamily() {
  return {
    names: ['Premio tipo 1', 'Premio tipo 2', 'Premio tipo 3'],
    counts: [10, 5, 2],
  };
}

function mergeDefaults(data) {
  const out = { ...data };
  for (const f of FAMILIES) {
    if (!out[f] || !Array.isArray(out[f].names) || !Array.isArray(out[f].counts)) {
      out[f] = defaultStockFamily();
    }
  }
  return out;
}

async function readStock() {
  const snap = await STOCK_DOC.get();
  const raw = snap.exists ? snap.data() : {};
  const merged = mergeDefaults(raw);
  if (!snap.exists) {
    await STOCK_DOC.set(merged);
  }
  return merged;
}

/* ───── actions ───── */

async function actionLogin(body) {
  checkAuth(body);
  if (!FAMILIES.includes(body.family)) return { ok: false, error: 'familia no válida' };
  const stock = await readStock();
  return { ok: true, family: body.family, stock };
}

async function actionGetStock(body) {
  checkAuth(body);
  return { ok: true, stock: await readStock() };
}

async function actionUpdatePrize(body) {
  checkAuth(body);
  const f = body.family;
  if (!FAMILIES.includes(f)) return { ok: false, error: 'familia no válida' };
  const idx = parseInt(body.index, 10);
  if (isNaN(idx) || idx < 0 || idx > 2) return { ok: false, error: 'índice no válido' };

  const stock = await db.runTransaction(async (tx) => {
    const snap = await tx.get(STOCK_DOC);
    const data = mergeDefaults(snap.exists ? snap.data() : {});
    if (body.name !== undefined) {
      const n = String(body.name).slice(0, 80).trim();
      data[f].names[idx] = n || ('Premio tipo ' + (idx + 1));
    }
    if (body.count !== undefined) {
      data[f].counts[idx] = Math.max(0, parseInt(body.count, 10) || 0);
    }
    tx.set(STOCK_DOC, data);
    return data;
  });
  return { ok: true, stock };
}

async function actionRedeem(body) {
  checkAuth(body);
  const f = body.family;
  if (!FAMILIES.includes(f)) return { ok: false, error: 'familia no válida' };
  const pt = parseInt(body.prizeType, 10);
  if (!PRIZE_TYPES.includes(pt)) return { ok: false, error: 'tipo de premio no válido' };
  const idx = pt - 1;
  const code = String(body.code || '').trim();
  if (!code) return { ok: false, error: 'código vacío' };

  const scanRef = SCANS_COL.doc(code);

  const result = await db.runTransaction(async (tx) => {
    const [stockSnap, scanSnap] = await Promise.all([tx.get(STOCK_DOC), tx.get(scanRef)]);
    const data = mergeDefaults(stockSnap.exists ? stockSnap.data() : {});
    const prizeName = data[f].names[idx];

    if (scanSnap.exists) {
      return {
        alreadyRedeemed: true,
        previousScan: scanSnap.data(),
        stock: data,
        prizeName,
        prizeType: pt,
      };
    }
    if (data[f].counts[idx] <= 0) {
      return {
        noStock: true,
        stock: data,
        prizeName,
        prizeType: pt,
      };
    }
    data[f].counts[idx] -= 1;
    const scanDoc = {
      family: f,
      prizeType: pt,
      studentName: body.studentName || '',
      date: new Date().toISOString(),
    };
    tx.set(STOCK_DOC, data);
    tx.set(scanRef, scanDoc);
    return {
      redeemed: true,
      stock: data,
      prizeName,
      prizeType: pt,
      remaining: data[f].counts[idx],
    };
  });

  if (result.redeemed) {
    // log best-effort fuera de la transacción
    appendScanLog(body, result.prizeName).catch((e) => console.log('sheet log error:', e.message));
  }

  return { ok: true, ...result };
}

async function actionSubmitResults(body) {
  // endpoint público, no requiere auth — sólo escribe en la Sheet
  try {
    if (!SHEET_ID) return { ok: true, note: 'sin hoja configurada' };
    const sheets = await getSheets();
    await ensureSheet(sheets, 'resultados', [
      'timestamp', 'nombre', 'codigo', 'tipoPremio',
      'familia1', 'pct1', 'familia2', 'pct2',
      'correctas', 'total', 'pctAcierto',
      'puntualidad', 'asertividad', 'donGentes', 'resolucionConflictos',
      'negociacion', 'organizacion', 'creatividad', 'trabajoEquipo',
      'adaptabilidad', 'pensamientoCritico',
    ]);
    const row = [
      new Date().toISOString(),
      body.nombre || '', body.codigoPremio || '', body.tipoPremio || '',
      body.familia1 || '', body.pctFamilia1 || 0,
      body.familia2 || '', body.pctFamilia2 || 0,
      body.correctas || 0, body.totalEvaluables || 0, body.pctAcierto || 0,
      body.puntualidad || 0, body.asertividad || 0, body.donGentes || 0, body.resolucionConflictos || 0,
      body.negociacion || 0, body.organizacion || 0, body.creatividad || 0, body.trabajoEquipo || 0,
      body.adaptabilidad || 0, body.pensamientoCritico || 0,
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'resultados!A:U',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

async function appendScanLog(body, prizeName) {
  if (!SHEET_ID) return;
  const sheets = await getSheets();
  await ensureSheet(sheets, 'escaneos', ['timestamp', 'code', 'family', 'prizeType', 'prizeName', 'studentName']);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'escaneos!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        body.code, body.family, body.prizeType, prizeName, body.studentName || '',
      ]],
    },
  });
}

/* ───── google sheets helpers ───── */

let sheetsClient = null;
async function getSheets() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

const sheetsEnsured = new Set();
async function ensureSheet(sheets, tabName, header) {
  if (sheetsEnsured.has(tabName)) return;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const found = (meta.data.sheets || []).find((s) => s.properties && s.properties.title === tabName);
  if (!found) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });
  }
  sheetsEnsured.add(tabName);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`lbc-orientacion backend listening on :${PORT}`);
});
