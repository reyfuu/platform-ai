#!/usr/bin/env node
/**
 * build-app.mjs — sinkronkan prototype single-file ke versi web app "rapi".
 *
 * content-engine.html (standalone, punya <style> + <script> inline) dipecah jadi:
 *   public_html/app.css    — semua CSS
 *   public_html/app.js     — semua JS
 *   public_html/app.html   — HANYA markup; me-link app.css & app.js
 *
 * app.html sengaja TIDAK punya tag <style> maupun <script> inline —
 * semuanya dipindah ke file eksternal (tempat yang biasa).
 * Jalankan tiap kali content-engine.html berubah:
 *   node prototype/build-app.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

// versi pendek dari isi file → dipakai cache-busting (?v=…) di app.html.
// Berubah cuma kalau isinya berubah → browser wajib ambil versi baru, tapi tetap bisa di-cache selama sama.
const ver = s => createHash('sha1').update(s).digest('hex').slice(0, 8);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'content-engine.html');
const PUB = join(__dirname, '..', 'public_html');
const OUT_HTML = join(PUB, 'app.html');
const OUT_CSS = join(PUB, 'app.css');
const OUT_JS = join(PUB, 'app.js');

let html = await readFile(SRC, 'utf8');

// 1) CSS keluar → app.css
const styleM = html.match(/<style>([\s\S]*?)<\/style>/i);
if (!styleM) { console.error('❌ Blok <style> tidak ditemukan'); process.exit(1); }
const cssBody = styleM[1].replace(/^\n/, '');
await writeFile(OUT_CSS, cssBody, 'utf8');
html = html.replace(styleM[0], '<link rel="stylesheet" href="app.css?v=' + ver(cssBody) + '" />');

// 2) JS keluar → app.js (ambil <script> yang inline, tanpa atribut src)
const scriptM = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptM) { console.error('❌ Blok <script> inline tidak ditemukan'); process.exit(1); }
const jsBody = scriptM[1].replace(/^\n/, '');
await writeFile(OUT_JS, jsBody, 'utf8');
html = html.replace(scriptM[0], '<script src="app.js?v=' + ver(jsBody) + '"></script>');

// 3) validasi: app.html tidak boleh punya <style> atau <script> inline lagi
if (/<style[\s>]/i.test(html)) { console.error('❌ Masih ada <style> di app.html'); process.exit(1); }
if (/<script>(?!\s*<\/script>)/i.test(html) || /<script>[\s\S]*?<\/script>/i.test(html)) { console.error('❌ Masih ada <script> inline di app.html'); process.exit(1); }
await writeFile(OUT_HTML, html, 'utf8');

const cssLines = styleM[1].split('\n').length;
const jsLines = scriptM[1].split('\n').length;
console.log('✅ Sinkron selesai — app.html markup murni + app.css + app.js');
console.log('   • ' + OUT_CSS + ' (' + cssLines + ' baris CSS)');
console.log('   • ' + OUT_JS + ' (' + jsLines + ' baris JS)');
console.log('   • ' + OUT_HTML + ' (tanpa <style>/<script> inline)');
