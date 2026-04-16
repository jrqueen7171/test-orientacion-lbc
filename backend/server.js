// Backend Cloud Run para Test de Orientación Profesional IES Luis Bueno Crespo
// - Firestore para el stock de premios y los códigos canjeados (atómico vía runTransaction)
// - Google Sheets para el log de escaneos y los resultados del test
// - Contraseña del profesor en Secret Manager (env var TEACHER_PASSWORD)
// - OTP por email (nodemailer + Gmail) para validar el correo del alumnado

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');

const FAMILIES = ['admin', 'comercio', 'obra', 'electro', 'textil'];
const PRIZE_TYPES = [1, 2, 3];

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '';
const SHEET_ID = process.env.SHEET_ID || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const OTP_EXPIRY_MS = 15 * 60 * 1000;          // código válido 15 min
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;      // 1 reenvío cada 60 s
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // sesión 7 días

const db = new Firestore();
const STOCK_DOC = db.collection('lbc_orientacion').doc('stock');
const SCANS_COL = db.collection('lbc_orientacion_scans');
const RESULTS_COL = db.collection('lbc_orientacion_results');
const OTPS_COL = db.collection('lbc_orientacion_otps');

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

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
      case 'requestOtp':    result = await actionRequestOtp(body); break;
      case 'verifyOtp':     result = await actionVerifyOtp(body); break;
      case 'submitResults': result = await actionSubmitResults(body); break;
      case 'getMyResults':  result = await actionGetMyResults(body); break;
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

  // Si el QR lleva familyKey, debe coincidir con la familia del profesor
  // (cada stand sólo canjea los premios de su propia familia)
  if (body.qrFamilyKey && body.qrFamilyKey !== f) {
    return {
      ok: true,
      wrongStand: true,
      expectedFamily: body.qrFamilyKey,
      teacherFamily: f,
    };
  }

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

/* ───── OTP / sesión de alumnado ───── */

function hashOTP(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

let mailer = null;
function getMailer() {
  if (mailer) return mailer;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER o GMAIL_APP_PASSWORD no configurados');
  }
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return mailer;
}

