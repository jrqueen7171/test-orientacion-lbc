// Backend Cloud Run para Test de Orientación Profesional IES Luis Bueno Crespo
// - Firestore: stock, canjes, resultados, progreso, config (admin)
// - Google Sheets: log de escaneos y resultados
// - OTP por email (nodemailer + Gmail)
// - Panel admin: contraseñas, premios, estadísticas, modo pruebas/en vivo

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');

const FAMILIES = ['admin', 'comercio', 'obra', 'electro', 'textil'];
const PRIZE_TYPES = [1, 2, 3];

const TEACHER_PASSWORD_DEFAULT = process.env.TEACHER_PASSWORD || '';
const ADMIN_PASSWORD_DEFAULT = process.env.ADMIN_PASSWORD || '';
const SHEET_ID = process.env.SHEET_ID || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const OTP_EXPIRY_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const db = new Firestore();
const STOCK_DOC = db.collection('lbc_orientacion').doc('stock');
const CONFIG_DOC = db.collection('lbc_orientacion').doc('config');
const SCANS_COL = db.collection('lbc_orientacion_scans');
const RESULTS_COL = db.collection('lbc_orientacion_results');
const OTPS_COL = db.collection('lbc_orientacion_otps');
const PROGRESS_COL = db.collection('lbc_orientacion_progress');
const RATELIMIT_COL = db.collection('lbc_orientacion_ratelimits');
const CONSENTS_COL = db.collection('lbc_orientacion_consents');

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

const PRIVACY_VERSION = '2026-04-30';

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
  res.json({ ok: true, service: 'lbc-orientacion', version: 2 });
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
      // Teacher
      case 'login':         result = await actionLogin(body); break;
      case 'getStock':      result = await actionGetStock(body); break;
      case 'redeem':        result = await actionRedeem(body); break;
      // Admin
      case 'adminLogin':    result = await actionAdminLogin(body); break;
      case 'adminSetTeacherPassword': result = await actionAdminSetTeacherPassword(body); break;
      case 'adminSetAdminPassword':   result = await actionAdminSetAdminPassword(body); break;
      case 'adminSetTimer':           result = await actionAdminSetTimer(body); break;
      case 'adminSetPrizes': result = await actionAdminSetPrizes(body); break;
      case 'adminResetTestMode': result = await actionAdminResetTestMode(body); break;
      case 'adminClearAllData': result = await actionAdminClearAllData(body); break;
      case 'adminGetStats':  result = await actionAdminGetStats(body); break;
      // Student
      case 'getMode':       result = await actionGetMode(); break;
      case 'getAvailablePrize': result = await actionGetAvailablePrize(body); break;
      case 'requestOtp':    result = await actionRequestOtp(body); break;
      case 'verifyOtp':     result = await actionVerifyOtp(body); break;
      case 'saveProgress':  result = await actionSaveProgress(body); break;
      case 'submitResults': result = await actionSubmitResults(body); break;
      case 'getMyResults':  result = await actionGetMyResults(body); break;
      case 'retakeTest':    result = await actionRetakeTest(body); break;
      case 'logout':        result = await actionLogout(body); break;
      case 'recordConsent': result = await actionRecordConsent(body); break;
      default:              result = { ok: false, error: 'accion desconocida: ' + action };
    }
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: String((err && err.message) || err) });
  }
});

/* ───── config ───── */

async function readConfig() {
  const snap = await CONFIG_DOC.get();
  if (snap.exists) return snap.data();
  const defaults = {
    teacherPassword: TEACHER_PASSWORD_DEFAULT,
    adminPassword: ADMIN_PASSWORD_DEFAULT,
    liveMode: false,
    configuredAt: null,
    secondsPerQuestion: 0,
  };
  await CONFIG_DOC.set(defaults);
  return defaults;
}

/* ───── auth ───── */

