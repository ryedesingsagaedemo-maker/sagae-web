#!/usr/bin/env node
/* Demuestra que verificar-documentacion.js detecta cada error. Uso: node tools/prueba-verificador.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..');
const VERIF = path.join(__dirname, 'verificar-documentacion.js');
const SITIO = ['index.html', 'SAGAE_index_mobile.html', 'SAGAE_portal_reportes.html', 'sw.js', 'config.js'];

const AVISO = v => '<!doctype html><html><head><meta name="sagae-version-aviso" content="' + v + '"></head><body>' +
  '<p>Usamos Google Apps Script para guardar los datos.</p><p>Usamos Google reCAPTCHA contra abusos.</p>' +
  '<p>Guardamos un identificador en el dispositivo (sagae_portal_device).</p>' +
  '<p>Guardamos un contador en la sesion (sagae_rl).</p><p>Guardamos una copia sin conexion (sagae_mobile_cache).</p></body></html>';
const TERM = v => '<!doctype html><html><head><meta name="sagae-version-terminos" content="' + v + '"></head><body><p>Terminos.</p></body></html>';

function armar() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sagae-verif-'));
  for (const f of SITIO) fs.copyFileSync(path.join(RAIZ, f), path.join(d, f));
  // el portal real trae su version del aviso: usarla
  const v = fs.readFileSync(path.join(d, 'SAGAE_portal_reportes.html'), 'utf8').match(/AVISO_PRIVACIDAD_VERSION\s*=\s*["']([^"']+)/)[1];
  fs.writeFileSync(path.join(d, 'aviso-privacidad.html'), AVISO(v));
  fs.writeFileSync(path.join(d, 'terminos-de-uso.html'), TERM('T1'));
  fs.mkdirSync(path.join(d, 'privacidad'));
  const prov = (host, m) => ({ host, nombre: host, proposito: 'prueba', mencionEnAviso: m });
  const alm = (clave, tipo, m) => ({ clave, tipo, archivos: ['x'], proposito: 'prueba', plazo: 'prueba', mencionEnAviso: m });
  const inv = {
    avisoVersion: v, terminosVersion: 'T1',
    proveedores: [prov('script.google.com', 'Google Apps Script'), prov('script.googleusercontent.com', 'Google Apps Script'),
      prov('www.google.com', 'Google reCAPTCHA'), prov('www.gstatic.com', 'Google reCAPTCHA'), prov('recaptcha.google.com', 'Google reCAPTCHA')],
    almacenamientoLocal: [alm('sagae_portal_device', 'localStorage', 'sagae_portal_device'), alm('sagae_rl', 'sessionStorage', 'sagae_rl'),
      alm('sagae_mobile_cache', 'localStorage', 'sagae_mobile_cache')],
    huellas: {}
  };
  fs.writeFileSync(path.join(d, 'privacidad', 'inventario-datos.json'), JSON.stringify(inv, null, 2));
  const r = correr(d, ['--registrar']);
  if (r.status !== 0) { console.error('No pude armar el arbol base:\n' + r.stdout + r.stderr); process.exit(2); }
  return d;
}
function correr(d, extra) { return spawnSync(process.execPath, [VERIF, '--raiz=' + d].concat(extra || []), { encoding: 'utf8' }); }
const leer = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const escr = (d, f, s) => fs.writeFileSync(path.join(d, f), s);
const invMod = (d, fn) => { const p = path.join(d, 'privacidad', 'inventario-datos.json'); const j = JSON.parse(fs.readFileSync(p, 'utf8')); fn(j); fs.writeFileSync(p, JSON.stringify(j, null, 2)); };

const casos = [
  ['0. Todo bien: pasa', d => {}, 0, null],
  ['1. Host externo nuevo sin inventariar', d => escr(d, 'index.html', leer(d, 'index.html').replace("connect-src 'self'", "connect-src 'self' https://api.nuevo-proveedor.com")), 1, 'api.nuevo-proveedor.com'],
  ['1b. Host nuevo via fetch()', d => escr(d, 'index.html', leer(d, 'index.html') + "\n<script>fetch('https://otro-servicio.net/x');</script>"), 1, 'otro-servicio.net'],
  ['2. Mencion ausente en el aviso', d => invMod(d, j => { j.proveedores[0].mencionEnAviso = 'Frase que el aviso no dice'; }), 1, 'no menciona literalmente'],
  ['3. Clave de almacenamiento nueva', d => escr(d, 'index.html', leer(d, 'index.html') + "\n<script>localStorage.setItem('sagae_nueva_clave','1');</script>"), 1, 'sagae_nueva_clave'],
  ['3b. Inventario con clave que ya no existe', d => invMod(d, j => j.almacenamientoLocal.push({ clave: 'sagae_vieja', tipo: 'localStorage', archivos: [], proposito: 'x', plazo: 'x', mencionEnAviso: 'sagae_rl' })), 1, 'Inventario desactualizado'],
  ['4. Version del aviso desalineada', d => invMod(d, j => { j.avisoVersion = '9.9'; }), 1, 'no coincide'],
  ['4b. TERMINOS_VERSION desalineada', d => escr(d, 'index.html', leer(d, 'index.html') + '\n<script>const TERMINOS_VERSION = "T0";</script>'), 1, 'TERMINOS_VERSION'],
  ['5. Texto cambiado sin subir version', d => escr(d, 'terminos-de-uso.html', leer(d, 'terminos-de-uso.html').replace('Terminos.', 'Terminos cambiados.')), 1, 'sin subir su version'],
  ['5b. Version nueva sin registrar', d => { escr(d, 'terminos-de-uso.html', TERM('T2')); invMod(d, j => { j.terminosVersion = 'T2'; }); }, 1, 'sin registrar'],
  ['6. sw.js desalineado con el movil', d => escr(d, 'sw.js', leer(d, 'sw.js').replace(/(CACHE_NAME\s*=\s*'sagae-mobile-v)[\d.]+/, '$1' + '9.9')), 1, 'Version desalineada']
];

let fallos = 0;
for (const [nombre, mod, esperado, texto] of casos) {
  const d = armar();
  mod(d);
  const r = correr(d);
  const ok = r.status === esperado && (!texto || (r.stderr + r.stdout).includes(texto));
  console.log((ok ? 'OK    ' : 'FALLA ') + nombre + '  (exit ' + r.status + ')');
  if (!ok) { fallos++; console.log(r.stdout + r.stderr); }
  fs.rmSync(d, { recursive: true, force: true });
}
// --registrar no sobrescribe huellas ya registradas
{
  const d = armar();
  escr(d, 'terminos-de-uso.html', leer(d, 'terminos-de-uso.html').replace('Terminos.', 'Cambiado.'));
  correr(d, ['--registrar']);
  const r = correr(d);
  const ok = r.status === 1 && r.stderr.includes('sin subir su version');
  console.log((ok ? 'OK    ' : 'FALLA ') + '7. --registrar no sobrescribe huella existente');
  if (!ok) fallos++;
  fs.rmSync(d, { recursive: true, force: true });
}
console.log(fallos ? '\n' + fallos + ' caso(s) fallaron' : '\nTodos los casos se comportan como se espera');
process.exit(fallos ? 1 : 0);