async function sendOtpEmail(toEmail, code) {
  const m = getMailer();
  await m.sendMail({
    from: `"IES Luis Bueno Crespo" <${GMAIL_USER}>`,
    to: toEmail,
    subject: 'Tu código de acceso — Test de Orientación',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1b1b1f">
        <div style="display:inline-block;background:#2a7d4f;color:#fff;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:14px">IES Luis Bueno Crespo</div>
        <h2 style="color:#2a7d4f;margin:0 0 8px">Tu código de acceso</h2>
        <p style="color:#555;margin:0 0 16px">Introduce este código en la app del Test de Orientación Profesional para confirmar tu correo:</p>
        <div style="font-size:38px;font-weight:800;letter-spacing:8px;color:#2a7d4f;padding:16px;background:#e6f4ec;border-radius:12px;text-align:center">
          ${code}
        </div>
        <p style="color:#6b6b7b;font-size:12px;margin:18px 0 0">El código caduca en 15 minutos. Si no has solicitado este código, ignora este mensaje.</p>
      </div>
    `,
  });
}

function tsMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.getTime === 'function') return v.getTime();
  return 0;
}

async function actionRequestOtp(body) {
  const email = normalizeEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'correo electrónico no válido' };
  }

  const ref = OTPS_COL.doc(email);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const lastSent = tsMillis(snap.data().lastSentAt);
    const elapsed = now - lastSent;
    if (lastSent && elapsed < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `Espera ${wait} s antes de reenviar el código.` };
    }
  }

  const code = generateOTP();
  await ref.set({
    codeHash: hashOTP(code),
    attempts: 0,
    lastSentAt: new Date(),
  }, { merge: true });

  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    console.log('sendOtpEmail error:', e.message);
    return { ok: false, error: 'No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo.' };
  }

  return { ok: true };
}

async function actionVerifyOtp(body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  if (!email || !code) return { ok: false, error: 'email y código requeridos' };

  const ref = OTPS_COL.doc(email);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'Código no encontrado. Solicita uno nuevo.' };

  const data = snap.data();
  const lastSent = tsMillis(data.lastSentAt);
  if (!lastSent || Date.now() - lastSent > OTP_EXPIRY_MS) {
    return { ok: false, error: 'El código ha caducado. Solicita uno nuevo.' };
  }

  const attempts = data.attempts || 0;
  if (attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: 'Demasiados intentos. Solicita un código nuevo.' };
  }

  if (hashOTP(code) !== data.codeHash) {
    await ref.update({ attempts: attempts + 1 });
    const remaining = OTP_MAX_ATTEMPTS - attempts - 1;
    return { ok: false, error: `Código incorrecto. ${remaining} intento${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.` };
  }

  const sessionToken = generateSessionToken();
  const sessionExpiresAt = Date.now() + SESSION_TTL_MS;
  await ref.update({
    attempts: 0,
    sessionToken,
    sessionExpiresAt: new Date(sessionExpiresAt),
    verifiedAt: new Date(),
  });

  const resultSnap = await RESULTS_COL.doc(email).get();
  const result = resultSnap.exists ? resultSnap.data() : null;

  return { ok: true, email, sessionToken, result, found: !!result };
}

async function requireSession(email, sessionToken) {
  if (!email || !sessionToken) throw new Error('sesión no válida');
  const snap = await OTPS_COL.doc(email).get();
  if (!snap.exists) throw new Error('sesión no válida');
  const data = snap.data();
  if (!data.sessionToken || data.sessionToken !== sessionToken) {
    throw new Error('sesión no válida');
  }
  const exp = tsMillis(data.sessionExpiresAt);
  if (!exp || Date.now() > exp) throw new Error('sesión caducada');
}

async function actionSubmitResults(body) {
  // Requiere OTP verificada (email + sessionToken). Guarda en Firestore
  // y apila una fila en la Google Sheet (audit/export).
  try {
    const email = normalizeEmail(body.email);
    if (!email) return { ok: false, error: 'email obligatorio' };
    try {
      await requireSession(email, body.sessionToken);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const ref = RESULTS_COL.doc(email);
    const snap = await ref.get();
    if (snap.exists) {
      // Ya hizo el test: devolvemos lo que había, sin sobrescribir ni reescribir Sheet
      return { ok: true, alreadyExists: true, result: snap.data() };
    }

    const doc = {
      email,
      answers: body.answers || {},
      prizeCode: body.codigoPremio || '',
      prizeType: parseInt(body.tipoPremio, 10) || 0,
      familyKey: body.familyKey || '',
      familia1: body.familia1 || '',
      pctFamilia1: body.pctFamilia1 || 0,
      familia2: body.familia2 || '',
      pctFamilia2: body.pctFamilia2 || 0,
      correctas: body.correctas || 0,
      totalEvaluables: body.totalEvaluables || 0,
      pctAcierto: body.pctAcierto || 0,
      soft: {
        puntualidad: body.puntualidad || 0,
        asertividad: body.asertividad || 0,
        donGentes: body.donGentes || 0,
        resolucionConflictos: body.resolucionConflictos || 0,
        negociacion: body.negociacion || 0,
        organizacion: body.organizacion || 0,
        creatividad: body.creatividad || 0,
        trabajoEquipo: body.trabajoEquipo || 0,
        adaptabilidad: body.adaptabilidad || 0,
        pensamientoCritico: body.pensamientoCritico || 0,
      },
      timestamp: new Date().toISOString(),
    };
    await ref.set(doc);

    // Audit log en Google Sheet (best-effort, no rompe si falla)
    if (SHEET_ID) {
      appendResultsRow(body, email).catch((e) => console.log('sheet results log error:', e.message));
    }

    return { ok: true, result: doc };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

async function actionGetMyResults(body) {
  // Requiere OTP verificada (email + sessionToken). Bootstrap de la app
  // tras recargar la página.
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: 'email obligatorio' };
  try {
    await requireSession(email, body.sessionToken);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const snap = await RESULTS_COL.doc(email).get();
  if (!snap.exists) return { ok: true, found: false };
  return { ok: true, found: true, result: snap.data() };
}

async function appendResultsRow(body, email) {
  const sheets = await getSheets();
  await ensureSheet(sheets, 'resultados', [
    'timestamp', 'email', 'codigo', 'tipoPremio', 'familyKey',
    'familia1', 'pct1', 'familia2', 'pct2',
    'correctas', 'total', 'pctAcierto',
    'puntualidad', 'asertividad', 'donGentes', 'resolucionConflictos',
    'negociacion', 'organizacion', 'creatividad', 'trabajoEquipo',
    'adaptabilidad', 'pensamientoCritico',
  ]);
  const row = [
    new Date().toISOString(),
    email, body.codigoPremio || '', body.tipoPremio || '', body.familyKey || '',
    body.familia1 || '', body.pctFamilia1 || 0,
    body.familia2 || '', body.pctFamilia2 || 0,
    body.correctas || 0, body.totalEvaluables || 0, body.pctAcierto || 0,
    body.puntualidad || 0, body.asertividad || 0, body.donGentes || 0, body.resolucionConflictos || 0,
    body.negociacion || 0, body.organizacion || 0, body.creatividad || 0, body.trabajoEquipo || 0,
    body.adaptabilidad || 0, body.pensamientoCritico || 0,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'resultados!A:V',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
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
