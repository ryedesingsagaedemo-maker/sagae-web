#!/usr/bin/env node
/* SAGAE - Verificador de documentacion (sin dependencias).
 * Falla (exit 1) si el codigo cambio sin que cambie la documentacion legal/tecnica.
 * Uso:  node tools/verificar-documentacion.js [--registrar] [--raiz=<carpeta>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DOMINIO_PROPIO = 'sagae.ryedesign.app';
const DOCS = [
  { archivo: 'aviso-privacidad.html', meta: 'sagae-version-aviso', clave: 'avisoVersion', nombre: 'el aviso de privacidad' },
  { archivo: 'terminos-de-uso.html', meta: 'sagae-version-terminos', clave: 'terminosVersion', nombre: 'los terminos de uso' }
];

function leer(p) { return fs.readFileSync(p, 'utf8'); }
function lf(s) { return s.replace(/\r\n/g, '\n'); }
function sha256(s) { return crypto.createHash('sha256').update(lf(s), 'utf8').digest('hex'); }
function textoPlano(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}
function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
function metaVersion(html, nombre) {
  const re = new RegExp('<meta[^>]*name=["\']' + nombre + '["\'][^>]*content=["\']([^"\']*)["\']', 'i');
  const re2 = new RegExp('<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']' + nombre + '["\']', 'i');
  const m = html.match(re) || html.match(re2);
  return m ? m[1] : null;
}
function hostDe(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return null; } }

function archivosSitio(raiz) {
  return fs.readdirSync(raiz).filter(f => /\.(html|js)$/.test(f) && (f.endsWith('.html') || f === 'sw.js' || f === 'config.js'));
}

/* Hosts externos USADOS por el codigo (no enlaces <a>, no placeholders). */
function hostsUsados(raiz) {
  const res = {}; // host -> [archivo]
  const add = (h, f) => {
    if (!h || h === DOMINIO_PROPIO) return;
    (res[h] = res[h] || new Set()).add(f);
  };
  for (const f of archivosSitio(raiz)) {
    const src = leer(path.join(raiz, f));
    // 1. CSP
    const csp = src.match(/Content-Security-Policy["'][^>]*?content=(?:"([^"]+)"|'([^']+)')/i);
    if (csp) {
      for (const dir of (csp[1] || csp[2]).split(';')) {
        const t = dir.trim().split(/\s+/);
        const nom = t.shift();
        if (!/^(connect|script|frame|img|font|style|media|object|worker|child|manifest|default)-src$/.test(nom || '')) continue;
        for (const tok of t) {
          if (/^https?:\/\//i.test(tok)) add(hostDe(tok), f);
          else if (/^\*\./.test(tok) || tok === '*' || /^https?:$/.test(tok)) add(tok, f);
        }
      }
    }
    // 2. atributos src/href/action de etiquetas que NO son <a>
    const reTag = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
    let m;
    while ((m = reTag.exec(src))) {
      if (m[1].toLowerCase() === 'a') continue;
      const reAt = /\s(?:src|href|action|data|poster)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
      let a;
      while ((a = reAt.exec(m[2]))) add(hostDe(a[1]), f);
    }
    // 3. fetch('https://...') / importScripts / XMLHttpRequest.open / new WebSocket
    const reF = /(?:fetch|importScripts|WebSocket|\.open)\s*\(\s*(?:['"]\w+['"]\s*,\s*)?[`'"](https?:\/\/[^`'"$]+)/g;
    while ((m = reF.exec(src))) add(hostDe(m[1]), f);
    // 4. constantes de URL:  const X = "https://..."  /  clave: "https://..."
    // (se excluyen atributos HTML: los src/href ya se revisan arriba; xmlns y placeholder no son recursos)
    const reC = /(?:^|[\s,{(])([A-Za-z_$][\w$]*)\s*[:=]\s*[`'"](https?:\/\/[^`'"\s$]+)/g;
    while ((m = reC.exec(src))) {
      if (/^(xmlns|placeholder|href|src|action|value|title|alt|content|data|poster)$/i.test(m[1])) continue;
      add(hostDe(m[2]), f);
    }
  }
  return res;
}

/* Claves de almacenamiento local usadas. */
function clavesAlmacenamiento(raiz, errores) {
  const res = []; // {clave, prefijo, tipo, archivo}
  for (const f of archivosSitio(raiz)) {
    const src = leer(path.join(raiz, f));
    const consts = {};
    let c; const reK = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])([^'"]*)\2\s*[;,\n]/g;
    while ((c = reK.exec(src))) consts[c[1]] = c[3];
    const re = /\b(local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(?:(['"])([^'"]*)\2\s*(\+)?|`([^`$]*)(\$\{)?[^`]*`|([A-Za-z_$][\w$.]*)\s*(\+)?)/g;
    let m;
    while ((m = re.exec(src))) {
      const tipo = m[1] + 'Storage';
      if (m[3] !== undefined) res.push({ clave: m[3], prefijo: !!m[4], tipo, archivo: f });
      else if (m[5] !== undefined) res.push({ clave: m[5], prefijo: !!m[6], tipo, archivo: f });
      else if (m[7] !== undefined) {
        if (m[7] in consts) res.push({ clave: consts[m[7]], prefijo: !!m[8], tipo, archivo: f });
        else errores.push('No puedo saber que clave de ' + tipo + ' usa "' + m[7] + '" en ' + f + '. Define la clave como constante con texto literal (const X = "sagae_..."), para que se pueda inventariar.');
      }
    }
  }
  return res;
}

function verificar(raiz, opciones) {
  opciones = opciones || {};
  const errores = [], avisos = [];
  const rutaInv = path.join(raiz, 'privacidad', 'inventario-datos.json');
  if (!fs.existsSync(rutaInv)) {
    return { errores: ['Falta privacidad/inventario-datos.json (el inventario de datos y proveedores). Creelo antes de seguir.'], avisos };
  }
  let inv;
  try { inv = JSON.parse(leer(rutaInv)); }
  catch (e) { return { errores: ['privacidad/inventario-datos.json no es JSON valido: ' + e.message], avisos }; }
  inv.proveedores = inv.proveedores || [];
  inv.almacenamientoLocal = inv.almacenamientoLocal || [];
  inv.huellas = inv.huellas || {};

  // Documentos
  const docs = {};
  for (const d of DOCS) {
    const p = path.join(raiz, d.archivo);
    if (!fs.existsSync(p)) { errores.push('Falta ' + d.archivo + ' (' + d.nombre + ').'); continue; }
    const html = leer(p);
    docs[d.archivo] = { html, version: metaVersion(html, d.meta) };
    if (docs[d.archivo].version === null) errores.push(d.archivo + ' no tiene <meta name="' + d.meta + '" content="..."> con su version.');
  }
  const aviso = docs['aviso-privacidad.html'];

  // 1. Proveedores
  const conocidos = new Set(inv.proveedores.map(p => (p.host || '').toLowerCase()));
  const usados = hostsUsados(raiz);
  for (const h of Object.keys(usados)) {
    if (!conocidos.has(h)) errores.push('Host externo NO inventariado: "' + h + '" (usado en ' + [...usados[h]].join(', ') + '). Agregalo a "proveedores" en privacidad/inventario-datos.json y mencionalo en aviso-privacidad.html (subiendo la version del aviso).');
  }
  for (const p of inv.proveedores) {
    if (p.host && !usados[p.host.toLowerCase()]) avisos.push('El proveedor "' + p.host + '" esta en el inventario pero el codigo ya no lo usa. Si ya no se usa, quitalo del inventario y del aviso.');
  }

  // 2. Menciones literales en el aviso
  if (aviso) {
    const txt = norm(textoPlano(aviso.html));
    const menciones = [].concat(
      inv.proveedores.map(p => ['proveedor ' + p.host, p.mencionEnAviso]),
      inv.almacenamientoLocal.map(a => ['clave ' + a.clave, a.mencionEnAviso]));
    for (const [que, men] of menciones) {
      if (!men || !String(men).trim()) errores.push('Falta "mencionEnAviso" para ' + que + ' en el inventario.');
      else if (!txt.includes(norm(String(men)))) errores.push('El aviso de privacidad no menciona literalmente "' + men + '" (' + que + '). Escribe esa frase en aviso-privacidad.html y sube la version del aviso.');
    }
  }

  // 3. Almacenamiento local
  const usadas = clavesAlmacenamiento(raiz, errores);
  const invAlm = inv.almacenamientoLocal;
  const cubierta = u => invAlm.some(a => u.prefijo ? (a.prefijo && a.clave === u.clave) : (a.clave === u.clave || (a.prefijo && u.clave.startsWith(a.clave))));
  const vistas = new Set();
  for (const u of usadas) {
    const id = u.clave + (u.prefijo ? '*' : '');
    if (vistas.has(id)) continue; vistas.add(id);
    if (!cubierta(u)) errores.push('Clave de ' + u.tipo + ' NO inventariada: "' + u.clave + (u.prefijo ? '*' : '') + '" (' + u.archivo + '). Agregala a "almacenamientoLocal" (con prefijo:true si es un prefijo) y mencionala en el aviso.');
  }
  for (const a of invAlm) {
    const hay = usadas.some(u => u.clave === a.clave || (a.prefijo && u.clave.startsWith(a.clave)));
    if (!hay) errores.push('Inventario desactualizado: la clave "' + a.clave + '" ya no existe en el codigo. Quitala de "almacenamientoLocal" y del aviso (sube la version).');
  }

  // 4. Versiones
  if (aviso && aviso.version !== null && aviso.version !== inv.avisoVersion)
    errores.push('La version del aviso (' + aviso.version + ') no coincide con "avisoVersion" del inventario (' + inv.avisoVersion + ').');
  const t = docs['terminos-de-uso.html'];
  if (t && t.version !== null && t.version !== inv.terminosVersion)
    errores.push('La version de los terminos (' + t.version + ') no coincide con "terminosVersion" del inventario (' + inv.terminosVersion + ').');
  for (const f of fs.readdirSync(raiz).filter(x => x.endsWith('.html'))) {
    const src = leer(path.join(raiz, f));
    const va = src.match(/AVISO_PRIVACIDAD_VERSION\s*=\s*["']([^"']+)["']/);
    if (va && aviso && aviso.version !== null && va[1] !== aviso.version)
      errores.push('AVISO_PRIVACIDAD_VERSION en ' + f + ' ("' + va[1] + '") no coincide con la version del aviso ("' + aviso.version + '"). Actualiza la constante.');
    const vt = src.match(/TERMINOS_VERSION\s*=\s*["']([^"']+)["']/);
    if (vt && t && t.version !== null && vt[1] !== t.version)
      errores.push('TERMINOS_VERSION en ' + f + ' ("' + vt[1] + '") no coincide con la version de los terminos ("' + t.version + '"). Actualiza la constante.');
  }

  // 5. Huellas
  let cambiado = false;
  for (const d of DOCS) {
    const o = docs[d.archivo]; if (!o || o.version === null) continue;
    const h = sha256(o.html);
    inv.huellas[d.archivo] = inv.huellas[d.archivo] || {};
    const reg = inv.huellas[d.archivo][o.version];
    if (reg === undefined) {
      if (opciones.registrar) { inv.huellas[d.archivo][o.version] = h; cambiado = true; avisos.push('Huella registrada: ' + d.archivo + ' version ' + o.version + '.'); }
      else errores.push('Version nueva sin registrar en ' + d.archivo + ' (' + o.version + '). Corre: node tools/verificar-documentacion.js --registrar');
    } else if (reg !== h) {
      errores.push('Cambiaste el texto de ' + d.archivo + ' sin subir su version (' + o.version + '). Sube la version (meta + inventario + constantes) y corre: node tools/verificar-documentacion.js --registrar');
    }
  }
  if (cambiado) fs.writeFileSync(rutaInv, JSON.stringify(inv, null, 2) + '\n');

  // 6. Version de la app
  const swp = path.join(raiz, 'sw.js'), mp = path.join(raiz, 'SAGAE_index_mobile.html');
  if (fs.existsSync(swp) && fs.existsSync(mp)) {
    const sv = leer(swp).match(/CACHE_NAME\s*=\s*['"][^'"]*?-v(\d+(?:\.\d+)*)['"]/);
    const mv = leer(mp).match(/register\(\s*["']sw\.js\?v=([\d.]+)["']/);
    if (!sv) errores.push('No encuentro CACHE_NAME con version (vX.Y) en sw.js.');
    else if (!mv) errores.push('No encuentro register("sw.js?v=X.Y") en SAGAE_index_mobile.html.');
    else if (sv[1] !== mv[1]) errores.push('Version desalineada: sw.js dice v' + sv[1] + ' y el movil registra ?v=' + mv[1] + '. Deben ser iguales.');
  }
  return { errores, avisos };
}

module.exports = { verificar };

if (require.main === module) {
  const args = process.argv.slice(2);
  const rArg = args.find(a => a.startsWith('--raiz='));
  const raiz = rArg ? path.resolve(rArg.slice(7)) : path.resolve(__dirname, '..');
  const r = verificar(raiz, { registrar: args.includes('--registrar') });
  r.avisos.forEach(a => console.log('AVISO: ' + a));
  if (r.errores.length) {
    console.error('\nLA DOCUMENTACION NO ESTA AL DIA (' + r.errores.length + ' problema(s)):');
    r.errores.forEach((e, i) => console.error('  ' + (i + 1) + '. ' + e));
    console.error('\nTodo cambio de codigo debe ir con su documentacion. Corrigelo y vuelve a correr este verificador.');
    process.exit(1);
  }
  console.log('OK: documentacion coherente con el codigo.');
}