const HASH_PREFIX = 'scrypt$';

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(plain), salt, 32);
  return `${HASH_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (!String(stored).startsWith(HASH_PREFIX)) {
    // legacy plaintext (pre-hashing migration)
    return String(plain) === String(stored);
  }
  const parts = String(stored).split('$');
  if (parts.length !== 4) return false;
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  const actual = crypto.scryptSync(String(plain), salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function isHashed(stored) {
  return typeof stored === 'string' && stored.startsWith(HASH_PREFIX);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function checkRateLimit(key) {
  const ref = RATELIMIT_COL.doc(key);
  const snap = await ref.get();
  const now = Date.now();
  if (snap.exists) {
    const d = snap.data();
    const blockedUntil = tsMillis(d.blockedUntil);
    if (blockedUntil && now < blockedUntil) {
      const wait = Math.ceil((blockedUntil - now) / 1000);
      throw new Error(`Demasiados intentos. Espera ${wait} s.`);
    }
  }
}

async function recordRateLimitFailure(key) {
  const ref = RATELIMIT_COL.doc(key);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    let attempts = 0;
    let firstAttempt = now;
    if (snap.exists) {
      const d = snap.data();
      const first = tsMillis(d.firstAttempt);
      if (first && now - first < RATE_LIMIT_WINDOW_MS) {
        attempts = d.attempts || 0;
        firstAttempt = first;
      }
    }
    attempts += 1;
    const update = { attempts, firstAttempt: new Date(firstAttempt) };
    if (attempts >= RATE_LIMIT_MAX) {
      update.blockedUntil = new Date(now + RATE_LIMIT_BLOCK_MS);
    }
    tx.set(ref, update, { merge: true });
  });
}

async function clearRateLimit(key) {
  await RATELIMIT_COL.doc(key).delete().catch(() => {});
}

async function checkTeacherAuth(body) {
  const family = body.family || 'unknown';
  const key = `teacher:${family}`;
  await checkRateLimit(key);
  const cfg = await readConfig();
  const stored = cfg.teacherPassword || TEACHER_PASSWORD_DEFAULT;
  const ok = body.password && verifyPassword(body.password, stored);
  if (!ok) {
    await recordRateLimitFailure(key);
    throw new Error('unauthorized');
  }
  await clearRateLimit(key);
  if (!isHashed(stored)) {
    // auto-migrate plaintext to hash on first successful login
    await CONFIG_DOC.update({ teacherPassword: hashPassword(body.password) });
  }
  return cfg;
}

async function checkAdminAuth(body) {
  const key = 'admin';
  await checkRateLimit(key);
  const cfg = await readConfig();
  const stored = cfg.adminPassword || ADMIN_PASSWORD_DEFAULT;
  const ok = body.adminPassword && verifyPassword(body.adminPassword, stored);
  if (!ok) {
    await recordRateLimitFailure(key);
    throw new Error('unauthorized');
  }
  await clearRateLimit(key);
  if (!isHashed(stored)) {
    await CONFIG_DOC.update({ adminPassword: hashPassword(body.adminPassword) });
  }
  return cfg;
}

function sanitizeConfig(cfg) {
  const out = { ...cfg };
  delete out.teacherPassword;
  delete out.adminPassword;
  return out;
}

/* ───── stock ───── */

function defaultStockFamily() {
  return {
    names: ['Premio tipo 1', 'Premio tipo 2', 'Premio tipo 3'],
    counts: [0, 0, 0],
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
  if (!snap.exists) await STOCK_DOC.set(merged);
  return merged;
}

/* ───── teacher actions ───── */

async function actionLogin(body) {
  const cfg = await checkTeacherAuth(body);
  if (!FAMILIES.includes(body.family)) return { ok: false, error: 'familia no válida' };
  const stock = await readStock();
  return { ok: true, family: body.family, stock, liveMode: !!cfg.liveMode, initialStock: cfg.initialStock || null };
}

async function actionGetStock(body) {
  const cfg = await checkTeacherAuth(body);
  return { ok: true, stock: await readStock(), liveMode: !!cfg.liveMode, initialStock: cfg.initialStock || null };
}

async function actionRedeem(body) {
  const cfg = await checkTeacherAuth(body);
  const f = body.family;
  if (!FAMILIES.includes(f)) return { ok: false, error: 'familia no válida' };
  const pt = parseInt(body.prizeType, 10);
  if (!PRIZE_TYPES.includes(pt)) return { ok: false, error: 'tipo de premio no válido' };
  const idx = pt - 1;
  const code = String(body.code || '').trim();
  if (!code) return { ok: false, error: 'código vacío' };

  if (body.qrFamilyKey && body.qrFamilyKey !== f) {
    return { ok: true, wrongStand: true, expectedFamily: body.qrFamilyKey, teacherFamily: f, testMode: !cfg.liveMode };
  }

  if (!cfg.liveMode) {
    const stock = await readStock();
    const prizeName = stock[f].names[idx];
    return { ok: true, testMode: true, prizeName, prizeType: pt, stock };
  }

  const scanRef = SCANS_COL.doc(code);

  const result = await db.runTransaction(async (tx) => {
    const [stockSnap, scanSnap] = await Promise.all([tx.get(STOCK_DOC), tx.get(scanRef)]);
    const data = mergeDefaults(stockSnap.exists ? stockSnap.data() : {});
    const prizeName = data[f].names[idx];

    if (scanSnap.exists) {
      return { alreadyRedeemed: true, previousScan: scanSnap.data(), stock: data, prizeName, prizeType: pt };
    }
    if (data[f].counts[idx] <= 0) {
      return { noStock: true, stock: data, prizeName, prizeType: pt };
    }
    data[f].counts[idx] -= 1;
    const scanDoc = { family: f, prizeType: pt, studentName: body.studentName || '', date: new Date().toISOString() };
    tx.set(STOCK_DOC, data);
    tx.set(scanRef, scanDoc);
    return { redeemed: true, stock: data, prizeName, prizeType: pt, remaining: data[f].counts[idx] };
  });

  if (result.redeemed) {
    appendScanLog(body, result.prizeName).catch((e) => console.log('sheet log error:', e.message));
  }

  return { ok: true, ...result };
}

/* ───── admin actions ───── */

async function actionAdminLogin(body) {
  const cfg = await checkAdminAuth(body);
  const stock = await readStock();
  return { ok: true, config: sanitizeConfig(cfg), stock };
}

async function actionAdminSetTeacherPassword(body) {
  await checkAdminAuth(body);
  const np = String(body.newPassword || '').trim();
  if (!np || np.length < 4) return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  await CONFIG_DOC.update({ teacherPassword: hashPassword(np) });
  return { ok: true };
}

async function actionAdminSetAdminPassword(body) {
  await checkAdminAuth(body);
  const np = String(body.newPassword || '').trim();
  if (!np || np.length < 4) return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  await CONFIG_DOC.update({ adminPassword: hashPassword(np) });
  return { ok: true };
}

async function actionAdminSetTimer(body) {
  await checkAdminAuth(body);
  const s = parseInt(body.secondsPerQuestion, 10);
  if (isNaN(s) || s < 0 || s > 600) return { ok: false, error: 'Valor entre 0 y 600 segundos.' };
  await CONFIG_DOC.update({ secondsPerQuestion: s });
  return { ok: true, secondsPerQuestion: s };
}

async function actionAdminSetPrizes(body) {
  await checkAdminAuth(body);
  const mode = body.mode; // 'uniform' or 'custom'
  let newStock = {};

  if (mode === 'uniform') {
    const names = body.names || ['Premio tipo 1', 'Premio tipo 2', 'Premio tipo 3'];
    const counts = (body.counts || [0, 0, 0]).map(c => Math.max(0, parseInt(c, 10) || 0));
    for (const f of FAMILIES) {
      newStock[f] = { names: [...names], counts: [...counts] };
    }
  } else if (mode === 'custom') {
    const prizes = body.prizes || {};
    for (const f of FAMILIES) {
      if (prizes[f]) {
        newStock[f] = {
          names: prizes[f].names || ['Premio tipo 1', 'Premio tipo 2', 'Premio tipo 3'],
          counts: (prizes[f].counts || [0, 0, 0]).map(c => Math.max(0, parseInt(c, 10) || 0)),
        };
      } else {
        newStock[f] = defaultStockFamily();
      }
    }
  } else {
    return { ok: false, error: 'mode debe ser "uniform" o "custom"' };
  }

  const initialStock = {};
  for (const f of FAMILIES) {
    initialStock[f] = { names: [...newStock[f].names], counts: [...newStock[f].counts] };
  }

  await STOCK_DOC.set(newStock);
  await CONFIG_DOC.update({
    liveMode: true,
    initialStock,
    configuredAt: new Date().toISOString(),
  });

  return { ok: true, stock: newStock, initialStock };
}

async function actionAdminResetTestMode(body) {
  await checkAdminAuth(body);
  await CONFIG_DOC.update({ liveMode: false, initialStock: null, configuredAt: null });
  // Reset stock to zeros
  const emptyStock = {};
  for (const f of FAMILIES) emptyStock[f] = defaultStockFamily();
  await STOCK_DOC.set(emptyStock);
  return { ok: true };
}

async function deleteCollection(col, batchSize = 200) {
  let total = 0;
  while (true) {
    const snap = await col.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < batchSize) break;
  }
  return total;
}

async function actionAdminClearAllData(body) {
  await checkAdminAuth(body);
  const [results, scans, otps, progress, consents, ratelimits] = await Promise.all([
    deleteCollection(RESULTS_COL),
    deleteCollection(SCANS_COL),
    deleteCollection(OTPS_COL),
    deleteCollection(PROGRESS_COL),
    deleteCollection(CONSENTS_COL),
    deleteCollection(RATELIMIT_COL),
  ]);
  await CONFIG_DOC.update({ liveMode: false, initialStock: null, configuredAt: null });
  const emptyStock = {};
  for (const f of FAMILIES) emptyStock[f] = defaultStockFamily();
  await STOCK_DOC.set(emptyStock);
  return { ok: true, deleted: { results, scans, otps, progress, consents, ratelimits } };
}

async function actionAdminGetStats(body) {
  await checkAdminAuth(body);
  const cfg = await readConfig();
  const stock = await readStock();

  // Count scans per family + prizeType
  const scansSnap = await SCANS_COL.get();
  const stats = {};
  for (const f of FAMILIES) {
    stats[f] = { 1: 0, 2: 0, 3: 0 };
  }
  scansSnap.forEach(doc => {
    const d = doc.data();
    if (d.family && stats[d.family] && d.prizeType) {
      stats[d.family][d.prizeType] = (stats[d.family][d.prizeType] || 0) + 1;
    }
  });

  // Count total tests completed
  const resultsSnap = await RESULTS_COL.get();
  const testCount = resultsSnap.size;

  return { ok: true, config: sanitizeConfig(cfg), stock, scanStats: stats, testCount };
}

/* ───── public: mode check ───── */

async function actionGetMode() {
  const cfg = await readConfig();
  return { ok: true, liveMode: !!cfg.liveMode, secondsPerQuestion: parseInt(cfg.secondsPerQuestion, 10) || 0 };
}

async function actionGetAvailablePrize(body) {
  const familyKey = body.familyKey;
  if (!FAMILIES.includes(familyKey)) return { ok: false, error: 'familia no válida' };
  const stock = await readStock();
  const fc = stock[familyKey];
  // Intentar asignar un tipo aleatorio que tenga stock
  const available = PRIZE_TYPES.filter(pt => fc.counts[pt - 1] > 0);
  if (available.length === 0) {
    return { ok: true, hasPrize: false };
  }
  const prizeType = available[Math.floor(Math.random() * available.length)];
  return { ok: true, hasPrize: true, prizeType };
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
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error('GMAIL_USER o GMAIL_APP_PASSWORD no configurados');
  mailer = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
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
        <div style="font-size:38px;font-weight:800;letter-spacing:8px;color:#2a7d4f;padding:16px;background:#e6f4ec;border-radius:12px;text-align:center">${code}</div>
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

  const consentSnap = await CONSENTS_COL.doc(email).get();
  if (!consentSnap.exists) {
    return { ok: false, error: 'Debes aceptar el aviso de protección de datos antes de continuar.' };
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
  await ref.set({ codeHash: hashOTP(code), attempts: 0, lastSentAt: new Date() }, { merge: true });

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
  await ref.update({
    attempts: 0,
    sessionTokenHash: hashSessionToken(sessionToken),
    sessionToken: Firestore.FieldValue.delete(),
    sessionExpiresAt: new Date(Date.now() + SESSION_TTL_MS),
    verifiedAt: new Date(),
  });

  const cfg = await readConfig();
  const resultSnap = await RESULTS_COL.doc(email).get();
  const result = resultSnap.exists ? resultSnap.data() : null;

  let progress = null;
  if (!result) {
    const progSnap = await PROGRESS_COL.doc(email).get();
    if (progSnap.exists) progress = progSnap.data();
  }

  return { ok: true, email, sessionToken, result, found: !!result, progress, liveMode: !!cfg.liveMode, secondsPerQuestion: parseInt(cfg.secondsPerQuestion, 10) || 0 };
}

async function requireSession(email, sessionToken) {
  if (!email || !sessionToken) throw new Error('sesión no válida');
  const snap = await OTPS_COL.doc(email).get();
  if (!snap.exists) throw new Error('sesión no válida');
  const data = snap.data();
  const incomingHash = hashSessionToken(sessionToken);
  // Migration support: accept legacy plaintext token, then upgrade to hash
  if (data.sessionTokenHash) {
    if (data.sessionTokenHash !== incomingHash) throw new Error('sesión no válida');
  } else if (data.sessionToken) {
    if (data.sessionToken !== sessionToken) throw new Error('sesión no válida');
    await OTPS_COL.doc(email).update({
      sessionTokenHash: incomingHash,
      sessionToken: Firestore.FieldValue.delete(),
    }).catch(() => {});
  } else {
    throw new Error('sesión no válida');
  }
  const exp = tsMillis(data.sessionExpiresAt);
  if (!exp || Date.now() > exp) throw new Error('sesión caducada');
}

async function actionSaveProgress(body) {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: 'email obligatorio' };
  try { await requireSession(email, body.sessionToken); } catch (e) { return { ok: false, error: e.message }; }
  await PROGRESS_COL.doc(email).set({
    answers: body.answers || {},
    currentQuestion: parseInt(body.currentQuestion, 10) || 0,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

async function actionSubmitResults(body) {
  try {
    const email = normalizeEmail(body.email);
    if (!email) return { ok: false, error: 'email obligatorio' };
    try { await requireSession(email, body.sessionToken); } catch (e) { return { ok: false, error: e.message }; }

    const cfg = await readConfig();
    const ref = RESULTS_COL.doc(email);
    const snap = await ref.get();

    if (snap.exists && cfg.liveMode) {
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
      liveMode: !!cfg.liveMode,
      timestamp: new Date().toISOString(),
    };
    await ref.set(doc);
    PROGRESS_COL.doc(email).delete().catch(() => {});

    if (SHEET_ID) {
      appendResultsRow(body, email).catch((e) => console.log('sheet results log error:', e.message));
    }

    return { ok: true, result: doc };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

async function actionGetMyResults(body) {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: 'email obligatorio' };
  try { await requireSession(email, body.sessionToken); } catch (e) { return { ok: false, error: e.message }; }
  const cfg = await readConfig();
  const snap = await RESULTS_COL.doc(email).get();
  if (snap.exists) return { ok: true, found: true, result: snap.data(), liveMode: !!cfg.liveMode };
  const progSnap = await PROGRESS_COL.doc(email).get();
  return { ok: true, found: false, progress: progSnap.exists ? progSnap.data() : null, liveMode: !!cfg.liveMode };
}

async function actionRetakeTest(body) {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: 'email obligatorio' };
  try { await requireSession(email, body.sessionToken); } catch (e) { return { ok: false, error: e.message }; }
  const cfg = await readConfig();
  if (cfg.liveMode) return { ok: false, error: 'No se puede repetir el test en modo en vivo.' };
  await RESULTS_COL.doc(email).delete().catch(() => {});
  await PROGRESS_COL.doc(email).delete().catch(() => {});
  return { ok: true };
}

async function actionLogout(body) {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: true };
  await OTPS_COL.doc(email).update({
    sessionTokenHash: Firestore.FieldValue.delete(),
    sessionToken: Firestore.FieldValue.delete(),
    sessionExpiresAt: Firestore.FieldValue.delete(),
  }).catch(() => {});
  return { ok: true };
}

async function actionRecordConsent(body) {
  const email = normalizeEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'correo electrónico no válido' };
  }
  if (body.accepted !== true) return { ok: false, error: 'consentimiento requerido' };
  await CONSENTS_COL.doc(email).set({
    acceptedAt: new Date(),
    privacyVersion: PRIVACY_VERSION,
  }, { merge: true });
  return { ok: true, privacyVersion: PRIVACY_VERSION };
}

/* ───── sheets helpers ───── */

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
      values: [[new Date().toISOString(), body.code, body.family, body.prizeType, prizeName, body.studentName || '']],
    },
  });
}

let sheetsClient = null;
async function getSheets() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
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
