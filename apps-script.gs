/**
 * Backend para el Test de Orientación Profesional IES Luis Bueno Crespo
 *
 * Despliegue:
 *  1. Ve a https://script.google.com/ y crea un proyecto nuevo
 *  2. Pega este fichero completo en Code.gs (sustituye el contenido por defecto)
 *  3. En el menú: Configuración del proyecto → Propiedades del script → añade:
 *       TEACHER_PASSWORD  = profesor26   (o la que quieras)
 *       SHEET_ID          = (ID de una Google Sheet vacía que hayas creado)
 *  4. Implementar → Nueva implementación → tipo "Aplicación web"
 *       Ejecutar como: yo
 *       Quién tiene acceso: cualquier usuario
 *     Copia la URL de implementación.
 *  5. Pega esa URL en index.html, constante BACKEND_URL
 *  6. Haz commit y push a GitHub.
 *
 * IMPORTANTE: cada vez que cambies este código, tienes que crear una NUEVA
 * implementación (Implementar → Gestionar implementaciones → ✏️ → Nueva versión).
 */

const FAMILIES = ['admin','comercio','obra','electro','textil'];
const PRIZE_TYPES = [1,2,3];

function props(){ return PropertiesService.getScriptProperties(); }

function out(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  return out({ok:true, service:'lbc-orientacion', version:1});
}

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';
    let result;
    switch(action){
      case 'login':         result = actionLogin(body); break;
      case 'getStock':      result = actionGetStock(body); break;
      case 'updatePrize':   result = actionUpdatePrize(body); break;
      case 'redeem':        result = actionRedeem(body); break;
      case 'submitResults': result = actionSubmitResults(body); break;
      default: result = {ok:false, error:'accion desconocida: '+action};
    }
    return out(result);
  }catch(err){
    return out({ok:false, error:String(err && err.message || err)});
  }
}

/* ───── auth ───── */

function checkAuth(body){
  const pw = props().getProperty('TEACHER_PASSWORD');
  if(!pw) throw new Error('TEACHER_PASSWORD no configurada en el servidor');
  if(!body.password || body.password !== pw) throw new Error('unauthorized');
}

/* ───── stock ───── */

function defaultStock(){
  const def = {};
  FAMILIES.forEach(f=>{
    def[f] = {
      names: ['Premio tipo 1','Premio tipo 2','Premio tipo 3'],
      counts: [10, 5, 2]
    };
  });
  return def;
}

function readStock(){
  const raw = props().getProperty('PRIZE_STOCK');
  if(!raw){
    const def = defaultStock();
    props().setProperty('PRIZE_STOCK', JSON.stringify(def));
    return def;
  }
  try{
    const parsed = JSON.parse(raw);
    // merge with defaults in case FAMILIES was expanded
    const def = defaultStock();
    FAMILIES.forEach(f=>{ if(!parsed[f]) parsed[f] = def[f]; });
    return parsed;
  }catch(e){
    const def = defaultStock();
    props().setProperty('PRIZE_STOCK', JSON.stringify(def));
    return def;
  }
}

function writeStock(stock){
  props().setProperty('PRIZE_STOCK', JSON.stringify(stock));
}

function readScanned(){
  const raw = props().getProperty('SCANNED_CODES') || '{}';
  try{ return JSON.parse(raw); }catch(e){ return {}; }
}

function writeScanned(s){
  props().setProperty('SCANNED_CODES', JSON.stringify(s));
}

/* ───── actions ───── */

function actionLogin(body){
  checkAuth(body);
  if(FAMILIES.indexOf(body.family) < 0) return {ok:false, error:'familia no válida'};
  return {ok:true, family:body.family, stock:readStock()};
}

function actionGetStock(body){
  checkAuth(body);
  return {ok:true, stock:readStock()};
}

function actionUpdatePrize(body){
  checkAuth(body);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try{
    const stock = readStock();
    const f = body.family;
    if(!stock[f]) return {ok:false, error:'familia no válida'};
    const idx = parseInt(body.index, 10);
    if(isNaN(idx) || idx < 0 || idx > 2) return {ok:false, error:'índice no válido'};
    if(body.name !== undefined){
      const n = String(body.name).slice(0, 80).trim();
      stock[f].names[idx] = n || ('Premio tipo '+(idx+1));
    }
    if(body.count !== undefined){
      stock[f].counts[idx] = Math.max(0, parseInt(body.count, 10) || 0);
    }
    writeStock(stock);
    return {ok:true, stock:stock};
  }finally{
    lock.releaseLock();
  }
}

function actionRedeem(body){
  checkAuth(body);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try{
    const stock = readStock();
    const f = body.family;
    if(!stock[f]) return {ok:false, error:'familia no válida'};
    const pt = parseInt(body.prizeType, 10);
    if(PRIZE_TYPES.indexOf(pt) < 0) return {ok:false, error:'tipo de premio no válido'};
    const idx = pt - 1;
    const code = String(body.code || '').trim();
    if(!code) return {ok:false, error:'código vacío'};
    const scanned = readScanned();
    const prizeName = stock[f].names[idx];

    if(scanned[code]){
      return {
        ok:true,
        alreadyRedeemed:true,
        previousScan:scanned[code],
        stock:stock,
        prizeName:prizeName,
        prizeType:pt
      };
    }
    if(stock[f].counts[idx] <= 0){
      return {
        ok:true,
        noStock:true,
        stock:stock,
        prizeName:prizeName,
        prizeType:pt
      };
    }
    stock[f].counts[idx] = stock[f].counts[idx] - 1;
    scanned[code] = {
      family: f,
      prizeType: pt,
      studentName: body.studentName || '',
      date: new Date().toISOString()
    };
    writeStock(stock);
    writeScanned(scanned);
    appendScanLog(body, prizeName);
    return {
      ok:true,
      redeemed:true,
      stock:stock,
      prizeName:prizeName,
      prizeType:pt,
      remaining: stock[f].counts[idx]
    };
  }finally{
    lock.releaseLock();
  }
}

function appendScanLog(body, prizeName){
  try{
    const sheetId = props().getProperty('SHEET_ID');
    if(!sheetId) return;
    const ss = SpreadsheetApp.openById(sheetId);
    let sh = ss.getSheetByName('escaneos');
    if(!sh){
      sh = ss.insertSheet('escaneos');
      sh.appendRow(['timestamp','code','family','prizeType','prizeName','studentName']);
    }
    sh.appendRow([new Date(), body.code, body.family, body.prizeType, prizeName, body.studentName || '']);
  }catch(e){ /* no bloqueamos el canje si falla el log */ }
}

function actionSubmitResults(body){
  // Endpoint público, no requiere auth
  try{
    const sheetId = props().getProperty('SHEET_ID');
    if(!sheetId) return {ok:true, note:'sin hoja configurada'};
    const ss = SpreadsheetApp.openById(sheetId);
    let sh = ss.getSheetByName('resultados');
    if(!sh){
      sh = ss.insertSheet('resultados');
      sh.appendRow([
        'timestamp','nombre','codigo','tipoPremio',
        'familia1','pct1','familia2','pct2',
        'correctas','total','pctAcierto',
        'puntualidad','asertividad','donGentes','resolucionConflictos',
        'negociacion','organizacion','creatividad','trabajoEquipo',
        'adaptabilidad','pensamientoCritico'
      ]);
    }
    sh.appendRow([
      new Date(),
      body.nombre || '',
      body.codigoPremio || '',
      body.tipoPremio || '',
      body.familia1 || '', body.pctFamilia1 || 0,
      body.familia2 || '', body.pctFamilia2 || 0,
      body.correctas || 0, body.totalEvaluables || 0, body.pctAcierto || 0,
      body.puntualidad || 0, body.asertividad || 0, body.donGentes || 0, body.resolucionConflictos || 0,
      body.negociacion || 0, body.organizacion || 0, body.creatividad || 0, body.trabajoEquipo || 0,
      body.adaptabilidad || 0, body.pensamientoCritico || 0
    ]);
    return {ok:true};
  }catch(e){
    return {ok:false, error:String(e && e.message || e)};
  }
}

/* ───── utilidad admin: reiniciar stock desde el editor ───── */
function resetStock(){
  props().setProperty('PRIZE_STOCK', JSON.stringify(defaultStock()));
  props().setProperty('SCANNED_CODES', '{}');
}
