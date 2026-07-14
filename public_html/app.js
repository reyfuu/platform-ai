'use strict';
/* ═══════════════════════ UTIL & STORAGE ═══════════════════════ */
const $ = s => document.querySelector(s); // selektor pendek
// pembuat elemen DOM ringkas: set props/atribut/event + sisipkan anak
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  let pendingEmojiText = null; // teks textContent yang mungkin diawali emoji → dicek jadi ikon
  let pendingHtmlSweep = false; // html chrome → sapu emoji di tengah teks jadi ikon
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') { n.innerHTML = v; pendingHtmlSweep = true; }
    else if (k === 'textContent' && typeof v === 'string' && typeof EMOJI_TEST !== 'undefined' && EMOJI_TEST.test(v)) { n.textContent = v; pendingEmojiText = v; }
    else if (k.startsWith('on')) n[k] = v;
    else if (k in n) { try { n[k] = v; } catch (e) { n.setAttribute(k, v); } }
    else n.setAttribute(k, v);
  }
  // emoji di textContent → ikon garis (leading & mid). Kelas 'e' = ikon besar (pakai leadingEmojiToIcon).
  if (pendingEmojiText != null && tag !== 'textarea' && tag !== 'input' && tag !== 'option') {
    if (n.className === 'e' && typeof leadingEmojiToIcon === 'function') leadingEmojiToIcon(n, pendingEmojiText, 'e');
    else if (typeof iconifyStatic === 'function' && !RAW_EMOJI_CLASS.has(n.className || '')) iconifyStatic(n);
  }
  // sapu emoji di dalam string html UI (hint dsb) → ikon; kecuali kelas konten mentah
  else if (pendingHtmlSweep && typeof iconifyStatic === 'function' && !RAW_EMOJI_CLASS.has(n.className || ''))
    iconifyStatic(n);
  for (const c of (Array.isArray(kids) ? kids : [kids])) if (c != null) n.append(c);
  return n;
};

/* ═══════════ SISTEM IKON GARIS (SVG) ═══════════
   Ganti emoji di UI dengan ikon garis konsisten (stroke currentColor, gaya Lucide).
   Emoji cuma dipertahankan di dalam konten yang di-generate (caption sosmed). */
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="18" y="13" width="3" height="4" rx="1"/>',
  trending: '<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
  sparkles: '<path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8Z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 3.6l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  camera: '<path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4Z"/><circle cx="12" cy="13" r="3.2"/>',
  flame: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3 .5 1.5 1.5 2 1.5 2S8.5 7 12 3Z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2.3h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7.5 15h9"/>',
  music: '<circle cx="6" cy="18" r="2.6"/><circle cx="17" cy="16" r="2.6"/><path d="M8.6 18V6l11-2v12"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-6.7-9-6.7Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="10" cy="8" r="1"/><circle cx="15" cy="8" r="1"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/><path d="M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l7 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M17 8a4 4 0 0 1 0 8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4S6 18.5 7 17.5m5.5-9.5a9 9 0 0 1 7-3s.5 5-3 7l-4 3H8l3-4Z"/><circle cx="15" cy="9" r="1.3"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>',
  hook: '<path d="M12 3v9a4 4 0 0 1-8 0"/><circle cx="12" cy="3" r="1.4"/>',
  swords: '<path d="M14 3h6v6"/><path d="M20 3 9 14"/><path d="m5 21 4-4"/><path d="M4 3h4l9 9-4 4L4 7Z"/>',
  pin: '<path d="M12 21s6-5.3 6-10a6 6 0 0 0-12 0c0 4.7 6 10 6 10Z"/><circle cx="12" cy="11" r="2.2"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5"/>',
  stethoscope: '<path d="M5 3v5a4 4 0 0 0 8 0V3"/><path d="M9 16v1a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2.4"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M12 4v4M9 13h.01M15 13h.01"/><circle cx="12" cy="4" r="1.3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 19l7-7a2.1 2.1 0 0 0-3-3l-7 7-1 4 4-1Z"/><path d="M15 6l3 3"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z"/><path d="m9 12 2 2 4-4"/>',
  speech: '<path d="M21 12a8 8 0 0 1-11.4 7.2L4 20l1-4.8A8 8 0 1 1 21 12Z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/>',
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m16 10 5.5-3v10L16 14Z"/>',
  carousel: '<rect x="8" y="5" width="8" height="14" rx="1.5"/><path d="M5.5 7.5v9M2.5 9.5v5M18.5 7.5v9M21.5 9.5v5"/>',
  grad: '<path d="M2 9l10-4 10 4-10 4Z"/><path d="M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/>',
  star: '<path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.2L12 17.8 6.1 20.4l1.3-6.2L2.7 9.6l6.3-.7Z"/>',
  heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/>',
  play: '<path d="M7 4v16l13-8Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  link: '<path d="M9 15l6-6"/><path d="M11 6.5 13 5a4 4 0 0 1 6 6l-1.5 1.5"/><path d="M13 17.5 11 19a4 4 0 0 1-6-6l1.5-1.5"/>',
  message: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1Z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.5-4.6"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 13v4M9 21h6M10 17h4"/>',
  gap: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/>',
  telescope: '<path d="m4 14 12-4 1.5 4-12 4Z"/><path d="m14.5 8.5 3-4 3 1.5-2 4Z"/><path d="M8 16v4M8 20l-2 1M8 20l2 1"/>',
  bottle: '<path d="M10 2h4v3l1 2v13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7l1-2Z"/><path d="M9 12h6"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M12 3c2 0 3 1.5 3 3M9 6c0-1.5 1-3 3-3"/>',
  shirt: '<path d="M8 3 4 6l2 3 2-1.5V21h8V7.5L18 9l2-3-4-3-2 2h-4Z"/>',
  tool: '<path d="M14.5 6a3.5 3.5 0 0 0-4.7 4.3L4 16.1V20h3.9l5.8-5.8A3.5 3.5 0 0 0 18 9.5l-2.4 2.4-2.5-2.5L15.5 7Z"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  box: '<path d="m3 8 9-5 9 5v8l-9 5-9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  wand: '<path d="m4 20 12-12"/><path d="M15 5.5 18.5 9M6 3v3M4.5 4.5h3M18 14v3M16.5 15.5h3"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-8 8Z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13"/><path d="M12 8S10.5 3 8 4.5 9.5 8 12 8Zm0 0s1.5-5 4-3.5S14.5 8 12 8Z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M17 6l2 2M14 9l2 2"/>',
  brain: '<path d="M9.5 4a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 9a2.5 2.5 0 0 0 1 5v1.5a2.5 2.5 0 0 0 3.5 2.3V4Z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19 9a2.5 2.5 0 0 1-1 5v1.5a2.5 2.5 0 0 1-3.5 2.3V4Z"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  hash: '<path d="M9 4 7 20M17 4l-2 16M5 9h15M4 15h15"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 0 1 4.8.8c0 1.7-2.3 2-2.3 3.5"/><path d="M12 17h.01"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
  rainbow: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M10 17a2 2 0 0 1 4 0"/>',
  masks: '<path d="M4 5h7v6a3.5 3.5 0 0 1-7 0Z"/><path d="M13 8h7v3a3.5 3.5 0 0 1-7 0"/>',
  bag: '<path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
};
// bungkus path jadi <svg>. size opsional (px); default ikut font (em).
function svgIcon(name, size) {
  const p = ICONS[name]; if (!p) return '';
  const dim = size ? ('width="' + size + '" height="' + size + '"') : '';
  // stroke 1.75 = kesan garis halus/mewah (refined), bukan tebal generik. CSS bisa override per-konteks.
  return '<svg class="lu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ' + dim + '>' + p + '</svg>';
}
// elemen ikon siap-pakai (buat disisipin manual). return <span class="ico">
function icon(name, size) { const s = el('span', { class: 'ico' }); s.innerHTML = svgIcon(name, size); return s; }
// peta emoji → nama ikon. Yang tak ada di sini dibiarkan (mis. emoji di dalam caption hasil).
const EMOJI_ICON = {
  '🎯': 'target', '📊': 'chart', '📈': 'trending', '✨': 'sparkles', '⚙️': 'settings', '⚙': 'settings',
  '📸': 'camera', '🔥': 'flame', '📄': 'file', '🧪': 'flask', '🎵': 'music', '🎨': 'palette',
  '✅': 'checkCircle', '⚠️': 'alert', '⚠': 'alert', '🗑️': 'trash', '🗑': 'trash', '🔍': 'search', '🔎': 'search',
  '📣': 'megaphone', '🖼️': 'image', '🖼': 'image', '📋': 'clipboard', '❌': 'x', '✕': 'x', '✖️': 'x',
  '⚡': 'zap', '🚀': 'rocket', '💡': 'bulb', '🎲': 'dice', '🪝': 'hook', '🥊': 'swords', '⚔️': 'swords', '⚔': 'swords',
  '📌': 'pin', '🎬': 'film', '🩺': 'stethoscope', '🤖': 'bot', '📝': 'edit', '👇': 'arrowDown',
  '👁️': 'eye', '👁': 'eye', '✍️': 'pen', '✍': 'pen', '🛡️': 'shield', '🛡': 'shield', '🗣️': 'speech', '🗣': 'speech',
  '🗓️': 'calendar', '🗓': 'calendar', '📅': 'calendar', '🔴': 'flame', '🎥': 'video', '🎠': 'carousel', '🎓': 'grad',
  '⭐': 'star', '🌟': 'star', '❤️': 'heart', '❤': 'heart', '▶️': 'play', '▶': 'play', '➕': 'plus', '⬇️': 'download', '⬇': 'download',
  '🔗': 'link', '💬': 'message', '👥': 'users', '🏆': 'trophy', '🕳️': 'gap', '🕳': 'gap', '🔭': 'telescope',
  '🧴': 'bottle', '🍜': 'bowl', '👗': 'shirt', '🛠️': 'tool', '🛠': 'tool', '📚': 'book', '📦': 'box',
  '🧱': 'layers', '🧭': 'compass', '⏱️': 'clock', '⏱': 'clock', '🕒': 'clock', '📂': 'folder', '📁': 'folder',
  '🏠': 'home', '🔒': 'lock', '🔐': 'lock', '🏷️': 'tag', '🏷': 'tag',
  '🎁': 'gift', '🔑': 'key', '🧠': 'brain', '🚫': 'ban', '🔢': 'hash', '🧪': 'flask',
  '⏳': 'clock', '⌛': 'clock', '🔃': 'settings', '🔄': 'settings', '🌐': 'compass', '💻': 'file', '📱': 'file',
  '🔓': 'lock', '👤': 'user', '🙋': 'user', '🙋‍♀️': 'user', '🙋‍♂️': 'user', '❓': 'help', '❔': 'help',
  '😣': 'alert', '😤': 'flame', '😮': 'help', '😱': 'alert', '🤔': 'help', '🤫': 'eye', '🎭': 'masks',
  '💸': 'money', '💰': 'money', '🫶': 'heart', '💚': 'heart', '💛': 'heart', '💙': 'heart', '🧡': 'heart', '💜': 'heart', '🤍': 'heart',
  '🌈': 'rainbow', '🎉': 'sparkles', '🎊': 'sparkles', '👀': 'eye', '👑': 'star', '💎': 'star', '🥇': 'trophy',
  '✏️': 'edit', '✏': 'edit', '📖': 'book', '📅': 'calendar', '🔥': 'flame', '🖊️': 'pen', '🖋️': 'pen', '🧵': 'layers',
  '📢': 'megaphone', '🔔': 'megaphone', '🎙️': 'music', '🎙': 'music', '📹': 'video', '🖥️': 'file', '💾': 'download', '📥': 'download', '📤': 'link',
  '🛍️': 'bag', '🛍': 'bag', '🛒': 'bag', '👜': 'bag', '👛': 'bag', '📘': 'book', '📗': 'book', '📙': 'book', '📕': 'book', '📓': 'book', '📔': 'book',
  '✓': 'check', '✔️': 'check', '✔': 'check', '☑️': 'check', '✗': 'x', '✘': 'x', '❎': 'x', '🗒️': 'file', '🗒': 'file', '🗄️': 'folder', '📃': 'file', '📑': 'file', '🧾': 'file',
  '⭕': 'target', '🎪': 'sparkles', '🪄': 'wand', '🔖': 'tag', '📍': 'pin', '🚩': 'pin', '⏰': 'clock', '🕐': 'clock', '💥': 'flame', '🌸': 'sparkles',
};
// kelas yang isinya konten mentah (emoji = bagian konten, JANGAN diubah jadi ikon)
const RAW_EMOJI_CLASS = new Set(['copybox', 's-head', 's-sub', 's-role', 'vo', 'ost', 'quote', 'cap', 'illo-title', 'day-card']);
const EMOJI_KEYS = Object.keys(EMOJI_ICON).sort((a, b) => b.length - a.length); // multi-codepoint duluan
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
// deteksi emoji di AWAL teks → ganti jadi ikon garis. dipanggil dari el().
function leadingEmojiToIcon(node, text, cls) {
  if (RAW_EMOJI_CLASS.has(cls || '')) return false;
  for (const emo of EMOJI_KEYS) {
    if (text.startsWith(emo)) {
      let rest = text.slice(emo.length);
      const sized = (cls === 'e'); // .e = ikon besar (kartu) → biar CSS yang atur ukuran via span
      node.innerHTML = '<span class="ico' + (sized ? ' ico-lg' : '') + '">' + svgIcon(EMOJI_ICON[emo]) + '</span>' + (rest ? '<span class="ico-t">' + esc(rest.replace(/^\s+/, ' ')) + '</span>' : '');
      return true;
    }
  }
  return false;
}
// Deteksi emoji piktografik (TIDAK termasuk panah ← → ↗ dst — itu glyph teks yang dipertahankan).
const EMOJI_CLS = '\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2190}-\\u{21FF}\\u{2900}-\\u{297F}';
const EMOJI_PICT = '\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}';
const EMOJI_TEST = new RegExp('[' + EMOJI_PICT + ']', 'u'); // cek cepat: ada emoji?
// cluster emoji (base + variation selector / ZWJ / skin-tone)
const EMOJI_ANY = new RegExp('(?:[' + EMOJI_PICT + '][\\u{FE0F}\\u{200D}\\u{1F3FB}-\\u{1F3FF}\\u{20E3}]*)+', 'gu');
// sapu SEMUA emoji di teks elemen chrome → ikon garis. Yang kekenal → ikon; yang nggak → dibuang.
// AMAN: cuma dijalankan di UI (bukan kelas konten mentah / caption hasil generate).
function iconifyStatic(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const hits = []; let node;
  while ((node = walker.nextNode())) { if (node.nodeValue && EMOJI_TEST.test(node.nodeValue)) hits.push(node); }
  hits.forEach(t => {
    // jangan sentuh kalau ada leluhur kelas konten mentah
    let p = t.parentElement, raw = false;
    while (p) { if (p.className && typeof p.className === 'string' && p.className.split(/\s+/).some(c => RAW_EMOJI_CLASS.has(c))) { raw = true; break; } p = p.parentElement; }
    if (raw) return;
    const s = t.nodeValue; const frag = document.createDocumentFragment();
    let last = 0, m; EMOJI_ANY.lastIndex = 0;
    while ((m = EMOJI_ANY.exec(s))) {
      if (m.index > last) frag.append(document.createTextNode(s.slice(last, m.index)));
      const cl = m[0], base = [...cl][0];
      const name = EMOJI_ICON[cl] || EMOJI_ICON[base] || EMOJI_ICON[base + '️'];
      if (name) { const sp = document.createElement('span'); sp.className = 'ico'; sp.innerHTML = svgIcon(name); frag.append(sp); }
      // tak kekenal → dibuang (biar UI 100% bebas emoji)
      last = m.index + cl.length;
    }
    if (last < s.length) frag.append(document.createTextNode(s.slice(last)));
    if (t.parentNode) t.parentNode.replaceChild(frag, t);
  });
}
// wrapper localStorage yang aman (auto try/catch + JSON)
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Penyimpanan browser diblokir'); } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const uid = () => 'b' + Math.random().toString(36).slice(2, 9); // id brand acak
const sleep = ms => new Promise(r => setTimeout(r, ms)); // jeda async (animasi "lagi masak")
// notifikasi kecil di bawah layar (auto hilang)
function toast(msg, kind) { const t = $('#toast'); t.textContent = msg; if (typeof iconifyStatic === 'function') iconifyStatic(t); t.classList.remove('ok', 'err'); if (kind) t.classList.add(kind); t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), kind === 'err' ? 3200 : 2200); }
// salin teks ke clipboard (+ fallback kalau API diblokir)
function copyText(text, label) {
  const done = () => toast((label || 'Teks') + ' disalin ✓');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
// cara lama nyalin: textarea sembunyi + execCommand
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Gagal menyalin — blok manual ya'); }
  ta.remove();
}
// PRNG seeded — biar tombol "versi lain" beneran ngasih variasi yang bisa diulang
function mulberry(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]; // 1 elemen acak (rng ber-seed)
// ambil n elemen acak unik (Fisher-Yates ber-seed)
function pickN(rng, arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.min(n, a.length));
}
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s; // kapitalkan huruf pertama

/* ── kompetitor: jumlah maksimal + baca/tulis terpusat ── */
const MAX_COMP = 10; // jumlah maksimal kompetitor
const COMP_KEYS = Array.from({ length: MAX_COMP }, (_, i) => 'comp' + (i + 1)); // comp1..comp10
// baca daftar handle kompetitor: pakai array `competitors` kalau ada, else legacy comp1..comp6
const compsOf = c => (Array.isArray(c.competitors) && c.competitors.length ? c.competitors : COMP_KEYS.map(k => c[k])).map(x => (x || '').trim()).filter(Boolean);
// tulis daftar handle → array `competitors` + field legacy comp1..comp6 (biar sinkron ke form Profil)
function setComps(c, hs) { const clean = (hs || []).map(x => (x || '').trim()); c.competitors = clean.filter(Boolean); COMP_KEYS.forEach((k, i) => { c[k] = clean[i] || ''; }); }

/* storage brand */
const loadClients = () => store.get('ce3_clients', []);
const saveClients = l => store.set('ce3_clients', l);
const getClient = id => loadClients().find(c => c.id === id);
// simpan/replace brand di list
function saveClient(c) { const l = loadClients(); const i = l.findIndex(x => x.id === c.id); if (i >= 0) l[i] = c; else l.push(c); saveClients(l); }
// hapus brand beserta riwayat & seed-nya
function deleteClient(id) { saveClients(loadClients().filter(c => c.id !== id)); store.del('ce3_hist_' + id); store.del('ce3_seed_' + id); }
// migrasi dari versi lama (ce_clients) — sekali jalan
(function migrate() {
  if (loadClients().length) return;
  const old = store.get('ce_clients', []);
  if (Array.isArray(old) && old.length) saveClients(old.map(c => ({ ...c })));
})();

/* ═══════════════════════ DATA: KATEGORI, TONE & BANK KONTEN ═══════════════════════ */
const CATS = [
  { id: 'skincare', e: '🧴', label: 'Skincare & Beauty' },
  { id: 'fnb', e: '🍜', label: 'Makanan & Minuman' },
  { id: 'fashion', e: '👗', label: 'Fashion & Aksesoris' },
  { id: 'service', e: '🛠️', label: 'Jasa & Service' },
  { id: 'edu', e: '📚', label: 'Edukasi & Kursus' },
  { id: 'other', e: '📦', label: 'Lainnya' },
];
// cari kategori brand (default: Lainnya)
const catOf = c => CATS.find(x => x.id === (c.category || 'other')) || CATS[5];

// Tone → "bumbu bahasa" yang dipakai semua generator
const TONES = {
  'Santai & friendly': { closers: ['ya', 'nih', 'deh', 'kok'], boost: ['banget', 'beneran'], vibe: 'santai' },
  'Lucu & relatable': { closers: ['wkwk', 'kan', 'sih', 'loh'], boost: ['parah', 'banget'], vibe: 'lucu' },
  'Edukatif & jelas': { closers: ['ya', ''], boost: ['jauh lebih', 'terbukti'], vibe: 'edu' },
  'Premium & elegan': { closers: ['', ''], boost: ['jauh lebih', 'sungguh'], vibe: 'premium' },
  'Tegas & bold': { closers: ['. Titik', '', 'sekarang'], boost: ['jauh', 'langsung'], vibe: 'bold' },
  'Hangat & caring': { closers: ['ya', 'pelan-pelan aja'], boost: ['lebih', 'makin'], vibe: 'hangat' },
};
const TONE_LIST = Object.keys(TONES);
// tone bisa multi-pilih (array) atau string lama — normalkan jadi array valid
function toneList(c) {
  const raw = Array.isArray(c.tone) ? c.tone : (c.tone ? [c.tone] : []);
  const valid = raw.filter(t => TONES[t]);
  return valid.length ? valid : ['Santai & friendly'];
}
// gabung "bumbu bahasa" dari beberapa tone jadi satu profil
function mergeTones(names) {
  const ts = names.map(n => TONES[n]).filter(Boolean);
  const uniq = arr => [...new Set(arr)];
  return {
    vibe: ts[0].vibe, // vibe utama (buat saran sound) = tone pertama
    closers: uniq(ts.flatMap(t => t.closers)),
    boost: uniq(ts.flatMap(t => t.boost)),
  };
}
// pilihan cepat buat wizard (sapaan, tujuan, CTA, preferensi emoji)
const SAPAANS = ['kak', 'kamu', 'bestie', 'gais', 'bund', 'Anda'];
const GOALS = ['Jualan', 'Biar dikenal', 'Interaksi', 'Edukasi'];
const CTAS = ['Checkout link di bio', 'Komen keyword, nanti di-DM', 'DM langsung aja', 'Order via GoFood/GrabFood', 'Datang ke toko/outlet', 'Save & share ke temanmu'];
const EMOJIS = ['secukupnya', 'banyak', 'tanpa emoji'];

/*
 * BANK per kategori — bahan mentah yang dirakit generator.
 * t = judul pendek (slide/beat), d = penjelasan 1-2 kalimat.
 */
const BANK = {
  skincare: {
    tags: ['skincarepemula', 'tipsskincare', 'skincarelokal', 'kulitsehat', 'glowingskin', 'skincareroutine', 'perawatanwajah', 'racunskincare'],
    visuals: ['close-up tekstur produk di punggung tangan', 'tetesan serum slow-mo', 'wajah depan cermin dengan cahaya jendela', 'deretan produk di meja rias estetik', 'proses tap-tap serum ke pipi', 'busa cleanser di telapak tangan'],
    props: ['produk andalan', 'cermin', 'handuk kecil', 'tripod HP'],
    mistakes: [
      { t: 'Urutan pakainya kebalik', d: 'Serum itu setelah toner dan sebelum pelembap. Kebalik = nggak meresap maksimal.' },
      { t: 'Kebanyakan produk sekaligus', d: 'Kulit butuh adaptasi. Mulai dari 3 langkah dasar dulu: cleanser, pelembap, sunscreen.' },
      { t: 'Skip sunscreen pas di rumah', d: 'Sinar UVA tembus jendela. Sunscreen tetap wajib walau nggak keluar rumah.' },
      { t: 'Ganti produk tiap minggu', d: 'Hasil skincare butuh 4–8 minggu. Gonta-ganti bikin kulit nggak pernah sempat membaik.' },
      { t: 'Nggak pernah patch test', d: 'Coba dulu 24 jam di belakang telinga sebelum dipakai ke seluruh wajah.' },
      { t: 'Cuci muka pakai air panas', d: 'Air panas bikin kulit makin kering. Pakai air suhu ruang atau hangat kuku.' },
    ],
    signs: [
      { t: 'Kusam walau rajin cuci muka', d: 'Sel kulit mati numpuk — butuh eksfoliasi lembut 1–2x seminggu.' },
      { t: 'Kering & ketarik habis mandi', d: 'Skin barrier lagi lemah. Pakai pelembap maksimal 60 detik setelah cuci muka.' },
      { t: 'Makeup gampang crack', d: 'Tanda kulit dehidrasi. Hidrasi dulu, makeup kemudian.' },
      { t: 'Perih tiap coba produk baru', d: 'Kulitmu tipe sensitif — pilih formula gentle dan selalu patch test.' },
      { t: 'Bekas jerawat lama banget pudar', d: 'Regenerasi kulit lagi lambat — bantu dengan niacinamide dan sunscreen tiap hari.' },
    ],
    myths: [
      { m: 'Makin perih makin ampuh', f: 'Perih itu tanda skin barrier protes. Kulit sehat justru butuh formula yang lembut.' },
      { m: 'Kulit berminyak nggak perlu pelembap', f: 'Kulit yang dehidrasi malah memproduksi minyak lebih banyak. Pakai pelembap ringan.' },
      { m: 'Harga mahal = pasti cocok', f: 'Cocok-cocokan itu soal kandungan dan tipe kulit, bukan harga.' },
      { m: 'Hasil kelihatan dalam 3 hari', f: 'Siklus regenerasi kulit itu ±28 hari. Yang jujur bilang 4–8 minggu.' },
      { m: 'SPF di makeup udah cukup', f: 'Jumlah yang dipakai jauh di bawah takaran uji. Tetap butuh sunscreen tersendiri.' },
    ],
    tips: [
      { t: 'Aturan 60 detik', d: 'Pelembap paling efektif dipakai maksimal 60 detik setelah cuci muka, saat kulit masih lembap.' },
      { t: '2–3 tetes serum aja', d: 'Lebih banyak bukan lebih ampuh — sisanya kebuang. Tap pelan sampai meresap.' },
      { t: 'Sunscreen takaran 2 jari', d: 'Sepanjang telunjuk + jari tengah untuk wajah dan leher. Kurang dari itu, proteksinya turun drastis.' },
      { t: 'Satu produk aktif dulu', d: 'Jangan tumpuk exfoliant + retinol + vitamin C sekaligus. Kenalan satu-satu.' },
      { t: 'Double cleansing kalau pakai sunscreen', d: 'First cleanser angkat minyak & sunscreen, second cleanser bersihkan sisanya.' },
      { t: 'Foto progress tiap minggu', d: 'Perubahan kulit itu pelan — foto dengan cahaya sama biar kelihatan bedanya.' },
    ],
    topics: ['Urutan skincare yang benar', 'Mitos skincare yang bikin boros', 'Kandungan andalan produk kita', 'Rutinitas pagi 3 langkah', 'Cara pilih produk buat pemula', 'Promo bundling minggu ini'],
    buyers: ['Cewek 18–28, pemula skincare', 'Ibu muda 25–35 yang sibuk', 'Cowok yang baru mulai skincare', 'Remaja dengan kulit berjerawat'],
    pains: ['Kulit kusam padahal udah rajin cuci muka', 'Bekas jerawat susah pudar', 'Takut produk abal-abal / merkuri', 'Bingung urutan & pilih produk', 'Kulit sensitif gampang breakout'],
    desires: ['Tampil pede tanpa makeup tebal', 'Kulit sehat glowing natural', 'Rutinitas simpel yang konsisten'],
    usps: ['Ber-BPOM & ramah pemula', 'Formula ringan non-comedogenic', 'Harga terjangkau kualitas premium'],
    forbiddenDefault: 'menyembuhkan, memutihkan permanen, 100% ampuh, tanpa efek samping',
    certDefault: 'BPOM',
    niche: 'skincare & kulit sehat',
  },
  fnb: {
    tags: ['kulinerlokal', 'jajananviral', 'makananenak', 'reviewmakanan', 'foodiegram', 'idejajan', 'kulineran', 'menuandalan'],
    visuals: ['steam mengepul dari mangkok panas', 'close-up tarikan keju / kuah disiram', 'suasana outlet ramai', 'proses masak di dapur', 'tangan nyocol saus slow-mo', 'reaksi first bite pelanggan'],
    props: ['menu andalan', 'meja bersih', 'ring light', 'tripod HP'],
    mistakes: [
      { t: 'Datang pas jam ramai', d: 'Jam 12–13 dan 19–20 paling padat. Datang di luar itu = nggak antre, makanan lebih cepat.' },
      { t: 'Langsung pesan level tertinggi', d: 'Naik bertahap — lidah butuh kenalan dulu biar tetap bisa nikmatin rasanya.' },
      { t: 'Nggak cek menu paket', d: 'Paket/bundling hampir selalu lebih hemat daripada pesan satuan.' },
      { t: 'Take away tanpa tips reheat', d: 'Panaskan terpisah kuah dan isian biar teksturnya balik seperti baru.' },
      { t: 'Skip menu hidden gem', d: 'Menu paling laris belum tentu paling enak — yang jarang disorot sering jadi favorit pelanggan setia.' },
    ],
    signs: [
      { t: 'Butuh comfort food hari ini', d: 'Habis hari yang panjang, kamu berhak makan enak tanpa mikir.' },
      { t: 'Bosen menu itu-itu aja', d: 'Waktunya coba rasa baru — mulai dari yang paling direkomendasiin.' },
      { t: 'Nyari tempat nongkrong baru', d: 'Yang nyaman buat lama-lama, harga tetap ramah.' },
      { t: 'Laper tengah malam', d: 'Cek jam buka kami — bisa jadi penyelamat kamu.' },
      { t: 'Pengen traktir tanpa boncos', d: 'Ada paket berdua yang harganya masuk akal.' },
    ],
    myths: [
      { m: 'Makanan enak pasti mahal', f: 'Rasa itu soal resep dan bahan yang diracik benar, bukan soal harga.' },
      { m: 'Pedas cuma nyiksa doang', f: 'Pedas yang pas justru mengangkat rasa — makanya ada level, biar semua kebagian.' },
      { m: 'Take away pasti kalah enak', f: 'Dengan packing yang benar dan tips reheat, rasanya nyaris sama.' },
      { m: 'Tempat rame = cuma hype', f: 'Rame yang bertahan berbulan-bulan itu bukan hype, itu rasa yang konsisten.' },
    ],
    tips: [
      { t: 'Pesan di jam sepi', d: 'Sebelum jam 12 atau setelah jam 8 malam — antrean pendek, pesanan lebih cepat.' },
      { t: 'Kombinasi menu paling pas', d: 'Yang gurih-pedas paling cocok ditemani yang manis-dingin. Percaya deh.' },
      { t: 'Reheat yang benar', d: 'Pisahkan kuah, panaskan bertahap. Microwave 30 detik lebih baik daripada 2 menit sekaligus.' },
      { t: 'Order bareng lebih hemat', d: 'Gabung pesanan dengan teman — hemat ongkir, bisa ambil paket.' },
      { t: 'Cek promo hari tertentu', d: 'Banyak promo muncul di hari kerja pas sepi — follow biar nggak kelewat.' },
    ],
    topics: ['Menu baru / menu andalan', 'Behind the scene dapur kami', 'Cara order biar hemat', 'Promo opening / diskon', 'Review jujur pelanggan', 'Level pedas mana kamu?'],
    buyers: ['Anak sekolah & mahasiswa', 'Pekerja kantoran 22–35', 'Keluarga muda', 'Anak nongkrong 16–25'],
    pains: ['Budget tipis tapi pengen makan enak', 'Bosen menu yang itu-itu aja', 'Susah cari tempat nongkrong nyaman', 'Takut zonk coba tempat baru'],
    desires: ['Makan enak tanpa bikin dompet nangis', 'Tempat nongkrong yang instagramable', 'Jajanan yang bikin nagih'],
    usps: ['Harga ramah pelajar', 'Resep otentik turun-temurun', 'Porsi besar rasa konsisten'],
    forbiddenDefault: 'menyehatkan, menyembuhkan, bikin kurus/diet',
    certDefault: 'Halal',
    niche: 'makan enak',
  },
  fashion: {
    tags: ['ootdindo', 'fashionlokal', 'mixandmatch', 'outfitinspo', 'lokalbrand', 'stylingtips', 'ootdhijab', 'fashionmurah'],
    visuals: ['transisi ganti outfit (whip pan)', 'detail jahitan & bahan close-up', 'mirror selfie OOTD', 'flat lay outfit di kasur', 'jalan ke arah kamera low angle', 'before-after styling'],
    props: ['3 outfit siap ganti', 'cermin besar', 'gantungan baju', 'tripod HP'],
    mistakes: [
      { t: 'Beli karena lucu, bukan karena cocok', d: 'Cek dulu: bisa dipadukan dengan minimal 3 item yang sudah kamu punya?' },
      { t: 'Ukuran nanggung biar "motivasi"', d: 'Pakaian yang pas hari ini selalu lebih enak dilihat daripada yang muat nanti.' },
      { t: 'Nyuci semua bahan dengan cara sama', d: 'Satin, rajut, dan linen punya perlakuan beda. Salah cuci = umur pendek.' },
      { t: 'Warna rame semua di satu outfit', d: 'Aturan aman: maksimal 3 warna, salah satunya netral.' },
      { t: 'Ngikutin tren tapi nggak nyaman', d: 'Gaya terbaik itu yang bikin kamu jalan lebih pede, bukan yang lagi viral doang.' },
    ],
    signs: [
      { t: 'Lemari penuh tapi "nggak ada baju"', d: 'Tandanya kamu butuh basic yang gampang di-mix, bukan baju baru yang ramai.' },
      { t: 'Outfit sama tiap minggu', d: 'Satu-dua statement piece bisa bikin rotasi lamamu terasa baru.' },
      { t: 'Bingung tiap ada acara', d: 'Punya 1 outfit andalan per jenis acara itu menyelamatkan hidup.' },
      { t: 'Baju cepat melar / pudar', d: 'Kualitas bahan menentukan — murah yang cepat rusak itu sebenarnya mahal.' },
    ],
    myths: [
      { m: 'Fashionable harus branded', f: 'Styling yang benar mengalahkan logo. Brand lokal sekarang kualitasnya serius.' },
      { m: 'Warna gelap selalu aman', f: 'Aman iya, tapi warna earth tone yang tepat bikin kulitmu lebih hidup.' },
      { m: 'Badan tertentu nggak cocok gaya tertentu', f: 'Bukan nggak cocok — cuma belum ketemu cutting yang tepat.' },
      { m: 'Baju bagus pasti nggak nyaman', f: 'Bahan yang benar bisa dua-duanya. Nyaman itu bagian dari desain.' },
    ],
    tips: [
      { t: 'Rumus 3 warna', d: 'Dua netral + satu aksen. Langsung kelihatan niat tanpa berlebihan.' },
      { t: 'Capsule wardrobe 10 item', d: 'Sepuluh basic yang saling nyambung = 30+ kombinasi outfit.' },
      { t: 'Setrika uap untuk bahan halus', d: 'Satin dan rajut jangan kena setrika langsung — pakai uap atau lapisi kain.' },
      { t: 'Proporsi atas-bawah', d: 'Atasan longgar, bawahan rapi — atau sebaliknya. Jangan longgar dua-duanya.' },
      { t: 'Aksesori sebagai penutup', d: 'Outfit simpel + 1 aksesori tepat > outfit ramai tanpa arah.' },
    ],
    topics: ['Mix & match 1 item jadi 3 gaya', 'Koleksi/drop terbaru', 'Tips rawat bahan', 'OOTD sesuai acara', 'Promo & restock', 'Behind the scene produksi'],
    buyers: ['Cewek 18–30 suka OOTD', 'Hijabers yang cari gaya simpel', 'Cowok streetwear 17–27', 'Wanita kantoran 25–35'],
    pains: ['Bingung mix & match', 'Baju online sering zonk (bahan/ukuran)', 'Pengen gaya bagus budget terbatas', 'Susah cari ukuran yang pas'],
    desires: ['Tampil beda tanpa ribet', 'Outfit nyaman dipakai seharian', 'Gaya konsisten yang "gue banget"'],
    usps: ['Bahan premium harga lokal', 'Size inclusive S–XXL', 'Desain limited tiap drop'],
    forbiddenDefault: 'bikin langsing, anti melar selamanya',
    niche: 'outfit & gaya',
    certDefault: '',
  },
  service: {
    tags: ['jasaprofesional', 'umkmindonesia', 'solusipraktis', 'tipsrumah', 'jasaterpercaya', 'layananrumah', 'servismurah', 'infobermanfaat'],
    visuals: ['before-after hasil pengerjaan', 'proses kerja time-lapse', 'close-up alat & tangan bekerja', 'testimoni pelanggan on-camera', 'tim menyapa kamera di lokasi', 'checklist di clipboard'],
    props: ['alat kerja utama', 'seragam/atribut tim', 'hasil kerja yang rapi'],
    mistakes: [
      { t: 'Nunggu rusak parah baru panggil', d: 'Perawatan rutin selalu lebih murah daripada perbaikan besar. Selalu.' },
      { t: 'Pilih yang termurah tanpa cek ulasan', d: 'Murah tapi dua kali kerja = lebih mahal. Cek portofolio & ulasan dulu.' },
      { t: 'Nggak nanya garansi', d: 'Jasa yang berani kasih garansi = yakin sama kualitas kerjanya.' },
      { t: 'DIY untuk hal berisiko', d: 'Beberapa hal boleh coba sendiri. Sisanya lebih aman (dan hemat) diserahkan ahlinya.' },
      { t: 'Nggak minta rincian harga di awal', d: 'Rincian tertulis di awal menghindari biaya siluman di akhir.' },
    ],
    signs: [
      { t: 'Sudah lebih dari 6 bulan nggak diservis', d: 'Performa turun pelan-pelan itu sering nggak kerasa — sampai tiba-tiba rusak.' },
      { t: 'Ada suara / bau / tanda aneh', d: 'Tanda kecil hari ini = kerusakan besar bulan depan kalau didiamkan.' },
      { t: 'Tagihan naik tanpa sebab jelas', d: 'Alat yang nggak efisien diam-diam boros. Servis bisa balikin efisiensinya.' },
      { t: 'Udah coba benerin sendiri, tetap balik lagi', d: 'Kalau masalah berulang, akar masalahnya belum ketemu.' },
    ],
    myths: [
      { m: 'Servis rutin cuma buang uang', f: 'Data bilang sebaliknya: perawatan rutin memperpanjang umur alat 2–3x lipat.' },
      { m: 'Semua tukang sama saja', f: 'Beda pengalaman, beda alat, beda garansi. Hasilnya kelihatan setelah 3 bulan.' },
      { m: 'Harga murah pasti untung', f: 'Kalau harus panggil dua kali, yang murah jadi yang paling mahal.' },
      { m: 'Bisa ditunda, masih jalan kok', f: 'Menunda itu bunga pinjaman — makin lama, makin mahal bayarnya.' },
    ],
    tips: [
      { t: 'Jadwalkan sebelum musim ramai', d: 'Order di masa sepi = lebih cepat dilayani, kadang dapat harga lebih baik.' },
      { t: 'Foto kondisi sebelum & sesudah', d: 'Dokumentasi bikin kamu tahu persis apa yang dikerjakan.' },
      { t: 'Tanya estimasi umur & perawatan', d: 'Teknisi yang baik ninggalin ilmu, bukan cuma hasil kerja.' },
      { t: 'Simpan kontak yang terbukti bagus', d: 'Vendor langganan yang paham riwayat alatmu = kerja lebih cepat & tepat.' },
    ],
    topics: ['Before-after project terbaru', 'Tanda kamu butuh jasa kami', 'Tips perawatan sendiri di rumah', 'Kenapa harga kami segini (transparansi)', 'Testimoni pelanggan', 'Promo musiman'],
    buyers: ['Pemilik rumah 28–45', 'Anak kos / perantau', 'Pemilik usaha kecil', 'Keluarga sibuk yang butuh praktis'],
    pains: ['Takut kena harga tembak', 'Susah cari yang bisa dipercaya', 'Nggak sempat urus sendiri', 'Pernah kecewa hasil asal-asalan'],
    desires: ['Beres tanpa drama', 'Harga jelas di awal', 'Hasil rapi & bergaransi'],
    usps: ['Garansi tertulis', 'Harga transparan di awal', 'Tim berpengalaman & bersertifikat'],
    forbiddenDefault: 'pasti 100%, termurah se-Indonesia',
    niche: 'perawatan & servis',
    certDefault: '',
  },
  edu: {
    tags: ['belajarbareng', 'tipsbelajar', 'upgradeskill', 'kelasonline', 'produktivitas', 'karirimpian', 'selfdevelopment', 'infobeasiswa'],
    visuals: ['close-up tangan nulis / ngetik', 'layar materi dengan highlight', 'talking head + poin muncul di layar', 'time-lapse belajar', 'testimoni murid on-camera', 'before-after hasil karya murid'],
    props: ['laptop/buku', 'papan tulis kecil', 'materi contoh'],
    mistakes: [
      { t: 'Nonton materi doang tanpa praktik', d: 'Ilmu nempel karena dipakai. Rasio idealnya 30% belajar, 70% praktik.' },
      { t: 'Belajar maraton semalaman', d: 'Otak menyimpan lewat pengulangan singkat — 25 menit fokus lebih ampuh dari 4 jam begadang.' },
      { t: 'Ngoleksi kelas tapi nggak diselesaikan', d: 'Satu kelas selesai + dipraktikkan > lima kelas setengah jalan.' },
      { t: 'Nggak punya target spesifik', d: '"Pengen bisa" itu bukan target. "Bikin 1 portofolio dalam 30 hari" — itu target.' },
      { t: 'Belajar sendirian terus', d: 'Komunitas & mentor memangkas trial-error bertahun-tahun jadi hitungan bulan.' },
    ],
    signs: [
      { t: 'Skill kamu mulai ketinggalan di kerjaan', d: 'Industri gerak cepat — yang berhenti belajar pelan-pelan tergeser.' },
      { t: 'Gaji stuck padahal kerja makin banyak', d: 'Kadang bukan kurang kerja keras, tapi kurang skill yang dibayar mahal.' },
      { t: 'Scroll tutorial tapi nggak pernah mulai', d: 'Kamu nggak butuh info lagi — kamu butuh struktur dan deadline.' },
      { t: 'Pengen pindah karir tapi bingung mulai', d: 'Roadmap yang jelas mengubah "suatu saat" jadi "bulan ini".' },
    ],
    myths: [
      { m: 'Udah telat buat belajar skill baru', f: 'Rata-rata orang ganti arah karir 3–5 kali seumur hidup. Telat itu mitos.' },
      { m: 'Harus bakat dulu baru bisa', f: 'Bakat cuma mempercepat awal. Konsistensi yang menentukan hasil akhirnya.' },
      { m: 'Belajar online nggak seefektif offline', f: 'Efektif itu soal kurikulum + praktik + feedback, bukan lokasinya.' },
      { m: 'Sertifikat = jaminan kerja', f: 'Portofolio hasil praktik jauh lebih dilirik daripada selembar sertifikat.' },
    ],
    tips: [
      { t: 'Teknik 25 menit (pomodoro)', d: 'Fokus 25 menit, istirahat 5. Empat putaran sehari > belajar maraton seminggu sekali.' },
      { t: 'Belajar buat diajarkan', d: 'Jelaskan ulang materi ke orang lain (atau kamera) — cara tercepat menguji paham.' },
      { t: 'Rakit portofolio sejak hari 1', d: 'Setiap latihan = calon isi portofolio. Jangan tunggu "udah jago".' },
      { t: 'Cari teman seperjuangan', d: 'Akuntabilitas publik bikin kamu 65% lebih mungkin konsisten.' },
      { t: 'Review mingguan 15 menit', d: 'Tiap minggu: apa yang nempel, apa yang belum, minggu depan fokus apa.' },
    ],
    topics: ['Tips belajar efektif', 'Cerita sukses murid', 'Isi kurikulum & cara daftar', 'Mitos belajar yang menghambat', 'Promo batch baru', 'Skill yang lagi dicari industri'],
    buyers: ['Mahasiswa & fresh graduate', 'Karyawan yang mau naik level', 'Job seeker pindah karir', 'Ibu rumah tangga cari cuan online'],
    pains: ['Bingung mulai belajar dari mana', 'Nggak konsisten, gampang nyerah', 'Takut ilmunya nggak kepakai', 'Budget kursus terbatas'],
    desires: ['Punya skill yang dibayar mahal', 'Karir naik / pindah bidang', 'Bisa cuan dari rumah'],
    usps: ['Mentor praktisi aktif', 'Kurikulum berbasis praktik & portofolio', 'Komunitas alumni yang aktif'],
    forbiddenDefault: 'pasti langsung kerja, dijamin gaji 2 digit',
    niche: 'belajar skill baru',
    certDefault: '',
  },
  other: {
    tags: ['umkmindonesia', 'produklokal', 'bisnislokal', 'supportlokal', 'infoproduk', 'rekomendasiproduk', 'belanjahemat', 'usahakecil'],
    visuals: ['unboxing produk', 'proses produksi behind the scene', 'produk dipakai di kehidupan nyata', 'before-after pakai produk', 'testimoni pelanggan', 'packing pesanan time-lapse'],
    props: ['produk andalan', 'meja bersih', 'packaging'],
    mistakes: [
      { t: 'Beli tanpa cek kebutuhan asli', d: 'Tanya dulu: masalah apa yang mau diselesaikan? Itu yang menentukan pilihan.' },
      { t: 'Tergiur murah, lupa cek kualitas', d: 'Barang murah yang cepat rusak sebenarnya lebih mahal dari yang awet.' },
      { t: 'Nggak baca cara pakai/rawat', d: 'Umur produk sering ditentukan cara pakainya, bukan kualitasnya.' },
      { t: 'Skip ulasan pembeli lain', d: 'Ulasan bintang 3 sering lebih jujur daripada bintang 5 — baca yang itu.' },
      { t: 'Nunda beli pas lagi promo', d: 'Kalau memang dibutuhkan, promo adalah waktu terbaik. Nunda = beli mahal nanti.' },
    ],
    signs: [
      { t: 'Yang lama udah nggak optimal', d: 'Kalau lebih sering ngerepotin daripada membantu, itu tanda waktunya ganti.' },
      { t: 'Sering pinjam punya orang', d: 'Kalau kamu terus meminjam benda yang sama, kamu sebenarnya membutuhkannya.' },
      { t: 'Waktu kebuang buat hal kecil', d: 'Alat yang tepat mengembalikan waktumu — dan waktu itu nggak bisa dibeli.' },
      { t: 'Budget ada, tapi ragu terus', d: 'Riset secukupnya, lalu putuskan. Ragu berkepanjangan juga ada biayanya.' },
    ],
    myths: [
      { m: 'Produk lokal kalah kualitas', f: 'Banyak produk lokal sekarang setara impor — bedanya cuma gengsi nama.' },
      { m: 'Harga mahal pasti bagus', f: 'Harga mencerminkan banyak hal — termasuk iklan. Cek spesifikasi, bukan gengsinya.' },
      { m: 'Semua produk sejenis sama saja', f: 'Detail kecil (bahan, layanan, garansi) yang membedakan pengalaman 6 bulan ke depan.' },
      { m: 'Ulasan bagus pasti asli', f: 'Cek ulasan bintang 3 dan foto dari pembeli — di situ cerita jujurnya.' },
      { m: 'Belanja online selalu berisiko', f: 'Risiko turun drastis kalau cek 3 hal: spesifikasi, ulasan buruk, dan kebijakan retur.' },
    ],
    tips: [
      { t: 'Rumus beli: butuh > suka', d: 'Suka itu bonus. Mulai dari daftar kebutuhan, baru pilih yang paling disuka.' },
      { t: 'Cek 3 hal sebelum checkout', d: 'Bahan/spesifikasi, ulasan buruknya, dan kebijakan retur. Tiga menit yang menyelamatkan.' },
      { t: 'Rawat sesuai panduan', d: 'Produk yang dirawat benar umurnya bisa 2x lipat. Panduannya biasanya cuma 5 baris.' },
      { t: 'Manfaatkan garansi', d: 'Simpan nota & kemasan. Garansi cuma berguna kalau kamu bisa klaim.' },
    ],
    topics: ['Kenalan sama produk kami', 'Behind the scene produksi', 'Cara pakai & rawat yang benar', 'Testimoni pelanggan', 'Promo & bundling', 'Tips memilih produk sejenis'],
    buyers: ['Pembeli online 20–35', 'Keluarga muda', 'Pemburu produk lokal berkualitas'],
    pains: ['Takut zonk belanja online', 'Bingung bandingin produk sejenis', 'Budget terbatas pengen yang awet'],
    desires: ['Belanja sekali, puas lama', 'Dapat barang sesuai ekspektasi', 'Dukung produk lokal tanpa kompromi'],
    usps: ['Kualitas dicek satu-satu sebelum kirim', 'Garansi & retur mudah', 'Buatan lokal, standar ekspor'],
    forbiddenDefault: 'terbaik se-Indonesia, 100% tanpa cacat',
    niche: 'belanja pintar',
    certDefault: '',
  },
};
const bankOf = c => BANK[c.category] || BANK.other; // bank kategori brand (default: other)

/* ═══════════════════════ ENGINE: FAKTA BRAND & VOICE ═══════════════════════ */
const splitList = s => String(s || '').split(/[,;\n•]+/).map(x => x.trim()).filter(x => x.length > 1); // pecah string jadi list
const firstOf = (arr, d) => (arr && arr.length ? arr[0] : d); // elemen pertama atau default
const lower1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s; // kecilkan huruf pertama

// Kumpulkan semua fakta brand jadi satu objek yang dipakai generator
function factsOf(c) {
  const bank = bankOf(c);
  const products = splitList(c.products);
  const pains = splitList(c.painpoint);
  const desires = splitList(c.desire);
  return {
    c, bank,
    name: (c.name || 'brand kamu').trim(),
    products,
    product: firstOf(products, 'produk andalan kami'),
    pains: pains.length ? pains : [firstOf(bank.pains, 'masalah yang sering kamu alami')],
    pain: firstOf(pains, lower1(firstOf(bank.pains, 'masalah yang itu-itu terus'))),
    desires: desires.length ? desires : bank.desires,
    desire: firstOf(desires, lower1(firstOf(bank.desires, 'hasil yang kamu pengen'))),
    usp: (c.usp || '').trim(),
    proof: (c.proof || '').trim(),
    price: (c.price || '').trim(),
    promo: (c.promo || '').trim(),
    area: (c.area || '').trim(),
    buyer: (c.buyer || '').trim(),
    sapaan: (c.sapaan || 'kamu').trim(),
    signature: (c.signature || '').trim(),
    cta: (c.cta || 'Save & share ke temanmu').trim(),
    goal: (c.goal || 'Interaksi').trim(),
    tone: mergeTones(toneList(c)),
    emojiPref: c.emoji || 'secukupnya',
  };
}

// Emoji sesuai preferensi brand
function emo(f, ...opts) {
  if (f.emojiPref === 'tanpa emoji') return '';
  return ' ' + (opts[0] || '✨');
}
// buang semua emoji dari teks kalau brand pilih "tanpa emoji"
function emoAll(f, s) { return f.emojiPref === 'tanpa emoji' ? s.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2728}\u{2764}]/gu, '') : s; }

// Kata terlarang → pengganti aman (compliance BPOM & umum)
const SAFE_SWAPS = [
  [/\bmenyembuhkan\b/gi, 'membantu merawat'],
  [/\bmengobati\b/gi, 'membantu merawat'],
  [/\bmemutihkan\b/gi, 'membantu mencerahkan tampilan'],
  [/\bmenghilangkan\b/gi, 'membantu menyamarkan'],
  [/\b100% ampuh\b/gi, 'terasa bedanya'],
  [/\bpermanen\b/gi, 'tahan lama'],
  [/\bpaling murah\b/gi, 'ramah di kantong'],
  [/\bterbaik se-?indonesia\b/gi, 'jadi andalan banyak orang'],
  [/\btanpa efek samping\b/gi, 'formulanya lembut'],
];
// bersihkan teks: swap kata terlarang umum + hapus kata haram khusus brand
function sanitize(text, f) {
  let out = text;
  for (const [re, sub] of SAFE_SWAPS) out = out.replace(re, sub); // ganti klaim berisiko dgn versi aman
  for (const w of splitList(f.c.forbidden).concat(splitList(f.c.forbiddenClaims))) { // kata haram brand → coret
    if (w.length < 3) continue;
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '—');
  }
  return emoAll(f, out).replace(/\s+—\s*—\s*/g, ' ').replace(/ {2,}/g, ' ');
}

/* ── HASHTAG BUILDER ── */
const MEGA_TAGS = ['fyp', 'foryou', 'foryoupage', 'viral', 'trending', 'instagood', 'love', 'like4like', 'follow', 'explore', 'reels', 'tiktok', 'skincare', 'makanan', 'fashion', 'indonesia'];
// jadikan teks satu hashtag (huruf/angka saja, maks 3 kata digabung)
function slugTag(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).slice(0, 3).join(''); }
// rakit hashtag: PRODUK yang dijual dulu (paling nyambung ke brand) + topik + niche + branded + lokal
function buildHashtags(f, topic, rng) {
  const tags = [];
  const add = t => { const s = slugTag(t); if (s && s.length > 2 && s.length < 28 && !tags.includes(s)) tags.push(s); };
  const STOP = /^(dan|yang|untuk|dengan|atau|the|and|for|buat|dari|paket|series|new|jual|beli|premium|original)$/i;
  // 1) PRODUK/jasa yang dijual → hashtag paling relevan ke brand (frasa + kata kunci)
  (f.products || []).slice(0, 3).forEach(pr => {
    add(pr);                                                        // frasa produk, mis. #customjaswedding
    String(pr).toLowerCase().split(/[\s,/&-]+/).filter(w => w.length >= 3 && !STOP.test(w)).slice(0, 2).forEach(add); // kata kunci, mis. #jas #wedding
  });
  if (topic) add(topic);                                           // topik hari ini
  pickN(rng, f.bank.tags, 2).forEach(add);                         // niche (buat jangkauan)
  add(f.name);                                                     // branded
  if (f.area && !/nasional|online|seluruh/i.test(f.area)) {        // lokal
    const kota = f.area.split(/[,&/]| dan /)[0].trim();
    const base = (f.products && f.products[0]) ? slugTag(String(f.products[0]).split(/\s+/)[0]) : (f.bank.tags[0] || 'info');
    add((base || 'info') + kota);
  }
  while (tags.length < 4) add(pick(rng, f.bank.tags));             // pelengkap kalau masih kurang
  return tags.slice(0, 6).map(t => '#' + t);
}

/* ── HOOK PATTERNS (dipakai script, carousel, caption, ide) ── */
/* ── Bank hook siap-pakai (brief "250 HOOK": Jualan / Storytelling / Edukasi / Motivasi).
   Template pakai placeholder X/Y/Z/# yang diisi fakta brand secara ber-seed → tetap deterministik
   & lolos sanitize(). Dipakai lewat "Gaya hook" (menuOnly), bukan diacak ke pool default. ── */
const HOOK_TPL = {
  jualan: [
    'Akhirnya gue nemu X yang nggak bikin Y', 'Di harga segini, susah cari X yang lebih dari ini',
    'X ini bisa bikin kamu Y', 'X, tapi ternyata ini', 'Bikin kesel—X bisa ngasih Y cuma sekali coba',
    'Buat kalian yang mau Y tapi nggak mau ribet', 'X ini beneran bisa Y', 'Fix, ini X yang lagi gue rekomendasiin sekarang',
    'Ini bukan cuma X, tapi juga Y', 'Yang ini jangan sampai kehabisan lagi', 'Kesel nggak sih kalau belum nemu X yang pas?',
    'Awalnya gue kira X biasa aja, ternyata Y', 'Satu X sebenernya dapet apa aja?', 'X sebagus ini, tapi harganya cuma # ribuan',
    'Murah, tapi kualitasnya buat Y', 'Ini X, tapi ternyata brand lokal', 'Gila sih—ini cuma # ribuan',
    'Ini agak gila, pernah lihat X harganya sereceh ini?', 'X ini kelihatannya sepele, tapi wajib dicoba',
    'Jangan beli X asal-asalan, kamu bakal nyesel', 'Skip yang gitu-gitu aja, pilih X', 'Masih pakai cara lama? Saatnya ganti ke X',
    'Kalau budget mepet, X ini cukup banget buat Y', 'Kalau kamu mau Y, X ini harus kamu coba',
    'Pengen Y tanpa ribet? Ini jalan pintasnya', 'Rekomendasi X yang ramah di kantong',
    'Satu hal yang bikin aku ganti ke X', 'Sejauh ini, X yang paling mendekati Y', 'Sekarang nggak perlu ribet, cukup pakai X',
    'Standar baru X yang bikin yang lain kalah', 'X ini baru rilis, tapi langsung rame',
    'X ini rating-nya nyaris sempurna', 'X ini harganya bahkan nggak nyentuh angka #', 'X ini ramah dompet, serius',
    'Hidupku berubah gara-gara X ini', 'Harga ratusan ribu, rasa jutaan', 'Kamu yang masih ngalamin Y, ini buat kamu',
    'Masih yakin mau yang gitu-gitu aja?', 'Buat kamu yang lagi nyari X yang bisa Y', 'Percaya nggak, X ini harganya cuma segini',
    'Ini X yang belum pernah aku coba sebelumnya', 'Ini X yang aku beli karena Y', 'Guys, ini mungkin X paling worth it yang pernah aku beli online',
    'X paling spesial yang selalu kepakai di hidup aku', 'Mungkin ini X terbaik yang pernah aku coba',
  ],
  story: [
    'Apa jadinya kalau X?', 'Kok bisa sih, X segampang ini?', 'Kalau kamu mau Y, kamu harus tau X',
    'Ada satu X yang kata orang Y', 'Gue ingetin ya, jangan asal soal X', 'Gue punya cerita tentang X',
    'Gue nggak kebayang sih, X sepraktis ini', 'Gue sebenernya bingung mulai dari mana soal X',
    'Kalian tau nggak, X lagi rame akhir-akhir ini?', 'Ini mindblowing sih, kalian tau nggak soal X…',
    'X itu gila banget sih…', 'Gue yakin banyak yang suka X, tapi banyak juga yang belum tau Y',
    'Aku nggak tau ini cuma aku, tapi setelah pakai X aku jadi Y', 'Bukankah X ini paling seru buat diceritakan?',
    'Cuma sedikit X di luar sana yang beneran Y', 'Percaya atau nggak, ini soal X', 'Ini kenapa X itu penting',
    'Jadiin ini pengingat soal X', 'Kalau kamu gampang tertarik sama X, lanjut nonton', 'Tiba-tiba pengen cerita soal X',
    'Oke, jadi awalnya viral gara-gara X', 'Siapa di sini yang punya masalah sama X?',
    'Bayangin kamu baru nemu X, dan ini pertama kalinya kamu Y', 'Jadi ada X, dan dia punya cerita',
    'Pengalaman pertamaku pakai X', 'Jujur, dulu aku ragu sama X',
  ],
  edukasi: [
    'Ternyata ini salah satu X yang bikin kamu bisa Y', 'Kalau X-nya bener, akhirnya kita Y', 'Kata siapa X itu ribet?',
    'Tau nggak kenapa X itu penting buat Y?', 'Siapa di sini yang punya masalah tapi belum nemu X?',
    'Mau Y makin lancar? Ini tips soal X', 'Biar sama-sama paham, ini yang terjadi kalau salah pilih X',
    'Lakuin ini, dan kamu bakal berhenti Y', 'Jujur aja, siapa di sini yang masih salah soal X?',
    'Siapa di sini yang dulu ngalamin ini, sekarang udah Y?', 'Gimana caranya biar Y makin naik?',
    'Bayangin aja, tiba-tiba kamu bisa Y', 'Ini dia X paling worth it buat Y', 'Gara-gara penasaran sama X, akhirnya aku Y',
    'Pertama kali nyobain X', 'Banyak yang nggak percaya kalau X itu bisa Y', 'X yang wajib kamu tau',
    'Kalau kamu lagi cari Y, ini jawabannya', 'Sekarang kamu bisa Y pakai X', 'Menurutku X itu bikin Y karena satu hal ini',
    'Ini cara mulai pakai X dari nol', 'Aku suka X, tapi di sini aku bongkar semuanya', 'Ini # hal soal X yang jarang dibahas',
    'Aku bakal kasih trik biar kamu nggak salah soal X', 'Kenyataan soal X yang perlu kamu tau', '# X ter-Y versi aku',
    'Cara pakai X biar hasilnya Y', 'Alasan kenapa kamu butuh X…', 'Stop salah pilih X buat kamu yang mau Y',
    'Cara Y pakai X', 'Mana yang kalian pilih buat Y?', 'Kalian harus tau satu hal soal X ini',
    'Cara X yang bikin Y', 'Hati-hati buat kamu yang masih salah soal X', 'Fakta tentang X yang perlu kalian tau',
    'Hari ini lagi rame nih soal X', 'Bukan cuma X, tapi juga Y', 'Kalau kamu masih bingung soal X, sini aku kasih tau',
  ],
  motivasi: [
    'Ini hal yang mengubah caraku soal X', 'Kalau sekarang kamu belum Y, yaudah gapapa', 'Kalau ada kesempatan buat X, coba dulu aja',
    'Kapan kamu mau mulai X?!', 'X itu bukan soal cari Y sesaat', 'Hal pertama yang harus kamu tau sebelum X',
    'Buat kamu yang lagi berjuang soal Y — aku mau nanya', 'Satu-satunya cara Y itu lewat X', 'Kalau mau Y, jangan cuma fokus di hasilnya',
    'Ini buat kalian yang lagi nyari X', 'Jadi kata kuncinya: kalau mau Y, kamu harus X', '# cara paling gampang buat kamu Y',
    'Video ini buat kamu yang masih ragu soal X', 'Kamu mau Y? Seriusan deh, kapan mau mulai?',
    'Coba kalau aku bilang X ini bisa Y?', 'Kamu tau persis apa yang kamu butuh soal X', 'Aku mau kamu bayangin sebentar… kamu udah Y',
    'Stop nunda X buat masa depan kamu', 'Seberapa banyak X yang cukup buat Y?', 'Lo nggak butuh yang ribet, cukup X',
    'Gue pikir nggak semua orang ngerti pentingnya X', 'Kamu nggak akan Y kalau nggak mulai dari X',
  ],
};
// isi placeholder X/Y/Z/# dengan fakta brand (ber-seed → deterministik)
function hookFillNum(rng) { return pick(rng, ['3', '5', '7', '10', '15', '20', '30']); }
function fillHookTemplate(tpl, f, rng, topic) {
  const X = lower1(topic ? topic : f.product);
  const desires = (f.desires && f.desires.length) ? f.desires : ['hasil yang kamu mau'];
  const Y = lower1(pick(rng, desires));
  const zPool = desires.concat([f.usp, f.proof].filter(Boolean)).filter(v => lower1(v) !== Y);
  const Z = lower1(zPool.length ? pick(rng, zPool) : pick(rng, desires));
  return tpl.replace(/\bX\b/g, X).replace(/\bY\b/g, Y).replace(/\bZ\b/g, Z).replace(/#/g, hookFillNum(rng));
}

const HOOKS = [
  { id: 'problem', pattern: 'Problem hook',
    make: (f, t, rng) => ({ text: `${cap1(pick(rng, f.pains))}? Ini biang sama solusinya`,
      why: 'Tembak masalah audiens di detik 0. Yang lagi ngalamin langsung berhenti scroll.' }) },
  { id: 'pov', pattern: 'POV relatable',
    make: (f, t, rng) => ({ text: `POV: ${lower1(pick(rng, f.pains))}` + emo(f, '😩'),
      why: `Nunjuk langsung masalah ${f.buyer || 'audiensmu'} — yang ngerasa pasti berhenti scroll.` }) },
  { id: 'stop', pattern: 'Warning / stop',
    make: (f, t, rng) => ({ text: `STOP ${lower1(pick(rng, f.bank.mistakes).t)} — dengerin dulu`,
      why: 'Larangan memicu rasa takut-salah. Orang nonton sampai tahu jawabannya.' }) },
  { id: 'listicle', pattern: 'Listicle berangka',
    make: (f, t, rng) => ({ text: `${pick(rng, [3, 4, 5])} hal soal ${t ? lower1(t) : lower1(f.pain)} yang jarang dibahas`,
      why: 'Angka = janji isi yang jelas. Otak penasaran sampai poin terakhir.' }) },
  { id: 'question', pattern: 'Pertanyaan langsung',
    make: (f, t, rng) => ({ text: `${cap1(pick(rng, f.pains))}? Mungkin ini sebabnya`,
      why: 'Pertanyaan yang tepat sasaran bikin otak otomatis nyari jawabannya.' }) },
  { id: 'mitos', pattern: 'Kontrarian / mitos',
    make: (f, t, rng) => { const m = pick(rng, f.bank.myths); return { text: `"${m.m}" — ini mitos, dan ini faktanya`,
      why: 'Membantah keyakinan umum memicu rasa "hah, masa sih?" — hook paling kuat buat edukasi.' }; } },
  { id: 'secret', pattern: 'Curiosity gap',
    make: (f, t, rng) => ({ text: `Rahasia ${lower1(pick(rng, f.desires))} yang jarang diomongin`,
      why: 'Ada celah info yang sengaja belum dibuka — orang bertahan buat nutup celah itu.' }) },
  { id: 'beforeafter', pattern: 'Before / after',
    make: (f, t, rng) => ({ text: `Dulu ${lower1(f.pain)}. Sekarang? Beda cerita`,
      why: 'Transformasi = bukti. Orang pengen tahu caranya.' }) },
  { id: 'callout', pattern: 'Call-out audiens',
    make: (f, t, rng) => ({ text: `Kalau ${f.sapaan === 'Anda' ? 'Anda' : 'kamu'} ${lower1(f.buyer || 'lagi ngalamin ini')}, ini buat ${f.sapaan === 'Anda' ? 'Anda' : 'kamu'}`,
      why: 'Menyebut audiens spesifik bikin yang merasa langsung merasa dipanggil.' }) },
  { id: 'relate', pattern: 'Relatable struggle',
    make: (f, t, rng) => ({ text: `Yang ${lower1(pick(rng, f.pains))}, mana suaranya` + emo(f, '🙋'),
      why: 'Validasi perasaan audiens — komen "AKU BANGET" bakal rame sendiri.' }) },
  { id: 'challenge', pattern: 'Eksperimen / challenge',
    make: (f, t, rng) => ({ text: `${pick(rng, ['Kami coba', 'Tim kami tes'])} ${t ? lower1(t) : lower1(f.product)} selama ${pick(rng, [7, 14, 30])} hari — hasilnya?`,
      why: 'Format eksperimen punya cerita + hasil. Orang nonton demi ending-nya.' }) },
  { id: 'harga', pattern: 'Angka kejut',
    make: (f, t, rng) => ({ text: f.price ? `Mulai ${f.price.split(/[–-]/)[0].trim()} bisa dapet ${lower1(f.product)}? Serius` : `${cap1(lower1(f.product))} sebagus ini, harganya nggak masuk akal`,
      why: 'Angka konkret di detik pertama memancing rasa "kok bisa?"' }) },
  { id: 'jujur', pattern: 'Kejujuran radikal',
    make: (f, t, rng) => ({ text: `Jujur: ${lower1(pick(rng, [`${f.product} ini nggak cocok buat semua orang`, 'nggak semua yang viral itu bagus', 'kami pernah salah soal ini']))}`,
      why: 'Kejujuran itu langka di feed — langsung beda dari iklan biasa & bangun trust.' }) },
  { id: 'mistake', pattern: 'Kesalahan umum',
    make: (f, t, rng) => ({ text: `Kesalahan #1 yang bikin ${lower1(pick(rng, f.pains))}`,
      why: 'Orang takut sedang melakukan kesalahan yang sama — nonton buat memastikan.' }) },
  { id: 'nobody', pattern: 'Nggak ada yang ngasih tau',
    make: (f, t, rng) => ({ text: `Nggak ada yang ngasih tau ${sapa(f)} soal ${t ? lower1(t) : lower1(f.pain)}`,
      why: 'Klaim "info rahasia" bikin audiens merasa dapat bocoran yang orang lain nggak punya.' }) },
  { id: 'timesave', pattern: 'Hemat waktu/uang',
    make: (f, t, rng) => ({ text: `Andai ${sapa(f)} tau ini dari dulu — hemat ${pick(rng, ['waktu', 'uang', 'drama'])} banget`,
      why: 'Menyentuh penyesalan "coba dari kemarin" — emosi yang bikin orang nyimak & nge-save.' }) },
  { id: 'vs', pattern: 'Ini vs itu',
    make: (f, t, rng) => ({ text: `${cap1(lower1(f.product))} vs cara lama: bedanya kerasa banget`,
      why: 'Format perbandingan gampang dicerna & bikin produkmu jadi pilihan yang jelas.' }) },
  { id: 'number', pattern: 'Statistik mengejutkan',
    make: (f, t, rng) => ({ text: `${pick(rng, ['9 dari 10', '80% orang', 'Hampir semua'])} ${lower1(f.buyer || 'orang')} salah soal ini`,
      why: 'Angka besar terasa faktual & memancing "aku termasuk yang mana?"' }) },
  { id: 'wish', pattern: 'Pengandaian',
    make: (f, t, rng) => ({ text: `Bayangin ${lower1(pick(rng, f.desires))} tanpa ${lower1(f.pain)}`,
      why: 'Ajak audiens membayangkan hasil idealnya dulu — mereka jadi pengen tahu jalannya.' }) },
  { id: 'confession', pattern: 'POV karakter',
    make: (f, t, rng) => ({ text: `POV: ${sapa(f)} akhirnya nemu ${lower1(f.product)} yang beneran cocok`,
      why: 'POV positif = fantasi yang enak dibayangin; audiens memproyeksikan diri ke situ.' }) },
  { id: 'checklist', pattern: 'Tanda / checklist',
    make: (f, t, rng) => ({ text: `${pick(rng, [3, 5])} tanda ${sapa(f)} butuh ${lower1(f.product)} (jujur aja)`,
      why: 'Checklist bikin orang mengecek diri sendiri poin demi poin sampai habis.' }) },
  { id: 'trend', pattern: 'Reaksi tren',
    make: (f, t, rng) => ({ text: `Semua ${pick(rng, ['lagi ngomongin', 'ngira'])} ${t ? lower1(t) : lower1(f.pain)} — tapi ini yang kelewat`,
      why: 'Menumpang topik yang lagi ramai lalu kasih sudut baru = relevan sekaligus segar.' }) },
  // ── 4 gaya dari bank "250 HOOK" (menuOnly: hanya muncul kalau dipilih di menu Gaya hook) ──
  { id: 'jualan', pattern: 'Hook jualan', menuOnly: true,
    make: (f, t, rng) => ({ text: fillHookTemplate(pick(rng, HOOK_TPL.jualan), f, rng, t),
      why: 'Pola hook jualan langsung — nonjolin nilai, harga, atau keunggulan buat dorong beli.' }) },
  { id: 'story', pattern: 'Hook storytelling', menuOnly: true,
    make: (f, t, rng) => ({ text: fillHookTemplate(pick(rng, HOOK_TPL.story), f, rng, t),
      why: 'Pola hook cerita — buka dengan rasa penasaran/pengalaman, tarik orang buat nyimak sampai habis.' }) },
  { id: 'edukasi', pattern: 'Hook edukasi', menuOnly: true,
    make: (f, t, rng) => ({ text: fillHookTemplate(pick(rng, HOOK_TPL.edukasi), f, rng, t),
      why: 'Pola hook edukasi — janji "kamu bakal ngerti/bisa sesuatu", cocok buat konten memberi nilai.' }) },
  { id: 'motivasi', pattern: 'Hook motivasi', menuOnly: true,
    make: (f, t, rng) => ({ text: fillHookTemplate(pick(rng, HOOK_TPL.motivasi), f, rng, t),
      why: 'Pola hook motivasi/inspirasi — sentil mindset & aspirasi audiens biar merasa "ini gue banget".' }) },
];
// bikin n hook (opsional paksa satu id jadi hook #1), lalu sanitize hasilnya
function makeHooks(f, topic, rng, n, forceId) {
  n = n || 3;
  let picked;
  const forced = forceId ? HOOKS.find(h => h.id === forceId) : null;
  const pool = HOOKS.filter(h => !h.menuOnly); // bank 250-hook cuma dipakai kalau dipilih eksplisit
  if (forced) {
    const rest = pickN(rng, pool.filter(h => h.id !== forceId), Math.max(0, n - 1));
    picked = [forced, ...rest];
  } else {
    picked = pickN(rng, pool, n);
  }
  return picked.map(h => { const r = h.make(f, topic, rng); return { text: sanitize(cap1(r.text), f), pattern: h.pattern, why: r.why }; });
}
// menu tipe hook buat dipilih user (label ringkas). Semua id ada di HOOKS.
const HOOK_MENU = [
  ['problem', '😣 Problem'], ['question', '❓ Pertanyaan'], ['secret', '🤫 Curiosity gap'],
  ['listicle', '🔢 Listicle'], ['mitos', '⚡ Mitos vs fakta'], ['stop', '🚫 Warning/Stop'],
  ['pov', '🎭 POV relatable'], ['beforeafter', '🔄 Before-after'], ['number', '📊 Statistik'],
  ['mistake', '⚠️ Kesalahan umum'], ['challenge', '🧪 Eksperimen'], ['harga', '💸 Angka kejut'],
  ['jujur', '🫶 Kejujuran'], ['callout', '📣 Call-out'], ['timesave', '⏳ Penyesalan'],
  ['vs', '🥊 Ini vs itu'], ['relate', '🙋 Relatable'], ['wish', '🌈 Pengandaian'],
  ['checklist', '✅ Tanda/checklist'], ['trend', '🔥 Reaksi tren'], ['nobody', '🔓 Info rahasia'],
  ['confession', '💚 POV karakter'],
  // ── bank 250-hook (gaya) ──
  ['jualan', '💸 Jualan (bank)'], ['story', '📖 Storytelling (bank)'],
  ['edukasi', '🎓 Edukasi (bank)'], ['motivasi', '🌈 Motivasi (bank)'],
];

/* ═══════════════════════ GENERATOR KONTEN ═══════════════════════ */
// saran audio per vibe tone (dipakai script)
const SOUNDS = {
  santai: 'Audio trending tempo santai (lo-fi upbeat) — cek tab Reels trending hari ini',
  lucu: 'Sound komedi yang lagi naik (cek trending) atau voice over sendiri dengan tempo cepat',
  edu: 'Instrumental minimal volume rendah — biar voice over tetap jelas',
  premium: 'Instrumental elegan (piano/strings ringan), tanpa vokal',
  bold: 'Beat tegas dengan drop di detik 3 — pas ganti scene',
  hangat: 'Akustik hangat tempo pelan, volume di bawah voice over',
};
const sapa = f => f.sapaan === 'Anda' ? 'Anda' : f.sapaan; // bentuk sapaan brand
const closer = (f, rng) => { const c = pick(rng, f.tone.closers); return c ? ' ' + c : ''; }; // kata penutup khas tone (mis. "ya", "nih")
// skala durasi scene ke target total
function scaleDur(scenes, target) {
  const sum = scenes.reduce((a, s) => a + s.duration_sec, 0);
  let acc = 0;
  return scenes.map((s, i) => {
    let d = Math.max(2, Math.round(s.duration_sec * target / sum));
    if (i === scenes.length - 1) d = Math.max(2, target - acc);
    acc += d;
    return { ...s, duration_sec: d };
  });
}
const ostShort = s => { const w = String(s).replace(/["""]/g, '').split(/\s+/); return w.slice(0, 7).join(' ') + (w.length > 7 ? '…' : ''); }; // potong on-screen text jadi maks 7 kata

// GEN: script video (3 hook + adegan berdurasi + CTA), struktur menyesuaikan goal
function genScript(c, daily, seedN) {
  const rng = mulberry(c.id + '|script|' + (daily.topic || '') + '|' + seedN); // seed deterministik: brand|jenis|topik|versi
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const target = parseInt(daily.durasi) || 30;
  const platform = daily.platform || 'IG Reels';
  const goal = daily.goal || f.goal;
  const hooks = makeHooks(f, t, rng, 3, daily.hook);
  const S = sapa(f);
  const sc = (visual, voiceover, ost, d) => ({ visual, voiceover: sanitize(voiceover, f), onscreen_text: sanitize(ost, f), duration_sec: d }); // pembuat adegan (VO & teks di-sanitize)
  let scenes = [], frameName = '', learning = '';
  const vis = () => pick(rng, f.bank.visuals);

  if (/jual/i.test(goal)) {
    frameName = 'PAS (Problem–Agitate–Solve)';
    const pain = pick(rng, f.pains);
    scenes = [
      sc(`Adegan masalah: ${lower1(pain)} — ekspresi capek/kesal, shot dekat`, `${cap1(pain)}? Sini ${S}, dengerin bentar.`, ostShort(pain), 3),
      sc('Ganti angle — bicara ke kamera, gestur tangan', `Udah nyoba macem-macem tapi hasilnya gitu-gitu aja${closer(f, rng)}? Masalahnya sering bukan di ${S}, tapi di pilihannya.`, 'Masalahnya bukan di kamu', 6),
      sc(`Reveal produk: ${vis()}`, `Kenalin: ${f.product}.${f.usp ? ' ' + cap1(f.usp) + '.' : ''} Dibuat khusus buat ${S} yang ${lower1(f.pain)}.`, cap1(f.product), 8),
      sc('Bukti: tunjukkan detail/testimoni/angka di layar', `${f.proof ? cap1(f.proof) + '.' : 'Yang udah nyoba, susah pindah ke lain.'}${f.price ? ' Harganya? ' + f.price + '.' : ''}`, f.proof || 'Buktinya nyata', 7),
      sc('Close-up produk + teks CTA besar, senyum ke kamera', `${f.promo ? cap1(f.promo) + ' — jangan sampai kelewat. ' : ''}${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta) + (f.emojiPref !== 'tanpa emoji' ? ' 👇' : ''), 6),
    ];
    learning = `Script ini pakai formula ${frameName}: buka dengan masalah audiens (bukan produk!), panasin dikit, baru tawarkan solusi + bukti + 1 CTA. Produk baru muncul di tengah — kalau muncul di awal, orang langsung skip karena kerasa iklan.`;
  } else if (/edukasi/i.test(goal)) {
    const useMyth = rng() < 0.4;
    if (useMyth) {
      frameName = 'Mitos vs Fakta';
      const [m1, m2] = pickN(rng, f.bank.myths, 2);
      scenes = [
        sc('Bicara ke kamera, ekspresi "serius tapi santai"', `Ini mitos-mitos soal ${t ? lower1(t) : lower1(catOf(c).label.toLowerCase())} yang bikin ${S} rugi. Nomor dua paling sering dipercaya.`, 'Mitos yang bikin kamu rugi', 3),
        sc(`Teks "MITOS" besar di layar → ${vis()}`, `Mitos pertama: "${m1.m}." Faktanya? ${m1.f}`, 'Mitos #1: ' + ostShort(m1.m), 9),
        sc('Pattern interrupt: ganti angle/zoom, teks "MITOS 2"', `Mitos kedua — ini yang paling banyak dipercaya: "${m2.m}." Padahal, ${lower1(m2.f)}`, 'Mitos #2: ' + ostShort(m2.m), 9),
        sc('Kembali ke wajah, nada menyimpulkan', `Intinya: jangan telan mentah-mentah apa kata orang. ${f.signature ? cap1(f.signature) + '. ' : ''}${cap1(f.cta)}${closer(f, rng)}.`, ostShort(f.cta), 6),
      ];
      learning = 'Format mitos-vs-fakta memicu reaksi "hah, masa sih?" — otak nggak nyaman sama keyakinan yang dibantah, jadi nonton sampai habis. Menyebut "nomor dua paling sering dipercaya" di awal itu open loop: janji yang bikin orang bertahan.';
    } else {
      frameName = 'Tips berangka';
      const tips = pickN(rng, f.bank.tips, 3);
      scenes = [
        sc('Bicara ke kamera / teks besar di frame menarik', `${pick(rng, [`3 hal yang harus ${S} tahu soal`, 'Simpen ini — 3 tips soal'])} ${t ? lower1(t) : lower1(f.pain)}. Langsung aja.`, '3 tips — no basa-basi', 3),
        ...tips.map((tip, i) => sc(i === 1 ? 'Pattern interrupt: pindah posisi/angle + props' : `Visual pendukung: ${vis()}`, `${['Satu', 'Dua', 'Tiga'][i]}: ${lower1(tip.t)}. ${tip.d}`, `${i + 1}. ${ostShort(tip.t)}`, 8)),
        sc('Recap cepat: 3 poin muncul berurutan di layar', `Udah, gitu aja — simpel kan${closer(f, rng)}? ${cap1(f.cta)} biar nggak lupa.`, ostShort(f.cta) + (f.emojiPref !== 'tanpa emoji' ? ' 📌' : ''), 5),
      ];
      learning = 'Struktur listicle: janji angka di detik pertama, satu ide per beat, ganti visual tiap 5–8 detik biar retensi kejaga. "No basa-basi" itu penting — 50% penonton kabur kalau value belum muncul di 3 detik pertama.';
    }
  } else if (/interaksi/i.test(goal)) {
    frameName = 'POV / relatable skit';
    const pain = pick(rng, f.pains);
    scenes = [
      sc(`Akting jadi audiens: ${lower1(pain)} — ekspresi dilebihkan dikit`, `(tanpa VO — cukup akting + sound) `, 'POV: ' + ostShort(lower1(pain)), 4),
      sc('Twist: reaksi berlebihan / plot twist kecil yang relate', `(teks di layar yang bercerita, biarkan akting yang kerja)`, pick(rng, ['Kenapa selalu gini 😭', 'Relate nggak sih', 'Tolong ini aku banget']), 8),
      sc(`Resolusi ringan: ${vis()} — brand muncul natural, bukan hard-sell`, `${pick(rng, ['Untung sekarang udah kenal', 'Sampai akhirnya nemu'])} ${f.name}${closer(f, rng)}.`, cap1(f.name) + ' to the rescue', 7),
      sc('Freeze + pertanyaan besar di layar', `Kalau ${S} tim mana: ${pick(rng, ['udah move on atau masih gini?', 'relate atau nggak?'])} Komen di bawah${closer(f, rng)}!`, 'Kamu tim mana? 👇', 5),
    ];
    learning = 'Konten interaksi menang lewat komentar. Kuncinya: validasi perasaan audiens (POV relatable), tutup dengan pertanyaan yang gampang dijawab. Brand cukup numpang lewat — kalau jualan keras, komen malah sepi.';
  } else {
    frameName = 'Story / kenalan brand';
    scenes = [
      sc('Shot produk/tempat paling menarik dulu (bukan wajah)', `${pick(rng, ['Ini cerita di balik', 'Banyak yang nanya soal'])} ${f.name} — ${pick(rng, ['dan kenapa kami mulai.', 'jadi sini kami spill.'])}`, 'Cerita di balik ' + f.name, 4),
      sc(`Behind the scene: ${vis()}`, `Semua berawal dari ${lower1(f.pain)}. Kami ngerasain sendiri — dan nggak nemu yang beneran pas.`, 'Berawal dari masalah yang sama', 8),
      sc('Proses/detail yang menunjukkan keseriusan', `Makanya ${lower1(f.product)} kami bikin beda: ${f.usp ? lower1(f.usp) : 'detailnya kami pikirin satu-satu'}.${f.proof ? ' Sekarang? ' + cap1(f.proof) + '.' : ''}`, f.usp ? cap1(f.usp) : 'Dibuat beda', 9),
      sc('Wajah tim/founder senyum, suasana hangat', `Buat ${S} yang ${lower1(f.desire)} — ${pick(rng, ['kami di sini.', 'salam kenal ya.'])} ${cap1(f.cta)}${closer(f, rng)}.`, 'Salam kenal' + emo(f, ' 🤝'), 6),
    ];
    learning = 'Konten awareness paling nempel lewat cerita, bukan daftar keunggulan. Struktur: masalah yang sama dengan audiens → kenapa kami peduli → bukti keseriusan. Orang follow brand yang punya "kenapa".';
  }

  // beri "beat" naratif tiap adegan (biar alur cerita eksplisit & bisa dinilai reviewer)
  const beatRole = (i, n) => i === 0 ? 'Hook' : i === n - 1 ? 'CTA' : (i === n - 2 && n >= 4 ? 'Bukti' : 'Isi');
  scenes = scaleDur(scenes, target).map((s, i, arr) => ({ scene: i + 1, role: beatRole(i, arr.length), ...s })); // skala durasi + nomori + beat
  return {
    type: 'script', platform, duration_sec: target, frame: frameName,
    title: t ? cap1(t) : hooks[0].text,
    hooks, scenes, cta: sanitize(cap1(f.cta), f),
    sound_suggestion: SOUNDS[f.tone.vibe] || SOUNDS.santai,
    learning_note: learning,
    compliance_notes: c.category === 'skincare' ? 'Klaim dijaga aman BPOM: semua dibingkai "membantu / tampak", tanpa janji medis.' : (c.category === 'fnb' ? 'Sebutkan channel order & harga dengan jujur; tanpa klaim kesehatan.' : 'Tanpa overclaim; semua angka diambil dari profil brand.'),
  };
}

// GEN: carousel IG (slide + caption + hashtag), mode promo vs edukasi
function genCarousel(c, daily, seedN) {
  const rng = mulberry(c.id + '|carousel|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const goal = daily.goal || f.goal;
  const S = sapa(f);
  const isPromo = /jual/i.test(goal) || /promo|diskon|bundling|launching|opening/i.test(t);
  let slides = [], title = '', covers = [], learning = '';
  const sl = (role, headline, subtext, visual) => ({ role, headline: sanitize(headline, f), subtext: sanitize(subtext, f), visual }); // pembuat slide (teks di-sanitize)

  if (isPromo) {
    const offer = f.promo || `${f.product}${f.price ? ' — ' + f.price : ''}`;
    title = cap1(offer);
    covers = [
      `${pick(rng, ['Akhirnya:', 'Buat yang nungguin:'])} ${lower1(offer)}` + emo(f, '🔥'),
      `${cap1(f.pain)}? Ini jawabannya`,
    ];
    slides = [
      sl('hook', covers[0], 'Swipe buat detailnya →', 'Teks besar di tengah, warna brand, foto produk samar di belakang'),
      sl('isi', `Kenapa ${S} bakal suka ini`, `${f.usp ? cap1(f.usp) + '. ' : ''}Dibuat buat ${S} yang ${lower1(f.pain)}.`, 'Foto produk hero + 3 ikon keunggulan'),
      ...(f.products.length > 1
        ? [sl('isi', 'Yang ' + S + ' dapetin', f.products.slice(0, 3).map(p => '• ' + p).join('\n'), 'Flat lay semua item, diberi label')]
        : [sl('isi', 'Lebih dekat lagi', `${cap1(f.product)} — ${f.usp ? lower1(f.usp) : 'detailnya bisa dilihat sendiri'}.`, 'Close-up detail produk')]),
      sl('isi', f.proof ? 'Bukan kata kami doang' : 'Real talk', f.proof ? cap1(f.proof) + '.' : `Cek sendiri ulasannya — biar ${S} yang menilai.`, 'Screenshot testimoni / rating pelanggan'),
      sl('isi', f.price ? `Harganya? ${f.price}` : 'Harganya masuk akal', `${f.promo ? cap1(f.promo) + '. ' : ''}${pick(rng, ['Nggak perlu nunggu tanggal tua.', 'Hitung-hitungannya masuk.'])}`, 'Harga besar + coretan harga lama kalau ada promo'),
      sl('cta', cap1(f.cta), `${f.promo ? 'Sebelum kehabisan — ' : ''}${lower1(f.cta)}${f.signature ? '. ' + cap1(f.signature) : ''}!`, 'Recap 3 poin + tombol CTA visual + logo brand'),
    ];
    learning = 'Carousel jualan tetap butuh alur: hook → alasan → isi → bukti → harga → CTA. Bukti sosial ditaruh sebelum harga biar harga terasa layak. Satu CTA aja di slide akhir — dua CTA = orang nggak milih dua-duanya.';
  } else {
    const kind = pick(rng, ['mistakes', 'signs', 'myths', 'tips']);
    const bank = f.bank[kind];
    const items = pickN(rng, bank, Math.min(5, bank.length));
    const label = { mistakes: 'kesalahan', signs: 'tanda', myths: 'mitos', tips: 'tips' }[kind];
    const subject = t ? lower1(t) : (kind === 'signs' ? lower1(f.pain) : (f.bank.niche || lower1(catOf(c).label.toLowerCase())));
    title = `${items.length} ${label} soal ${subject}`;
    covers = [
      `${items.length} ${label} ${kind === 'signs' ? subject : 'soal ' + subject}` + emo(f, kind === 'mistakes' ? '🚨' : '👀'),
      `${cap1(label)} yang ${pick(rng, ['sering banget kejadian', 'jarang disadari'])} — no. ${Math.min(3, items.length)} paling parah`,
    ];
    slides = [
      sl('hook', covers[0], `Nomor ${Math.min(3, items.length)} paling sering diabaikan → swipe`, 'Teks besar di tengah, background polos warna brand, panah swipe kecil'),
      ...items.map((it, i) => kind === 'myths'
        ? sl('isi', `${i + 1}. "${it.m}"`, `Faktanya: ${lower1(it.f)}`, 'Teks "MITOS" dicoret + fakta di bawahnya')
        : sl('isi', `${i + 1}. ${it.t}`, it.d, pick(rng, f.bank.visuals))),
      sl('cta', `Save dulu, praktikkan pelan-pelan` + emo(f, '📌'), `${cap1(f.cta)}. Tag temen yang butuh ini!`, 'Recap semua poin kecil-kecil + logo brand'),
    ];
    learning = `Slide 1 itu 80% penentu — pakai angka + curiosity gap ("no. ${Math.min(3, items.length)} paling sering diabaikan" = open loop). Satu ide per slide biar gampang dicerna. Slide akhir minta SAVE: carousel yang di-save dapat bobot ~3x like di algoritma.`;
  }

  const capRng = rng;
  const capHook = makeHooks(f, t, capRng, 1, daily.hook)[0];
  const caption = sanitize([
    capHook.text,
    '',
    isPromo
      ? `${f.promo ? cap1(f.promo) + '. ' : ''}Detail lengkap ada di slide — ${lower1(f.cta)}${closer(f, capRng)}!`
      : `Swipe sampai habis, terus cek: ${S} kena yang nomor berapa? Ceritain di komen${closer(f, capRng)}` + emo(f, '👇'),
  ].join('\n'), f);
  return {
    type: 'carousel', platform: 'Instagram', title, cover_alternatives: covers,
    slides: slides.map((s, i) => ({ slide: i + 1, ...s })),
    caption, hashtags: buildHashtags(f, t, rng),
    learning_note: learning,
    compliance_notes: c.category === 'skincare' ? 'Semua klaim dibingkai "membantu / tampak" — aman BPOM.' : '—',
  };
}

// GEN: caption panjang + pendek + 5 hook cadangan, formula sesuai goal
function genCaption(c, daily, seedN) {
  const rng = mulberry(c.id + '|caption|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const goal = daily.goal || f.goal;
  const S = sapa(f);
  const hooks = makeHooks(f, t, rng, 5, daily.hook);
  let body = [], formula = '';
  if (/jual/i.test(goal)) {
    formula = 'AIDA';
    body = [
      hooks[0].text, '',
      `${cap1(f.pain)} itu capek${closer(f, rng)}. Dan biasanya bukan karena kurang usaha — tapi karena belum ketemu yang pas.`, '',
      `${cap1(f.product)} dibuat buat itu.${f.usp ? ' ' + cap1(f.usp) + '.' : ''}${f.proof ? ' ' + cap1(f.proof) + '.' : ''}`, '',
      `Bayangin ${lower1(f.desire)} — tanpa drama, tanpa coba-coba lagi.`, '',
      `${f.promo ? cap1(f.promo) + ' ' : ''}${cap1(f.cta)}${closer(f, rng)}` + emo(f, '🛒'),
    ];
  } else if (/edukasi/i.test(goal)) {
    formula = 'PAS + tips';
    const tips = pickN(rng, f.bank.tips, 3);
    body = [
      hooks[0].text, '',
      `Banyak yang ${lower1(f.pain)} bukan karena nggak niat — tapi karena infonya simpang siur.`, '',
      'Yang beneran ngaruh justru simpel:',
      ...tips.map((tip, i) => `${i + 1}. ${cap1(tip.t)} — ${lower1(tip.d)}`), '',
      `Save dulu biar nggak lupa, terus ${lower1(f.cta)}${closer(f, rng)}` + emo(f, '📌'),
    ];
  } else if (/interaksi/i.test(goal)) {
    formula = 'Relatable + pertanyaan';
    body = [
      hooks[0].text, '',
      `Nggak cuma ${S} kok — ${lower1(pick(rng, f.pains))} itu hampir semua orang pernah${closer(f, rng)}.`, '',
      `Yang bikin beda cuma satu: berhenti di keluhan, atau mulai dari langkah kecil.`, '',
      `Jadi cerita dong: ${S} lagi di fase yang mana? Jawab di komen — kami baca satu-satu${closer(f, rng)}` + emo(f, '👇'),
    ];
  } else {
    formula = 'BAB (Before–After–Bridge)';
    body = [
      hooks[0].text, '',
      `Dulu: ${lower1(f.pain)}. Rasanya jalan di tempat.`, '',
      `Sekarang kebayang nggak — ${lower1(f.desire)}?`, '',
      `Jembatannya ada di ${lower1(f.product)}.${f.usp ? ' ' + cap1(f.usp) + '.' : ''} ${cap1(f.cta)} buat mulai${closer(f, rng)}.`,
    ];
  }
  if (f.signature) body.push('', cap1(f.signature) + emo(f, '✨'));
  const caption_long = sanitize(body.join('\n'), f);
  const caption_short = sanitize(`${hooks[1].text}\n${cap1(f.cta)}${closer(f, rng)}` + emo(f, '✨'), f);
  return {
    type: 'caption', formula,
    caption_long, caption_short,
    hooks: hooks.map(h => h.text), hook_details: hooks,
    hashtags: buildHashtags(f, t, rng),
    learning_note: `Formula ${formula}. Hook ditaruh di 125 karakter pertama (yang kelihatan sebelum tombol "more"). Baris pendek + jarak antar paragraf biar enak dibaca di HP. Satu CTA aja — lebih dari itu, orang malah nggak milih.`,
    compliance_notes: c.category === 'skincare' ? 'Klaim aman: "membantu / tampak", tanpa janji berlebihan.' : '—',
  };
}

// GEN: storyboard shot-list realistis (format sesuai kategori brand)
function genStoryboard(c, daily, seedN) {
  const rng = mulberry(c.id + '|storyboard|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const t = (daily.topic || '').trim();
  const target = parseInt(daily.durasi) || 30;
  const S = sapa(f);
  const formats = c.category === 'service'
    ? ['before-after', 'proses', 'talking']
    : c.category === 'fnb' ? ['proses', 'reaksi', 'talking'] : ['demo', 'proses', 'talking'];
  const fmt = pick(rng, formats);
  const sh = (visual, camera, talent_props, voiceover, ost, sfx, d) => ({ visual, camera, talent_props, voiceover: sanitize(voiceover, f), onscreen_text: sanitize(ost, f), sfx_music: sfx, duration_sec: d }); // pembuat shot lengkap
  let shots = [], concept = '', notes = '';
  const v1 = pick(rng, f.bank.visuals), v2 = pick(rng, f.bank.visuals.filter(x => x !== v1));

  if (fmt === 'before-after') {
    concept = `Before-after ${t ? lower1(t) : 'hasil kerja'} — bukti nyata tanpa banyak omong`;
    shots = [
      sh('Kondisi BEFORE — tunjukkan jujur apa adanya', 'Statis, eye-level', 'Lokasi asli, tanpa styling', `Ini kondisi awalnya. ${cap1(pick(rng, f.pains))}.`, 'BEFORE 😬', 'Musik tegang ringan', 4),
      sh('Tim mulai bekerja — tangan & alat close-up', 'Handheld mengikuti gerakan', 'Alat kerja utama, seragam tim', `Prosesnya nggak asal: ${f.usp ? lower1(f.usp) : 'tiap langkah ada standarnya'}.`, 'Prosesnya begini', 'Beat mulai naik', 8),
      sh('Time-lapse pengerjaan sampai hampir selesai', 'Statis di tripod (time-lapse)', 'Tripod HP wajib', '(tanpa VO — biarkan time-lapse bicara)', 'Menit demi menit…', 'Beat cepat', 7),
      sh('Reveal AFTER — angle sama persis dengan shot 1', 'Statis, angle identik shot 1', 'Hasil kerja yang rapi', `Dan… beres. ${f.proof ? cap1(f.proof) + '.' : 'Bedanya kelihatan sendiri.'}`, 'AFTER ✨', 'Drop musik puas', 6),
      sh('Kartu penutup + kontak', 'Teks di layar', 'Logo + kontak', `${f.promo ? cap1(f.promo) + '. ' : ''}${cap1(f.cta)}${closer(f, rng)}.`, ostShort(f.cta), 'Outro pendek', 5),
    ];
    notes = 'Kunci format ini: angle shot BEFORE dan AFTER harus identik (tandai posisi tripod pakai lakban). Kejujuran visual = kepercayaan.';
  } else if (fmt === 'proses') {
    concept = `Behind the scene: ${t ? lower1(t) : 'proses di balik ' + lower1(f.product)}`;
    shots = [
      sh('Hasil akhir dulu (teaser) — shot paling menggoda', 'Close-up, gerakan lambat', f.product, `${pick(rng, ['Pernah penasaran gimana', 'Ini cara'])} ${lower1(f.product)} ${pick(rng, ['dibuat?', 'disiapin tiap hari?'])}`, 'Dari mana ini dimulai?', 'Intro catchy', 4),
      sh(cap1(v1), 'Top-down statis', 'Bahan/alat utama', `Mulai dari yang paling penting: ${pick(rng, ['bahannya dipilih, bukan asal ada.', 'persiapannya nggak boleh asal.'])}`, 'Step 1: persiapan', 'Musik proses', 8),
      sh(cap1(v2), 'Handheld dekat, fokus tangan', 'Talent 1 orang', `Bagian ini yang bikin beda: ${f.usp ? lower1(f.usp) : 'detail kecil yang jarang orang lihat'}.`, 'Ini rahasianya 🤫', 'Musik lanjut', 9),
      sh('Hasil akhir utuh + reaksi puas', 'Eye-level, mundur perlahan', 'Hasil final', `Jadi deh. ${f.price ? 'Mulai ' + f.price.split(/[–-]/)[0].trim() + ' aja.' : ''} ${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta), 'Outro naik', 6),
    ];
    notes = 'Trik retensi: tunjukkan hasil akhir 1 detik di awal (teaser), baru prosesnya. Orang bertahan buat lihat "jadinya beneran kayak gitu nggak".';
  } else if (fmt === 'reaksi') {
    concept = `Reaksi jujur first bite: ${t ? lower1(t) : lower1(f.product)}`;
    shots = [
      sh('Menu diantar ke meja, steam masih ngepul', 'Tracking mengikuti piring', f.product + ', meja bersih', '(tanpa VO — sound sizzle/steam)', cap1(f.product), 'SFX asli dapur', 4),
      sh('Close-up tekstur — disiram/ditarik/dipotong', 'Macro close-up', 'Pencahayaan dari samping', '(tanpa VO — ASMR food)', '', 'ASMR: suara asli', 7),
      sh('First bite + reaksi jujur (jangan dibuat-buat)', 'Eye-level, fokus wajah', 'Talent yang ekspresif', `Oke ini… ${pick(rng, ['beneran nggak bohong.', 'kenapa baru nyoba sekarang sih.'])}`, pick(rng, ['GILA SIH INI', 'Nggak siap 😭']), 'Musik freeze saat gigit', 8),
      sh('Info harga + cara order di layar', 'Statis, teks besar', 'Menu + harga', `${f.price ? 'Harganya ' + f.price + ' aja. ' : ''}${cap1(f.cta)}${closer(f, rng)}!`, ostShort(f.cta), 'Outro', 5),
    ];
    notes = 'Reaksi harus jujur — penonton bisa mencium akting dari jarak satu kecamatan. Ambil beberapa take, pilih yang paling natural.';
  } else {
    concept = `Talking head + b-roll: ${t ? lower1(t) : lower1(pick(rng, f.bank.topics))}`;
    const tip = pick(rng, f.bank.tips);
    const openHook = makeHooks(f, t, rng, 1, daily.hook)[0].text;
    shots = [
      sh('Wajah ke kamera, langsung ke inti (tanpa salam!)', 'Eye-level, sedikit dekat', 'Talent 1, background rapi', `${openHook}.`, ostShort(openHook), 'Musik minimal', 4),
      sh('B-roll menguatkan poin: ' + v1, 'Insert close-up', 'Props sesuai topik', `${cap1(tip.t)} — ${lower1(tip.d)}`, ostShort(tip.t), 'Musik lanjut', 9),
      sh('Kembali ke wajah + gestur tangan', 'Eye-level, angle beda 15°', '-', `Dan yang paling sering dilupain: konsisten. Sekali-dua kali doang nggak akan kelihatan hasilnya.`, 'Konsisten > sempurna', 'Musik lanjut', 8),
      sh('B-roll penutup: ' + v2 + ' + teks CTA', 'Slow push-in', 'Produk/hasil', `${cap1(f.cta)}${closer(f, rng)} — ${pick(rng, ['nggak nyesel.', 'mulai dari yang kecil dulu.'])}`, ostShort(f.cta), 'Outro pendek', 5),
    ];
    notes = 'Ganti angle tiap ganti poin (cukup geser 15–20°) — pattern interrupt murah yang bikin video terasa "mahal". Jangan buka dengan salam: langsung hook.';
  }

  shots = scaleDur(shots, target).map((s, i) => ({ shot: i + 1, ...s }));
  return {
    type: 'storyboard', concept: sanitize(cap1(concept), f), duration_sec: target,
    shots, broll: pickN(rng, f.bank.visuals, 3).map(cap1),
    production_notes: notes + ' Semua shot cukup pakai HP + tripod kecil; cahaya terbaik: dekat jendela jam 7–10 pagi. Total waktu shoot ±30–45 menit.',
    cta: sanitize(cap1(f.cta), f),
    learning_note: 'Storyboard = peta sebelum shoot. Dengan shot list, kamu nggak akan bengong "abis ini ngapain" — hemat 1–2 jam per video dan hasilnya jauh lebih rapi.',
    compliance_notes: '—',
  };
}

// ── PILAR KONTEN: daftar pilihan (onboarding) + generator ide per pilar ──
// Label = kunci: nilai c.pillars dari onboarding langsung nyocok ke PILLAR_GEN.
const PILLAR_LIST = ['Edukasi', 'Tips & Trik', 'Tutorial', 'Social Proof', 'Behind The Scenes', 'Hiburan', 'Komunitas', 'Storytelling', 'Inspirasi', 'Promosi'];
const PILLAR_PROMO = 'Promosi'; // satu-satunya pilar "meminta" (buat jaga rasio 80/20)
// default sehat kalau user belum pilih pilar (5 memberi : 2 meminta)
const PILLAR_DEFAULT = ['Edukasi', 'Social Proof', 'Tips & Trik', 'Behind The Scenes', 'Hiburan', 'Komunitas', 'Promosi'];
// tiap generator: (rng, f, S, k) → {format, hook, concept, cta}. k = kemunculan ke-berapa (biar variasi)
const PILLAR_GEN = {
  'Edukasi': (rng, f, S, k) => {
    const m = pick(rng, f.bank.mistakes), my = pick(rng, f.bank.myths);
    return (k % 2)
      ? { format: 'Reels', hook: `"${my.m}" — mitos atau fakta?`, concept: `Bantah mitos: ${lower1(my.f)} Tutup dengan tanya "mitos apa lagi yang pernah ${S} denger?"`, cta: 'Share ke yang masih percaya' }
      : { format: 'Reels', hook: `${pick(rng, [3, 5])} ${pick(rng, ['kesalahan', 'hal'])} soal ${lower1(pick(rng, f.bank.topics))}`, concept: `Angkat: "${m.t}" — ${lower1(m.d)} Format cepat, satu poin per beat.`, cta: 'Save biar nggak lupa' };
  },
  'Tips & Trik': (rng, f, S, k) => { const t = pick(rng, f.bank.tips); return { format: 'Carousel', hook: `${pick(rng, [3, 5, 7])} tips ${lower1(pick(rng, f.bank.topics))} yang jarang dibahas`, concept: `Bagikan tip praktis — "${t.t}": ${lower1(t.d)} Satu tip per slide, langsung bisa dipraktikkan.`, cta: 'Save & praktikkan' }; },
  'Tutorial': (rng, f, S, k) => ({ format: 'Reels', hook: `Cara ${lower1(pick(rng, f.bank.topics))} yang bener dalam 30 detik`, concept: `Tutorial langkah-demi-langkah pakai ${lower1(f.product)}. Tunjukkan hasil sebelum–sesudah kalau bisa.`, cta: 'Save buat dicoba nanti' }),
  'Social Proof': (rng, f, S, k) => ({ format: 'Carousel', hook: f.proof ? cap1(f.proof) + ' — ini ceritanya' : `Kata mereka yang udah nyoba ${lower1(f.product)}`, concept: 'Kumpulan testimoni/ulasan asli + cerita singkat di baliknya. Screenshot asli lebih dipercaya daripada desain rapi.', cta: 'Komen kalau mau info lengkap' }),
  'Behind The Scenes': (rng, f, S, k) => ({ format: 'Story', hook: `Sehari di balik ${f.name}`, concept: 'BTS santai 3–5 story: proses, tim, momen lucu. Nggak perlu rapi — justru yang mentah yang bikin dekat.', cta: 'Poll: mau lihat bagian mana lagi?' }),
  'Hiburan': (rng, f, S, k) => ({ format: 'Reels', hook: `POV: ${lower1(pick(rng, f.pains))}`, concept: 'Skit ringan 10–15 detik dari struggle audiens. Brand muncul sekilas aja di akhir.', cta: 'Tag temen yang begini' }),
  'Komunitas': (rng, f, S, k) => ({ format: 'Story', hook: `Tanya dong: ${lower1(pick(rng, f.pains))} — ${S} gimana?`, concept: 'Question sticker. Besoknya, 3 jawaban terbaik dijadikan konten (minta izin dulu). Konten gratis + audiens merasa didengar.', cta: 'Kirim jawabanmu' }),
  'Storytelling': (rng, f, S, k) => ({ format: 'Reels', hook: `Kenapa ${f.name} ada`, concept: `Cerita asal-usul brand: masalah yang bikin ${f.name} lahir → perjalanan singkat → misi sekarang. Jujur & personal, bukan iklan.`, cta: 'Follow buat lanjutan ceritanya' }),
  'Inspirasi': (rng, f, S, k) => ({ format: 'Carousel', hook: `${cap1(pick(rng, f.bank.desires || ['versi terbaik kamu']))} — mulai dari langkah kecil`, concept: 'Konten aspiratif: gambarkan impian audiens + langkah kecil ke sana. Bikin mereka merasa "aku juga bisa".', cta: 'Simpan buat pengingat' }),
  'Promosi': (rng, f, S, k) => ({ format: 'Carousel', hook: f.promo ? cap1(f.promo) : `${cap1(f.product)}: kenapa worth it`, concept: `Jualan jujur: keunggulan (${f.usp ? lower1(f.usp) : 'yang beneran dirasain pembeli'}) + harga transparan + cara order.`, cta: f.cta }),
};
// GEN: rencana konten 7 hari dari PILAR yang dipilih brand, tetap jaga rasio 80/20 (promo dibatasi)
function genIdeas(c, daily, seedN) {
  const rng = mulberry(c.id + '|ideas|' + (daily.topic || '') + '|' + seedN);
  const f = factsOf(c);
  const S = sapa(f);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  // pilar brand (dari onboarding) → fallback ke default sehat kalau kosong
  const chosen = (Array.isArray(c.pillars) && c.pillars.length) ? c.pillars.slice() : PILLAR_DEFAULT;
  const giving = chosen.filter(p => p !== PILLAR_PROMO);
  if (!giving.length) giving.push('Edukasi'); // jaga-jaga kalau user cuma pilih Promosi
  const wantsPromo = chosen.includes(PILLAR_PROMO);
  // susun 7 hari: pilar "memberi" diputar, promo maksimal 1–2 hari (jaga 80/20)
  const order = [];
  for (let d = 0; d < 7; d++) order.push(giving[d % giving.length]);
  if (wantsPromo) { order[4] = PILLAR_PROMO; if (giving.length >= 3) order[6] = PILLAR_PROMO; }
  const occ = {};
  const plan = order.map(label => {
    const gen = PILLAR_GEN[label] || PILLAR_GEN['Edukasi']; // pilar custom → pola edukasi, label tetap
    const k = occ[label] = (occ[label] || 0); occ[label]++;
    return { pillar: label, ...gen(rng, f, S, k) };
  });
  return {
    type: 'ideas',
    ideas: plan.map((p, i) => ({ no: i + 1, day: days[i], ...p, hook: sanitize(cap1(p.hook), f), concept: sanitize(p.concept, f), cta: sanitize(cap1(p.cta), f) })),
    learning_note: 'Disusun dari pilar konten brand-mu (' + chosen.join(', ') + ') dengan rasio sehat 80/20: mayoritas memberi, sedikit yang meminta (promosi maks 1–2 hari). Akun yang tiap hari jualan pelan-pelan ditinggal — algoritma & manusianya sama-sama capek.',
  };
}

// Registry jenis konten
// ── IKLAN (Meta Ads + TikTok Ads): materi paid deterministik dari fakta brand ──
const AD_CTA_BTN = ['Belanja Sekarang', 'Pesan Sekarang', 'Kirim Pesan', 'Selengkapnya', 'Daftar', 'Dapatkan Penawaran'];
function genAds(c, daily, seedN) {
  const f = factsOf(c);
  const t = ((daily && daily.topic) || '').trim();
  const rng = mulberry(c.id + '|ads|' + t + '|' + (seedN || 0));
  const clean = s => sanitize(String(s || '').trim().replace(/\s+/g, ' '), f);
  const hook = makeHooks(f, t, rng, 1, daily && daily.hook)[0].text;
  const offer = f.promo ? cap1(f.promo) : (f.price ? cap1(f.product) + ' mulai ' + f.price : cap1(f.product));
  const proof = f.proof ? cap1(f.proof) : '';
  const ctaBtn = pick(rng, AD_CTA_BTN);
  // META: primary text (hook + value + CTA), headline benefit ≤40, description ≤30
  const primary = clean(`${hook}. ${f.pain ? cap1(f.pain) + '? ' : ''}${offer}.${proof ? ' ' + proof + '.' : ''} ${f.desire ? cap1(f.desire) + '.' : ''} ${cap1(f.cta)}.`);
  const headline = clean((f.usp ? cap1(f.usp) : cap1(f.product)).slice(0, 40));
  const desc = clean((f.promo ? cap1(f.promo) : (f.desire ? cap1(f.desire) : 'Cocok buat kamu')).slice(0, 30));
  // TIKTOK: hook-first, kelihatan organik (bukan iklan) di 3 detik pertama
  const ttHook = clean(makeHooks(f, t, rng, 3, daily && daily.hook)[2].text);
  const ttScript = [
    `0–3 dtk — ${ttHook} (jangan kelihatan iklan)`,
    `3–8 dtk — tunjukin ${lower1(f.product)} lagi dipakai / masalahnya kejawab`,
    `8–15 dtk — ${f.usp ? lower1(f.usp) + '; ' : ''}${offer}`,
    `15–20 dtk — ${clean(f.cta)} (teks di layar + suara)`,
  ];
  return {
    type: 'ads', title: 'Iklan: ' + (t || f.product),
    meta: { primary_text: primary, headline, description: desc, cta_button: ctaBtn, format: (daily && daily.platform === 'IG Feed') ? 'Single image / Feed' : 'Reels / Story 9:16' },
    tiktok: { hook: ttHook, script: ttScript, caption: clean(`${hook}${f.promo ? ' — ' + lower1(f.promo) : ''}`), hashtags: buildHashtags(f, t, rng).slice(0, 5), cta_button: ctaBtn },
    audience: clean(f.buyer ? cap1(f.buyer) : 'Sesuai pembeli idealmu') + (f.area ? ' · area ' + f.area : ''),
    budget_hint: 'Mulai kecil (±Rp30–50rb/hari), 1 campaign 2–3 varian creative, diamkan 3–4 hari sebelum menilai. Matikan yang CTR/CPM jelek, gandakan yang menang.',
    learning_note: 'Iklan menang di 3 detik pertama + satu penawaran jelas. Meta: primary text pendek, headline = benefit. TikTok: bikin kayak konten organik (hook dulu, jualan belakangan) — iklan yang "berasa iklan" langsung di-skip.',
    compliance_notes: '—',
  };
}

const TYPES = {
  script:     { e: '🎬', label: 'Script Video',      desc: 'Reels/TikTok: 3 hook + adegan + CTA', gen: genScript },
  ads:        { e: '📣', label: 'Iklan Meta/TikTok', desc: 'Copy Meta Ads + skrip TikTok Ads', gen: genAds },
  carousel:   { e: '🎠', label: 'Carousel IG',       desc: 'Slide per slide + preview, siap desain', gen: genCarousel },
  caption:    { e: '✍️', label: 'Caption + Hashtag', desc: 'Panjang + pendek + 5 hook cadangan', gen: genCaption },
  storyboard: { e: '🎥', label: 'Storyboard',        desc: 'Shot list realistis, tinggal shoot pakai HP', gen: genStoryboard },
  ideas:      { e: '🗓️', label: 'Ide Seminggu',      desc: '7 hari terisi, campuran pillar sehat', gen: genIdeas },
  paket:      { e: '⚡', label: 'Paket Lengkap',     desc: 'Script + carousel + caption sekaligus' },
};

/* ═══════════════════════ ANALYZER: REVIEW & KOMPETITOR ═══════════════════════
 * Analisis teks sungguhan (deteksi pola, bukan tebak-tebakan):
 * hook 3 detik, CTA, hashtag, keterbacaan, variasi pillar.
 */
// pola deteksi CTA, pembuka basi, jenis hook, dan emoji dalam caption asli
const CTA_RE = /(link (di )?bio|cek bio|komen|comment|di-?dm|dm kami|dm aja|save dulu|save posting|share ke|tag (temen|teman)|follow (kami|terus|akun)|order|checkout|beli sekarang|kunjungi|klik link|gofood|grabfood|shopeefood|whatsapp|wa\.me|daftar sekarang|join|hubungi)/i;
const BAD_OPEN_RE = /^(halo|hai|hay|hi\b|hello|hey|assalamu|selamat (pagi|siang|sore|malam)|good (morning|afternoon)|dear)/i;
const HOOK_PATTERNS_DETECT = [
  { id: 'angka', label: 'Listicle berangka', re: /^\d+\s|\b\d+\s+(cara|tips|hal|tanda|kesalahan|alasan|langkah|menu|fakta)/i },
  { id: 'pov', label: 'POV relatable', re: /^pov\b/i },
  { id: 'tanya', label: 'Pertanyaan langsung', re: /^[^\n]{0,80}\?/ },
  { id: 'warning', label: 'Warning / stop', re: /\b(stop|jangan|awas|hati-?hati|fatal)\b/i },
  { id: 'curiosity', label: 'Curiosity gap', re: /\b(rahasia|ternyata|ini dia|jarang (dibahas|yang tau)|spill|nggak banyak yang)/i },
  { id: 'callout', label: 'Call-out audiens', re: /\b(buat (kamu|kalian|anda) yang|kalau kamu|khusus (buat|untuk))/i },
  { id: 'mitos', label: 'Mitos vs fakta', re: /\b(mitos|fakta atau|banyak yang percaya)\b/i },
  { id: 'jujur', label: 'Kejujuran radikal', re: /\b(jujur|real talk|nggak bohong|no bullshit)\b/i },
];
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2728}\u{2764}]/gu;

// pecah blok caption jadi list post (pemisah --- atau baris kosong)
function parsePosts(raw) {
  let parts = String(raw || '').split(/\n\s*-{3,}\s*\n?/);
  if (parts.length === 1) parts = raw.split(/\n\s*\n(?=\S)/);
  return parts.map(s => s.trim()).filter(s => s.length > 5);
}
// analisis 1 caption: skor hook, CTA, hashtag, keterbacaan, jenis pillar
function analyzePost(text) {
  const firstLine = (text.split('\n').find(l => l.trim()) || '').trim();
  const patterns = HOOK_PATTERNS_DETECT.filter(p => p.re.test(firstLine));
  const badOpen = BAD_OPEN_RE.test(firstLine);
  let hook = 4;
  if (patterns.length) hook += 4;
  if (firstLine.length > 0 && firstLine.length <= 70) hook += 1;
  if (badOpen) hook -= 3;
  if (firstLine.length > 130) hook -= 2;
  hook = Math.max(1, Math.min(10, hook));
  const hashtags = (text.match(/#[\p{L}\d_]+/gu) || []).map(h => h.slice(1).toLowerCase());
  const megaTags = hashtags.filter(h => MEGA_TAGS.includes(h));
  const ctaMatches = text.match(new RegExp(CTA_RE.source, 'gi')) || [];
  const words = text.replace(/#[\p{L}\d_]+/gu, '').trim().split(/\s+/).filter(Boolean).length;
  const hasBreaks = /\n/.test(text.trim());
  const emojiCount = (text.match(EMOJI_RE) || []).length;
  let pillar = 'Cerita / lainnya';
  if (/(promo|diskon|\d+\s*%|rp ?\d|\d+rb|\bsale\b|gratis ongkir|checkout|order sekarang|beli)/i.test(text)) pillar = 'Promosi';
  else if (/(tips|cara |fakta|mitos|kenapa |tutorial|langkah|panduan|wajib tau)/i.test(text)) pillar = 'Edukasi';
  else if (/(komen|menurut (kamu|kalian)|tim mana|setuju nggak|pilih mana|tebak)/i.test(text)) pillar = 'Interaksi';
  else if (/(pov|relate|pernah nggak|jujur|cerita)/i.test(text)) pillar = 'Relatable';
  return { text, firstLine, patterns, badOpen, hook, hashtags, megaTags, ctaCount: ctaMatches.length, hasCTA: ctaMatches.length > 0, words, hasBreaks, emojiCount, pillar };
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; // rata-rata
const r1 = n => Math.round(n * 10) / 10; // bulatkan 1 desimal
const quote = s => '"' + (s.length > 72 ? s.slice(0, 70).trim() + '…' : s) + '"'; // kutip + potong teks panjang

// gabung skor banyak post jadi rapor akun (skor total berbobot)
function analyzeAccount(posts) {
  const p = posts.map(analyzePost);
  const hookScore = r1(avg(p.map(x => x.hook)));
  const ctaCoverage = avg(p.map(x => x.hasCTA ? 1 : 0));
  const multiCta = p.filter(x => x.ctaCount > 2).length / p.length;
  const ctaScore = r1(Math.max(1, Math.min(10, ctaCoverage * 10 - multiCta * 2)));
  const tagCounts = p.map(x => x.hashtags.length);
  const medianTags = tagCounts.slice().sort((a, b) => a - b)[Math.floor(tagCounts.length / 2)] || 0;
  const megaShare = avg(p.map(x => x.hashtags.length ? x.megaTags.length / x.hashtags.length : 0));
  let tagScore = medianTags >= 3 && medianTags <= 5 ? 9 : medianTags >= 1 && medianTags <= 2 ? 6.5 : medianTags === 0 ? 3 : medianTags <= 10 ? 5 : 3;
  tagScore = r1(Math.max(1, tagScore - (megaShare > 0.3 ? 2 : 0)));
  const wall = p.filter(x => x.words > 60 && !x.hasBreaks).length / p.length;
  const avgWords = avg(p.map(x => x.words));
  let readScore = 8;
  if (avgWords < 12) readScore = 5.5;
  else if (avgWords > 220) readScore = 5;
  readScore = r1(Math.max(1, readScore - wall * 4));
  const pillars = {};
  p.forEach(x => { pillars[x.pillar] = (pillars[x.pillar] || 0) + 1; });
  const promoShare = (pillars['Promosi'] || 0) / p.length;
  const distinct = Object.keys(pillars).length;
  let varScore = r1(Math.max(1, Math.min(10, 3.5 + distinct * 1.6 - Math.max(0, promoShare - 0.35) * 9)));
  if (p.length < 3) varScore = Math.min(varScore, 6);
  const patternFreq = {};
  p.forEach(x => x.patterns.forEach(pt => { patternFreq[pt.label] = (patternFreq[pt.label] || 0) + 1; }));
  const overall = r1(hookScore * .3 + ctaScore * .2 + tagScore * .15 + readScore * .15 + varScore * .2);
  return { posts: p, n: p.length, hookScore, ctaScore, ctaCoverage, tagScore, medianTags, megaShare, readScore, wall, avgWords, varScore, pillars, promoShare, patternFreq, overall };
}

// susun laporan review akun dari caption yang ditempel (kekuatan, bocor, rekomendasi)
function reviewReport(c, raw) {
  const posts = parsePosts(raw);
  if (posts.length < 2) return { error: 'Butuh minimal 2 caption biar analisisnya adil. Tempel beberapa caption terakhirmu ya — pisahkan dengan baris berisi tiga strip (---).' };
  const a = analyzeAccount(posts);
  const f = factsOf(c);
  const strengths = [], weaknesses = [], recs = [];
  const bestHook = a.posts.slice().sort((x, y) => y.hook - x.hook)[0];
  const worstHook = a.posts.slice().sort((x, y) => x.hook - y.hook)[0];
  const badOpens = a.posts.filter(x => x.badOpen);
  const noCta = a.posts.filter(x => !x.hasCTA);

  if (a.hookScore >= 7) strengths.push(`Hook-mu udah kuat (rata-rata ${a.hookScore}/10). Contoh terbaik: ${quote(bestHook.firstLine)} — pertahankan pola ini.`);
  else { weaknesses.push(`Hook masih lemah (rata-rata ${a.hookScore}/10). ${badOpens.length ? badOpens.length + ' dari ' + a.n + ' post dibuka salam/basa-basi — contohnya ' + quote(badOpens[0].firstLine) + '.' : 'Baris pertama belum memancing berhenti scroll, contoh: ' + quote(worstHook.firstLine) + '.'}`);
    recs.push('Tulis ulang baris pertama tiap post: mulai dari masalah, angka, atau pertanyaan audiens — bukan salam. 50% penonton menentukan skip/lanjut di 3 detik pertama.'); }
  if (a.ctaCoverage >= 0.8) strengths.push(`${Math.round(a.ctaCoverage * 100)}% post-mu punya CTA — disiplin yang bagus, jarang ada akun sekonsisten ini.`);
  else { weaknesses.push(`${noCta.length} dari ${a.n} post nggak punya ajakan (CTA) sama sekali — konten bagus tapi audiens nggak dikasih tahu harus ngapain. Contoh: ${quote(noCta[0] ? noCta[0].firstLine : worstHook.firstLine)}.`);
    recs.push(`Tutup TIAP post dengan tepat satu ajakan. Buat brand-mu yang paling pas: "${f.cta}".`); }
  if (a.medianTags >= 3 && a.medianTags <= 5 && a.megaShare <= 0.3) strengths.push(`Jumlah hashtag-mu pas (median ${a.medianTags}) — di rentang sehat 3–5.`);
  else if (a.medianTags === 0) { weaknesses.push('Hampir nggak ada hashtag — kamu melewatkan jalur penemuan gratis.'); recs.push(`Pakai 3–5 hashtag campuran: niche + topik + branded. Contoh buatmu: ${buildHashtags(f, '', mulberry(c.id + 'tag')).join(' ')}.`); }
  else if (a.medianTags > 8) { weaknesses.push(`Hashtag kebanyakan (median ${a.medianTags}) — riset menunjukkan 3–5 tag mid-tier lebih efektif daripada 15+ tag campur aduk.`); recs.push('Pangkas jadi 3–5 hashtag paling relevan; buang tag jutaan post (#fyp #viral) karena kontenmu tenggelam dalam hitungan detik di sana.'); }
  else if (a.megaShare > 0.3) { weaknesses.push('Terlalu banyak mega-hashtag (#fyp, #viral, dsb) — di tag sebesar itu kontenmu bersaing dengan jutaan post per hari.'); recs.push('Ganti mega-tag dengan tag niche 10K–500K post — cukup besar untuk dilihat, cukup kecil untuk menang.'); }
  if (a.wall > 0.3) { weaknesses.push(`${Math.round(a.wall * a.n)} post berupa "tembok teks" tanpa jeda baris — di layar HP itu melelahkan dan bikin orang skip.`); recs.push('Pecah caption jadi baris-baris pendek dengan jarak antar paragraf — keterbacaan naik, waktu baca ikut naik.'); }
  else if (a.readScore >= 7.5) strengths.push('Caption-mu enak dibaca: ada jeda baris dan panjangnya wajar.');
  if (a.promoShare > 0.5) { weaknesses.push(`${Math.round(a.promoShare * 100)}% kontenmu jualan — kebalikan dari rasio sehat 80/20. Audiens (dan algoritma) capek kalau tiap hari diminta beli.`);
    recs.push('Terapkan 80/20: untuk tiap 1 konten jualan, selingi 4 konten memberi (tips, cerita, BTS, interaksi). Justru itu yang bikin konten jualanmu dipercaya.'); }
  else if (Object.keys(a.pillars).length >= 3) strengths.push(`Variasi kontenmu sehat: ${Object.keys(a.pillars).join(', ')}.`);
  if (!strengths.length) strengths.push('Kamu udah konsisten posting dan mau dievaluasi — itu modal yang banyak akun nggak punya.');
  if (recs.length < 3) recs.push(`Coba pola hook yang belum kamu pakai — generator di tab Bikin Konten udah diatur ke voice ${f.name}.`);

  return {
    type: 'review', overall: a.overall, n: a.n,
    scores: [
      { aspect: 'Hook 3 detik', score: a.hookScore, note: badOpens.length ? badOpens.length + ' post dibuka basa-basi' : 'diukur dari baris pertama tiap caption' },
      { aspect: 'CTA (ajakan)', score: a.ctaScore, note: Math.round(a.ctaCoverage * 100) + '% post punya ajakan jelas' },
      { aspect: 'Hashtag', score: a.tagScore, note: 'median ' + a.medianTags + ' tag/post' + (a.megaShare > 0.3 ? ', banyak mega-tag' : '') },
      { aspect: 'Keterbacaan', score: a.readScore, note: 'rata-rata ' + Math.round(a.avgWords) + ' kata/caption' },
      { aspect: 'Variasi konten', score: a.varScore, note: Math.round(a.promoShare * 100) + '% promosi · ' + Object.keys(a.pillars).length + ' jenis pillar' },
    ],
    strengths, weaknesses, recommendations: recs,
    quick_wins: [
      'Tulis ulang baris pertama 3 post terakhirmu pakai pola hook (angka / pertanyaan / POV) — bisa langsung diedit di IG.',
      'Pin post dengan hook terbaikmu ke profil: ' + quote(bestHook.firstLine),
      `Siapkan CTA baku biar nggak lupa: "${f.cta}".`,
    ],
    perPost: a.posts.map((p, i) => ({ no: i + 1, firstLine: p.firstLine, hook: p.hook, pattern: p.patterns[0] ? p.patterns[0].label : (p.badOpen ? 'dibuka basa-basi' : 'belum ada pola kuat'), hasCTA: p.hasCTA, tags: p.hashtags.length, pillar: p.pillar })),
    learning_note: 'Skor dihitung dari pola nyata di caption-mu: baris pertama (hook), ajakan (CTA), jumlah & jenis hashtag, jeda baris, dan campuran jenis konten. Bukan tebakan — semua ada buktinya di atas.',
  };
}

/* ═══ REVIEWER INTERNAL: nilai kualitas hasil generate pakai kriteria yang sama kayak review akun ═══
 * Tiap hasil (script/carousel/caption/storyboard) di-cek: hook 3 detik, alur cerita, CTA, retensi,
 * keterbacaan — lalu dikasih skor + perbaikan konkret. Deterministik, dihitung dari struktur output.
 */
function reviewGenerated(type, d, f) {
  const checks = [];
  let metrics = { hook: null, cta: null, tags: null }; // metrik mentah buat dibandingin sama kompetitor
  const add = (label, ok, tip) => checks.push({ label, ok: !!ok, tip });
  const ctaRe = new RegExp(CTA_RE.source, 'i');
  if (type === 'script') {
    const h = analyzePost(d.hooks && d.hooks[0] ? d.hooks[0].text : (d.title || ''));
    const s1 = d.scenes[0] || {};
    add('Hook 3 detik pertama kuat', h.hook >= 7 && (s1.duration_sec || 99) <= 4, 'Buka pakai pola kuat (angka/pertanyaan/masalah) dalam ≤3 detik — bukan salam/intro.');
    const visuals = new Set(d.scenes.map(s => (s.visual || '').slice(0, 24)));
    add('Ada pattern interrupt (ganti visual/angle)', d.scenes.length >= 3 && visuals.size >= Math.min(3, d.scenes.length), 'Ganti angle/visual tiap 5–8 detik biar retensi kejaga.');
    add('Alur cerita lengkap (hook→isi→bukti→CTA)', new Set(d.scenes.map(s => s.role).filter(Boolean)).size >= 3, 'Pastikan ada pembuka, inti/konflik, bukti, dan penutup CTA.');
    const ctaScenes = d.scenes.filter(s => ctaRe.test(s.voiceover || '') || ctaRe.test(s.onscreen_text || '')).length;
    add('Tepat satu CTA yang jelas', !!d.cta && ctaScenes >= 1 && ctaScenes <= 2, 'Satu ajakan jelas di penutup; jangan tumpuk banyak CTA.');
    add('Pacing & durasi sehat', d.scenes.every(s => (s.duration_sec || 0) <= 12) && d.duration_sec <= 60, 'Tiap beat ≤ ~10 detik; total ≤ 60 detik buat Reels/TikTok.');
    metrics = { hook: h.hook, cta: ctaScenes >= 1, tags: null };
  } else if (type === 'storyboard') {
    const sbCta = ctaRe.test(d.production_notes || '') || (d.shots || []).some(s => ctaRe.test(s.onscreen_text || '') || ctaRe.test(s.voiceover || ''));
    add('Cukup shot buat bangun cerita', (d.shots || []).length >= 4, 'Minimal 4–6 shot biar alurnya kebangun.');
    add('Ada b-roll pendukung', (d.broll || []).length >= 2, 'Siapkan b-roll biar variasi visual & retensi kejaga.');
    add('Alur naratif jelas', (d.shots || []).length >= 4, 'Susun: pembuka → konflik/proses → resolusi.');
    add('Penutup mengarahkan aksi (CTA)', sbCta, 'Tutup dengan shot yang mengarahkan aksi/CTA.');
    metrics = { hook: null, cta: sbCta, tags: null };
  } else if (type === 'carousel') {
    const cover = analyzePost(d.slides && d.slides[0] ? (d.slides[0].headline || '') : '');
    const capA = analyzePost(d.caption || '');
    add('Hook cover kuat', cover.hook >= 6, 'Slide cover harus bikin berhenti scroll — janji/angka/pertanyaan.');
    add('Caption punya CTA', capA.hasCTA, 'Tutup caption dengan satu ajakan jelas.');
    add('Slide cukup (cerita utuh)', (d.slides || []).length >= 5, 'Idealnya 6–8 slide: cover → isi → CTA.');
    add('Hashtag pas (3–8, no mega-tag)', d.hashtags && d.hashtags.length >= 3 && d.hashtags.length <= 12, 'Pakai 3–8 hashtag niche; hindari mega-tag (#fyp #viral).');
    metrics = { hook: cover.hook, cta: capA.hasCTA, tags: (d.hashtags || []).length };
  } else if (type === 'caption') {
    const cap = analyzePost(d.caption_long || d.caption_short || '');
    add('Hook baris pertama kuat', cap.hook >= 7, 'Baris pertama = hook; mulai dari masalah/angka/pertanyaan.');
    add('Ada CTA jelas', cap.hasCTA, 'Tutup dengan satu ajakan jelas.');
    add('Gampang dibaca (ada jeda)', cap.hasBreaks || cap.words < 60, 'Kasih jeda baris; hindari caption tembok teks.');
    add('Hashtag pas', (d.hashtags || []).length >= 3 && (d.hashtags || []).length <= 15, 'Pakai 3–8 hashtag relevan.');
    metrics = { hook: cap.hook, cta: cap.hasCTA, tags: (d.hashtags || []).length };
  } else return null;
  const passed = checks.filter(c => c.ok).length;
  return { type, score: r1(passed / checks.length * 10), passed, total: checks.length, checks, fixes: checks.filter(c => !c.ok), metrics };
}
// panel "Nilai reviewer" di hasil generate (skor + checklist ✓/✗ + perbaikan)
function reviewPanel(rev) {
  if (!rev) return null;
  const good = rev.score >= 8;
  const box = el('div', { class: 'card', style: 'margin-top:14px; background:var(--pine-soft,#eef3ef); border:1px solid var(--line-2);' });
  box.append(el('div', { class: 'row between', style: 'align-items:center;' }, [
    el('b', { textContent: '🎯 Nilai reviewer' }),
    el('span', { class: 'badge ' + (good ? 'pine' : 'coral'), textContent: rev.score + '/10 · ' + rev.passed + '/' + rev.total + ' kriteria' }),
  ]));
  rev.checks.forEach(ch => box.append(el('div', { class: 'tiny', style: 'margin-top:6px; line-height:1.5; color:' + (ch.ok ? 'var(--pine,#2f6b4f)' : '#b2664a') + ';', textContent: (ch.ok ? '✓ ' : '✗ ') + ch.label + (ch.ok ? '' : ' — ' + ch.tip) })));
  box.append(el('div', { class: 'tiny', style: 'margin-top:8px; opacity:.85;', textContent: rev.fixes.length ? 'Perbaiki ' + rev.fixes.length + ' hal di atas → skor naik. Klik 🎲 (versi lain) buat variasi yang mungkin lebih kuat.' : 'Mantap — lolos semua kriteria reviewer. Siap posting.' }));
  return box;
}

/* ═══ BENCHMARK: bandingkan hasil generate dengan kompetitor (dari data banding tersimpan) ═══
 * compBench() meringkas laporan banding jadi angka acuan (disimpan di ce3_riset_<id>.bench).
 * benchVs() membandingkan metrik 1 konten dengan acuan itu → penjelasan "kamu vs kompetitor".
 */
const medianOf = arr => { const a = (arr || []).filter(v => v != null).slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
function compBench(rep) {
  const comps = (rep.competitors || []).filter(cp => cp.scores);
  if (!comps.length) return null;
  const S = comps.map(cp => cp.scores);
  return {
    n: comps.length, auto: !!rep.autoDetected, platform: rep.platform || 'instagram',
    handles: comps.map(cp => String(cp.handle || '').replace(/^@+/, '')).filter(Boolean).slice(0, 6),
    hook: r1(avg(S.map(s => s.hookScore))),
    cta: avg(S.map(s => s.ctaCoverage)),
    tags: medianOf(S.map(s => s.medianTags)),
    promo: avg(S.map(s => s.promoShare)),
    varScore: r1(avg(S.map(s => s.varScore))),
    gaps: (rep.gaps || []).slice(0, 4),
    actionIdeas: (rep.action_ideas || []).slice(0, 4), // ide konkret buat "include" ke Bikin Konten
  };
}
// bandingkan metrik 1 konten (dari rev.metrics) dengan acuan kompetitor → baris {v, label, text}
function benchVs(metrics, bench) {
  if (!metrics || !bench) return [];
  const out = [];
  if (metrics.hook != null) {
    const d = metrics.hook - bench.hook, v = Math.abs(d) <= 0.8 ? 'tie' : d > 0 ? 'win' : 'lose';
    out.push({ v, label: 'Hook 3 detik', text: 'konten ini ' + r1(metrics.hook) + '/10 vs kompetitor rata-rata ' + bench.hook + '/10 — ' + (v === 'win' ? 'kamu unggul, pertahankan pola pembukanya.' : v === 'lose' ? 'masih kalah kuat; buka pakai angka/pertanyaan/masalah, bukan salam.' : 'setara — menangkan lewat sudut, bukti, atau CTA.') });
  }
  if (metrics.cta != null) {
    const pct = Math.round(bench.cta * 100);
    const v = metrics.cta ? (bench.cta < 0.8 ? 'win' : 'tie') : (bench.cta >= 0.4 ? 'lose' : 'tie');
    out.push({ v, label: 'CTA (ajakan)', text: metrics.cta ? ('konten ini punya CTA jelas; cuma ' + pct + '% konten kompetitor pakai CTA — ' + (bench.cta < 0.8 ? 'ini keunggulanmu, jaga terus.' : 'sama-sama disiplin.')) : ('belum ada CTA, padahal ' + pct + '% konten kompetitor pakai — tambah 1 ajakan biar nggak kalah.') });
  }
  if (metrics.tags != null) {
    const healthy = metrics.tags >= 3 && metrics.tags <= 8, theyHealthy = bench.tags >= 3 && bench.tags <= 8;
    const v = healthy && !theyHealthy ? 'win' : healthy ? 'tie' : 'lose';
    out.push({ v, label: 'Hashtag', text: 'konten ini ' + metrics.tags + ' tag vs kompetitor median ' + bench.tags + ' — ' + (healthy ? 'kamu di rentang sehat 3–8.' : 'sesuaikan ke 3–8 tag niche biar penemuan optimal.') });
  }
  return out;
}
const BENCH_EMO = { win: '🟢', tie: '🟡', lose: '🔴' };
// panel "⚔️ Dibanding kompetitor" untuk 1 konten (di bawah panel Nilai reviewer)
function benchItemPanel(metrics, bench) {
  const lines = benchVs(metrics, bench);
  if (!lines.length) return null;
  const box = el('div', { class: 'card', style: 'margin-top:10px; background:var(--bg-2); border:1px dashed var(--line-2);' });
  box.append(el('div', { class: 'tiny', style: 'font-weight:700;', textContent: '⚔️ Dibanding kompetitor' + (bench.auto ? ' (pola niche)' : ' (' + bench.n + ' akun: @' + bench.handles.slice(0, 3).join(', @') + (bench.handles.length > 3 ? '…' : '') + ')') }));
  lines.forEach(l => box.append(el('div', { class: 'tiny', style: 'margin-top:6px; line-height:1.5;', html: BENCH_EMO[l.v] + ' <b>' + l.label + '</b> — ' + l.text })));
  const win = lines.filter(l => l.v === 'win').length, lose = lines.filter(l => l.v === 'lose').length;
  box.append(el('div', { class: 'tiny', style: 'margin-top:8px; opacity:.85;', textContent: lose === 0 && win > 0 ? 'Konten ini unggul di ' + win + ' hal — kemungkinan menonjol di feed niche ini.' : lose > win ? 'Masih ketinggalan — benahi yang 🔴 dulu biar nggak tenggelam.' : 'Bersaing ketat — cari 1 pembeda yang belum digarap kompetitor (lihat celah di tab Riset).' }));
  return box;
}
// kartu ringkasan "Kamu vs kompetitor" (agregat semua konten dinilai)
function benchSummaryCard(scored, bench) {
  const pick = k => scored.map(x => x.rev.metrics && x.rev.metrics[k]).filter(v => v != null);
  const hooks = pick('hook'), ctas = pick('cta'), tags = pick('tags');
  const rows = [];
  if (hooks.length) { const my = r1(avg(hooks)), v = Math.abs(my - bench.hook) <= 0.8 ? 'tie' : my > bench.hook ? 'win' : 'lose'; rows.push({ emo: '🪝', label: 'Hook 3 detik', mine: my + '/10', theirs: bench.hook + '/10', v }); }
  if (ctas.length) { const myp = avg(ctas.map(b => b ? 1 : 0)), v = myp >= 0.8 && bench.cta < 0.8 ? 'win' : myp < 0.5 && bench.cta >= 0.5 ? 'lose' : 'tie'; rows.push({ emo: '📣', label: 'Pakai CTA', mine: Math.round(myp * 100) + '%', theirs: Math.round(bench.cta * 100) + '%', v }); }
  if (tags.length) { const myt = medianOf(tags), healthy = myt >= 3 && myt <= 8, v = healthy && !(bench.tags >= 3 && bench.tags <= 8) ? 'win' : healthy ? 'tie' : 'lose'; rows.push({ emo: '#️⃣', label: 'Hashtag (median)', mine: String(myt), theirs: String(bench.tags), v }); }
  if (!rows.length) return null;
  const card = el('div', { class: 'card', style: 'margin-top:14px; border:1.5px solid var(--pine);' });
  card.append(el('div', { class: 'result-head' }, [el('span', { class: 'e', textContent: '⚔️' }), el('h3', { textContent: 'Kamu vs kompetitor' })]));
  card.append(el('p', { class: 'tiny', style: 'margin:0 0 10px;', textContent: bench.auto ? 'Acuan dari analisis pola niche-mu (belum tempel caption kompetitor asli). Tempel caption mereka di tab Riset buat acuan yang lebih tajam.' : 'Acuan dari ' + bench.n + ' kompetitor yang kamu banding di tab Riset (@' + bench.handles.slice(0, 3).join(', @') + (bench.handles.length > 3 ? '…' : '') + ').' }));
  rows.forEach(r => card.append(el('div', { class: 'bench-row' }, [
    el('span', { class: 'bench-emo', textContent: r.emo }),
    el('span', { class: 'bench-label', textContent: r.label }),
    el('span', { class: 'bench-nums', html: '<b>' + r.mine + '</b> <span style="opacity:.6;">vs ' + r.theirs + '</span>' }),
    el('span', { class: 'badge ' + (r.v === 'win' ? 'pine' : r.v === 'lose' ? 'coral' : ''), textContent: r.v === 'win' ? 'Unggul' : r.v === 'lose' ? 'Di bawah' : 'Setara' }),
  ])));
  const wins = rows.filter(r => r.v === 'win').length, loses = rows.filter(r => r.v === 'lose').length;
  card.append(el('div', { class: 'hint', style: 'margin-top:10px;', textContent: loses === 0 && wins > 0 ? '👍 Rata-rata kontenmu unggul di ' + wins + ' dari ' + rows.length + ' aspek dibanding kompetitor. Pertahankan.' : loses > wins ? '⚠️ Kontenmu masih kalah di ' + loses + ' aspek. Benahi yang "Di bawah" dulu — dampaknya paling besar.' : 'Bersaing ketat. Menangkan lewat celah yang belum digarap kompetitor (lihat 🎓 di tab Riset).' }));
  if (bench.gaps && bench.gaps.length) card.append(el('div', { class: 'tiny', style: 'margin-top:8px;', html: '💡 Celah yang belum digarap kompetitor: <b>' + bench.gaps.map(g => String(g).replace(/ — .*/, '')).join('</b>, <b>') + '</b> — ambil sudut ini biar beda.' }));
  return card;
}

/* ═══ MELATIH ONBOARDING: data perbandingan kompetitor → saran pertajam profil brand ═══
 * Kelemahan & celah kompetitor diterjemahkan jadi rekomendasi PILAR konten + catatan strategi,
 * lalu bisa diterapkan langsung ke profil (yang menyetir semua hasil generate).
 */
function profileTraining(c, rep) {
  const comps = (rep.competitors || []).filter(cp => cp.scores);
  if (!comps.length) return null;
  const n = comps.length, half = Math.ceil(n / 2);
  const heavyPromo = comps.filter(cp => cp.scores.promoShare > 0.5).length;
  const weakHook = comps.filter(cp => cp.scores.hookScore < 6).length;
  const lowVar = comps.filter(cp => cp.scores.varScore < 6).length;
  const lowCta = comps.filter(cp => cp.scores.ctaCoverage < 0.5).length;
  const rec = new Set(), notes = [];
  if (heavyPromo >= half) { ['Edukasi', 'Hiburan', 'Behind The Scenes'].forEach(p => rec.add(p)); notes.push(heavyPromo + ' dari ' + n + ' kompetitor kebanyakan jualan — rebut audiensnya lewat konten MEMBERI (edukasi, hiburan, BTS).'); }
  if (weakHook >= half) { rec.add('Storytelling'); notes.push(weakHook + ' dari ' + n + ' buka konten datar — menang di 3 detik pertama: hook kuat + storytelling.'); }
  if (lowVar >= half) { ['Tips & Trik', 'Komunitas'].forEach(p => rec.add(p)); notes.push('Variasi konten mereka tipis — tampil beda dengan pilar yang lebih kaya (tips, komunitas).'); }
  if (lowCta >= half) notes.push('Mereka sering lupa CTA — kamu unggul cuma dengan disiplin satu ajakan (CTA) tiap post.');
  (rep.gaps || []).slice(0, 2).forEach(g => notes.push('Celah kosong: ' + String(g).replace(/ — .*/, '') + ' — jadikan sudut kontenmu.'));
  if (!rec.size && !notes.length) return null;
  if (!rec.size) ['Edukasi', 'Social Proof'].forEach(p => rec.add(p));
  const cur = new Set(Array.isArray(c.pillars) && c.pillars.length ? c.pillars : PILLAR_DEFAULT);
  return { recommended: [...rec], missing: [...rec].filter(p => !cur.has(p)), notes: notes.slice(0, 5) };
}
// panel "Pertajam profil dari kompetitor" — insight + tombol terapkan ke pilar profil
function renderProfileTraining(c, rep) {
  const t = profileTraining(c, rep);
  if (!t || (!t.notes.length && !t.missing.length)) return null;
  const card = el('div', { class: 'card', style: 'margin-top:16px; border:1.5px solid var(--pine);' });
  card.append(el('div', { class: 'result-head' }, [el('span', { class: 'e', textContent: '🎓' }), el('h3', { textContent: 'Pertajam profil dari data kompetitor' })]));
  card.append(el('p', { class: 'tiny', style: 'margin:0 0 8px;', textContent: 'Insight ini "melatih" profil brand-mu (yang menyetir semua hasil generate). Terapkan yang relevan → hasil berikutnya makin tajam.' }));
  const ul = el('ul', { class: 'clean idea' }); t.notes.forEach(nt => ul.append(el('li', { textContent: nt }))); card.append(ul);
  if (t.missing.length) {
    card.append(el('div', { class: 'tiny', style: 'margin-top:6px;', html: 'Pilar disarankan yang belum ada di profilmu: <b>' + t.missing.join(', ') + '</b>' }));
    const btn = el('button', { class: 'primary', style: 'margin-top:8px;', textContent: '✅ Tambah ' + t.missing.length + ' pilar ke profil' });
    btn.onclick = () => {
      const cur = (Array.isArray(c.pillars) && c.pillars.length ? c.pillars.slice() : PILLAR_DEFAULT.slice());
      t.missing.forEach(p => { if (!cur.includes(p)) cur.push(p); });
      c.pillars = cur; saveClient(c);
      btn.disabled = true; btn.textContent = '✓ Diterapkan — pilar profil diperbarui';
      toast('Profil dipertajam: +' + t.missing.length + ' pilar ✓', 'ok');
    };
    card.append(btn);
  } else {
    card.append(el('div', { class: 'hint', style: 'margin-top:6px;', textContent: 'Pilar kontenmu sudah menutup celah ini — fokus eksekusi.' }));
  }
  return card;
}

// pola konten yang sering ditinggalkan kompetitor → jadi peluang "celah"
const GAP_PLAYS = [
  { label: 'Balas komentar dijadikan konten', re: /(balas|jawab|reply).{0,12}komen/i, idea: 'Tiap Jumat, ambil 1 komentar/pertanyaan menarik dan jawab lewat video — audiens merasa didengar, kamu dapat ide konten gratis.' },
  { label: 'Behind the scenes rutin', re: /(behind|di ?balik|bts\b|dapur|proses (produksi|pembuatan))/i, idea: 'Seri BTS mingguan: proses, tim, kegagalan kecil. Kompetitormu cuma pamer hasil — kamu tunjukkan perjalanannya.' },
  { label: 'Kejujuran soal ekspektasi', re: /(jujur|realistis|nggak instan|butuh waktu|no bullshit)/i, idea: 'Konten "ekspektasi realistis" — jujur soal batas produk/jasamu. Trust yang dibangun kompetitor lewat over-claim, kamu rebut lewat kejujuran.' },
  { label: 'Konten komunitas / UGC', re: /(repost|dari kalian|ugc|karya (kalian|customer)|foto dari pembeli)/i, idea: 'Repost konten pelanggan tiap minggu (minta izin). Bukti sosial gratis + pelanggan makin loyal karena diorangkan.' },
  { label: 'Seri edukasi bersambung', re: /(part \d|eps\.? ?\d|episode|seri\b)/i, idea: 'Bikin seri bersambung ("Part 1 dari 5") — alasan orang follow: takut ketinggalan kelanjutannya.' },
  { label: 'Format tanya-jawab interaktif', re: /(qna|q&a|tanya.{0,10}jawab|kotak pertanyaan|question sticker)/i, idea: 'Q&A story mingguan → jawaban terbaik jadi Reels. Dua konten dari satu usaha.' },
];
/* ═══════════════ AUDIT AKUN (checklist mandiri, tanpa data post) ═══════════════
 * Browser nggak bisa baca isi IG/TikTok. Jadi Review akun = panduan audit jujur:
 * daftar cek yang disesuaikan brand + platform, buat dinilai sendiri sambil buka akunnya.
 */
function auditChecklist(c, handle, platform) {
  const f = factsOf(c);
  const isTT = /tiktok/i.test(platform || '');
  const plat = isTT ? 'TikTok' : 'Instagram';
  const who = (handle || '').trim() || (c.social || 'akunmu');
  const niche = f.bank.niche || f.name;
  const catExtra = c.category === 'skincare'
    ? 'Tidak ada klaim medis/"memutihkan"/"permanen" — pakai "membantu merawat / menyamarkan / kulit tampak lebih…". Cantumkan no. BPOM bila ada.'
    : c.category === 'fnb' ? 'Cantumkan cara order + harga jujur + status halal (bila ada); tanpa klaim kesehatan/diet berlebihan.'
    : 'Tanpa superlatif kosong ("terbaik #1") atau angka yang mengada-ada.';
  const bioLink = isTT ? 'link di bio ngarah ke 1 tujuan jelas (order/katalog)' : 'link bio (Linktree/1 link) ngarah ke order/katalog, bukan halaman ngambang';
  const cover = isTT ? 'teks cover kebaca < 1 detik, kontras, nggak ketutup UI TikTok' : 'cover Reels seragam + font kebaca; grid feed enak dilihat 3 detik';
  const sections = [
    { title: '📇 Bio & Profil', items: [
      'Bio ' + who + ' jelas: siapa kamu + buat siapa + apa manfaatnya, dalam 1 kalimat.',
      'Ada ' + bioLink + '.',
      'Foto profil & highlight rapi; nama akun gampang dicari (' + niche + ').',
      f.promo ? ('Promo aktif ("' + f.promo + '") kelihatan di bio/highlight.') : 'Kalau ada promo, taruh di bio/highlight biar gampang keliatan.',
    ] },
    { title: '🪝 Hook 3 detik pertama', items: [
      'Tiap post dibuka pakai hook (masalah/pertanyaan/angka), BUKAN salam "halo gengs".',
      'Hook nyentuh pain audiens: "' + f.pain + '".',
      cover + '.',
      'Coba minimal 3 pola hook beda tiap minggu (problem, mitos-vs-fakta, before-after).',
    ] },
    { title: '🎯 Pillar & Konsistensi', items: [
      'Rasio konten ±80% memberi nilai / 20% jualan — bukan jualan terus.',
      'Jadwal posting tetap (mis. 4–5x/minggu); tentukan 3 pillar konten utama.',
      'Nada konsisten sesuai brand: ' + toneList(c).join(', ') + '; sapaan "' + f.sapaan + '" dipakai seragam.',
      f.signature ? ('Frasa khas "' + f.signature + '" muncul rutin biar khas.') : 'Punya 1 frasa khas/tagline yang diulang biar diingat.',
    ] },
    { title: '#️⃣ Hashtag & Caption', items: [
      'Pakai 3–5 hashtag mid-tier relevan; hindari #fyp/#viral yang kegedean.',
      'Kalimat penting ada di 125 karakter pertama caption (sebelum "more").',
      'Baris pendek, ada jeda; ajak baca sampai habis.',
      catExtra,
    ] },
    { title: '📣 CTA & Konversi', items: [
      'Tiap post punya TEPAT 1 CTA jelas — mis. "' + f.cta + '".',
      'CTA gampang dieksekusi (link/DM/komen keyword), bukan "cek bio" doang.',
      'Story rutin ngarahin ke penawaran/lead (poll, pertanyaan, countdown).',
      f.proof ? ('Bukti/sosial proof ("' + f.proof + '") dipamerin berkala.') : 'Tunjukin bukti (testimoni/hasil/angka) biar dipercaya.',
    ] },
    { title: '📊 Metrik yang dipantau', items: [
      'Pantau watch-time/retensi & saves — bukan cuma likes.',
      'Catat 3 post terbaik tiap bulan → tiru polanya, buang yang flop.',
      'Cek jam audiens paling aktif (Insights) → posting di jam itu.',
      'Bandingkan diri sendiri bulan-ke-bulan, bukan sama akun gede yang beda modal.',
    ] },
  ];
  return {
    handle: who.startsWith('@') || who === (c.social || 'akunmu') ? who : '@' + who,
    platform: plat,
    total: sections.reduce((n, s) => n + s.items.length, 0),
    sections,
    learning_note: 'Ini panduan audit mandiri (bukan skor dari data asli — browser nggak bisa baca ' + plat + '). Buka ' + who + ', centang yang sudah beres, kerjakan yang belum. Yang paling ngefek: hook 3 detik + 1 CTA jelas.',
  };
}
// label ARKETIPE pola konten (bukan akun asli — auto-deteksi cuma menganalisis POLA, bukan akun beneran)
const ARCHETYPE_LABELS = ['Pola "Jualan Terus"', 'Pola "Estetik"', 'Pola "Edukatif"'];
// Pool akun ASLI & terverifikasi (semua dicek resolve via embed IG). Tiap akun diberi kata kunci
// jasa/produk → saran kompetitor dicocokkan ke JASA YANG BRAND TAWARKAN, bukan cuma kategori kasar.
const HANDLE_POOL = [
  // skincare / beauty
  { h: 'somethincofficial', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'serum', 'kosmetik', 'wajah', 'kulit'] },
  { h: 'avoskinbeauty', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'serum', 'kulit', 'lokal'] },
  { h: 'npureofficial', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'natural', 'kulit'] },
  { h: 'wardahbeauty', d: 'beauty', kw: ['kosmetik', 'makeup', 'kecantikan', 'halal', 'beauty', 'skincare'] },
  // f&b
  { h: 'kopikenangan.id', d: 'fnb', kw: ['kopi', 'minuman', 'cafe', 'coffee', 'fnb', 'ngopi'] },
  { h: 'haus.indonesia', d: 'fnb', kw: ['minuman', 'teh', 'boba', 'fnb', 'cafe', 'jus', 'thai tea'] },
  { h: 'geprekbensu', d: 'fnb', kw: ['ayam', 'makanan', 'resto', 'fnb', 'geprek', 'kuliner', 'nasi'] },
  // fashion
  { h: 'erigostore', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'streetwear', 'clothing', 'kaos', 'outfit'] },
  { h: 'hijup', d: 'fashion', kw: ['fashion', 'hijab', 'muslim', 'busana', 'pakaian', 'gamis'] },
  { h: 'uniqloindonesia', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'clothing', 'outfit'] },
  // edukasi / kelas / kursus
  { h: 'ruangguru', d: 'edu', kw: ['edukasi', 'belajar', 'kelas', 'les', 'pendidikan', 'bimbel', 'kursus', 'sekolah'] },
  { h: 'skillacademy.id', d: 'edu', kw: ['kelas', 'kursus', 'skill', 'online', 'pelatihan', 'edukasi', 'sertifikat'] },
  { h: 'pahamify', d: 'edu', kw: ['belajar', 'edukasi', 'utbk', 'pendidikan', 'les', 'bimbel'] },
  { h: 'dicoding', d: 'edu', kw: ['coding', 'programming', 'developer', 'kelas', 'edukasi', 'kursus'] },
  // rumah / interior / renovasi / desain
  { h: 'dekoruma', d: 'home', kw: ['interior', 'furnitur', 'rumah', 'desain', 'renovasi', 'dekorasi', 'perabot', 'mebel'] },
  { h: 'ruparupacom', d: 'home', kw: ['furnitur', 'rumah', 'interior', 'perabot', 'dekorasi', 'peralatan'] },
  // kesehatan / klinik
  { h: 'halodoc', d: 'health', kw: ['kesehatan', 'dokter', 'klinik', 'medis', 'konsultasi', 'health', 'obat', 'sehat'] },
  { h: 'klikdokter', d: 'health', kw: ['kesehatan', 'dokter', 'medis', 'konsultasi', 'sehat'] },
  { h: 'prodia_lab', d: 'health', kw: ['kesehatan', 'lab', 'tes', 'medis', 'diagnostik', 'cek'] },
  // logistik / ekspedisi
  { h: 'jne_id', d: 'logistik', kw: ['logistik', 'ekspedisi', 'kirim', 'pengiriman', 'kurir', 'cargo', 'paket'] },
  { h: 'sicepat_ekspres', d: 'logistik', kw: ['logistik', 'ekspedisi', 'kirim', 'pengiriman', 'kurir', 'paket'] },
  { h: 'anteraja.id', d: 'logistik', kw: ['logistik', 'ekspedisi', 'kirim', 'pengiriman', 'kurir', 'paket'] },
  // keuangan / fintech
  { h: 'ovo_id', d: 'finance', kw: ['keuangan', 'pembayaran', 'dompet', 'fintech', 'finansial', 'transaksi'] },
  { h: 'dana.id', d: 'finance', kw: ['keuangan', 'pembayaran', 'dompet', 'fintech', 'finansial', 'transaksi'] },
  { h: 'bibit.id', d: 'finance', kw: ['investasi', 'keuangan', 'reksadana', 'finansial', 'fintech', 'nabung'] },
  { h: 'ajaib_investasi', d: 'finance', kw: ['investasi', 'saham', 'keuangan', 'finansial', 'trading'] },
  // teknologi / software / AI / digital / jasa perusahaan
  { h: 'dewaweb', d: 'tech', kw: ['hosting', 'website', 'digital', 'teknologi', 'it', 'server', 'web', 'domain', 'cloud', 'software'] },
  { h: 'nodeflux', d: 'tech', kw: ['ai', 'teknologi', 'software', 'perusahaan', 'it', 'digital', 'otomasi', 'data', 'saas', 'aplikasi', 'sistem'] },
  // marketplace / jualan online umum
  { h: 'tokopedia', d: 'market', kw: ['marketplace', 'online', 'belanja', 'ecommerce', 'jual', 'toko'] },
  { h: 'shopee_id', d: 'market', kw: ['marketplace', 'online', 'belanja', 'ecommerce', 'jual', 'toko'] },
  // ── tambahan biar tiap niche bisa ngasih sampai 6 saran ──
  { h: 'scarlett_whitening', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'whitening', 'kulit', 'lokal'] },
  { h: 'eminacosmetics', d: 'beauty', kw: ['kosmetik', 'makeup', 'kecantikan', 'beauty', 'skincare', 'remaja'] },
  { h: 'kopijanjijiwa', d: 'fnb', kw: ['kopi', 'minuman', 'cafe', 'coffee', 'fnb', 'ngopi'] },
  { h: 'mixueindonesia', d: 'fnb', kw: ['minuman', 'es krim', 'dessert', 'fnb', 'cafe', 'boba'] },
  { h: 'esteh.indonesia', d: 'fnb', kw: ['minuman', 'teh', 'es teh', 'fnb', 'jus', 'thai tea'] },
  { h: '3secondofficial', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'clothing', 'kaos', 'outfit', 'distro'] },
  { h: 'cottonink', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'busana', 'wanita', 'outfit'] },
  { h: 'thisisapparel', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'clothing', 'kaos', 'outfit', 'streetwear'] },
  { h: 'zenius', d: 'edu', kw: ['belajar', 'edukasi', 'utbk', 'pendidikan', 'les', 'bimbel', 'kelas'] },
  { h: 'quipperindonesia', d: 'edu', kw: ['belajar', 'edukasi', 'pendidikan', 'les', 'bimbel', 'kelas', 'sekolah'] },
  { h: 'informa_id', d: 'home', kw: ['interior', 'furnitur', 'rumah', 'perabot', 'dekorasi', 'mebel'] },
  { h: 'ikea_id', d: 'home', kw: ['furnitur', 'rumah', 'interior', 'perabot', 'dekorasi', 'desain'] },
  { h: 'homedecor.id', d: 'home', kw: ['interior', 'dekorasi', 'rumah', 'desain', 'renovasi'] },
  { h: 'alodokter', d: 'health', kw: ['kesehatan', 'dokter', 'medis', 'konsultasi', 'sehat', 'klinik'] },
  { h: 'gooddoctorid', d: 'health', kw: ['kesehatan', 'dokter', 'medis', 'konsultasi', 'sehat', 'obat'] },
  { h: 'jntexpressid', d: 'logistik', kw: ['logistik', 'ekspedisi', 'kirim', 'pengiriman', 'kurir', 'paket'] },
  { h: 'posindonesia.ig', d: 'logistik', kw: ['logistik', 'ekspedisi', 'kirim', 'pengiriman', 'kurir', 'paket', 'pos'] },
  { h: 'jeniusconnect', d: 'finance', kw: ['keuangan', 'perbankan', 'dompet', 'fintech', 'finansial', 'nabung', 'kartu'] },
  { h: 'gopayindonesia', d: 'finance', kw: ['keuangan', 'pembayaran', 'dompet', 'fintech', 'finansial', 'transaksi'] },
  { h: 'niagahoster', d: 'tech', kw: ['hosting', 'website', 'digital', 'teknologi', 'it', 'server', 'web', 'domain', 'cloud'] },
  { h: 'jagoanhosting', d: 'tech', kw: ['hosting', 'website', 'digital', 'teknologi', 'it', 'server', 'web', 'domain'] },
  { h: 'sirclo', d: 'tech', kw: ['software', 'saas', 'ecommerce', 'teknologi', 'digital', 'aplikasi', 'sistem', 'perusahaan'] },
  { h: 'bliblidotcom', d: 'market', kw: ['marketplace', 'online', 'belanja', 'ecommerce', 'jual', 'toko'] },
  { h: 'lazada_id', d: 'market', kw: ['marketplace', 'online', 'belanja', 'ecommerce', 'jual', 'toko'] },
  { h: 'bukalapak', d: 'market', kw: ['marketplace', 'online', 'belanja', 'ecommerce', 'jual', 'toko'] },
  // ── tambahan lagi biar niche utama bisa ngasih sampai ~10 saran ──
  { h: 'makeoverid', d: 'beauty', kw: ['kosmetik', 'makeup', 'kecantikan', 'beauty', 'skincare'] },
  { h: 'azarine.cosmetic', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'sunscreen', 'kulit', 'lokal'] },
  { h: 'hanasui.official', d: 'beauty', kw: ['kosmetik', 'makeup', 'kecantikan', 'beauty', 'skincare', 'lokal'] },
  { h: 'sensatiabotanicals', d: 'beauty', kw: ['skincare', 'kecantikan', 'beauty', 'natural', 'kulit', 'organik'] },
  { h: 'kfcindonesia', d: 'fnb', kw: ['ayam', 'makanan', 'resto', 'fnb', 'kuliner', 'fast food'] },
  { h: 'mcdonaldsid', d: 'fnb', kw: ['makanan', 'resto', 'fnb', 'kuliner', 'burger', 'fast food'] },
  { h: 'chatimeindonesia', d: 'fnb', kw: ['minuman', 'teh', 'boba', 'fnb', 'cafe', 'bubble tea'] },
  { h: 'richeesefactory', d: 'fnb', kw: ['ayam', 'makanan', 'resto', 'fnb', 'kuliner', 'keju'] },
  { h: 'berrybenka', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'busana', 'wanita', 'outfit'] },
  { h: 'eigeradventure', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'outdoor', 'tas', 'outfit'] },
  { h: 'matahari', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'busana', 'outfit', 'clothing'] },
  { h: 'zaloraid', d: 'fashion', kw: ['fashion', 'baju', 'pakaian', 'busana', 'outfit', 'clothing'] },
];
// KATEGORI brand (dipilih user) → domain pool yang PASTI relevan. Ini patokan utama, nggak bisa nyasar.
const CAT_DOMAIN = { skincare: 'beauty', fnb: 'fnb', fashion: 'fashion', edu: 'edu' };
// Buat kategori generik (service/other): tebak niche dari APA YANG DIJUAL, kata kunci SPESIFIK.
// Urutan = prioritas → niche produk (beauty/fashion/fnb/edu) didahulukan sebelum layanan (logistik/finance/dst).
const NICHE_HINTS = [
  ['beauty', /\b(skincare|serum|kosmetik|makeup|kecantikan|sunscreen|parfum|salon|spa|facial|lipstik|toner|bedak|lulur)\b/i],
  ['fashion', /\b(jas|jahit|konveksi|seragam|butik|kemeja|celana|setelan|tailor|baju|pakaian|busana|outfit|distro|hijab|gamis|fashion|clothing|sepatu|sandal|dress|kaos|jaket|batik)\b/i],
  ['fnb', /\b(kopi|coffee|minuman|kuliner|makanan|resto|restoran|cafe|kafe|boba|snack|catering|kue|bakery|roti|dessert|jajanan|frozen)\b/i],
  ['edu', /\b(kelas|kursus|les|bimbel|edukasi|belajar|pelatihan|coding|sekolah|webinar|bootcamp|akademi|sertifikasi|tutor)\b/i],
  ['health', /\b(klinik|dokter|kesehatan|medis|apotek|obat|terapi|gym|fitness|herbal|suplemen|laboratorium)\b/i],
  ['home', /\b(interior|furnitur|furniture|dekorasi|renovasi|mebel|perabot|properti|kontraktor|arsitek)\b/i],
  ['finance', /\b(fintech|investasi|asuransi|reksadana|saham|pinjaman|kredit|akuntansi|pajak|paylater|perbankan)\b/i],
  ['tech', /\b(software|aplikasi|saas|hosting|website|startup|developer|digital agency|sistem informasi)\b/i],
  ['logistik', /\b(ekspedisi|kurir|cargo|kargo|logistik|forwarder|trucking|jasa kirim|jasa pengiriman)\b/i],
  ['market', /\b(marketplace|e-?commerce|dropship|reseller|olshop)\b/i],
];
// Saran kompetitor: KATEGORI dulu (paling andal), baru tebak niche dari produk buat service/other.
// Prinsip: mendingan KOSONG (arahkan ke Cari kompetitor) daripada kasih akun nyasar (mis. Pos Indonesia).
function suggestCompetitors(c, extra) {
  // 1) kategori jelas (skincare/fnb/fashion/edu) → langsung akun se-domain, banyak & pasti relevan
  const catDom = CAT_DOMAIN[c.category];
  if (catDom) return HANDLE_POOL.filter(p => p.d === catDom).map(p => p.h).slice(0, MAX_COMP);
  // 2) service/other → tebak niche dari APA YANG DIJUAL (produk/nama/USP/deskripsi), bukan kata umum
  const sell = ' ' + [extra || '', c.products, c.name, c.usp, c.desire].join(' ').toLowerCase() + ' ';
  const hit = NICHE_HINTS.find(([, re]) => re.test(sell));
  if (hit) return HANDLE_POOL.filter(p => p.d === hit[0]).map(p => p.h).slice(0, MAX_COMP);
  // 3) niche nggak kebaca → JANGAN kasih akun ngawur. Kosong → UI arahin ke "Cari kompetitor" (isi manual).
  return [];
}
// handle IG → nama brand buat ditampilkan & dipakai jadi kata kunci pencarian lintas platform
function prettyBrand(handle) {
  let s = String(handle || '').replace(/^@+/, '').toLowerCase();
  s = s.replace(/[._]+/g, ' ').replace(/official|indonesia|\bid\b|\big\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length < 2) s = String(handle || '').replace(/^@+/, '');
  return s.replace(/\b\w/g, ch => ch.toUpperCase());
}
// link cek 1 kompetitor LINTAS PLATFORM. IG = profil asli (handle terverifikasi dari pool);
// TikTok/YouTube/Web = pencarian pakai nama brand (jujur: handle antar platform bisa beda, nggak dikarang).
function crossPlatformLinks(handle) {
  const clean = String(handle || '').replace(/^@+/, '').replace(/\s+/g, '').trim();
  const b = prettyBrand(clean);
  return [
    { plat: 'ig', label: '📸 IG', title: 'Buka profil Instagram asli', url: 'https://www.instagram.com/' + encodeURIComponent(clean) + '/' },
    { plat: 'tt', label: '🎵 TikTok', title: 'Cari di TikTok (handle bisa beda dari IG)', url: 'https://www.tiktok.com/search?q=' + encodeURIComponent(b) },
    { plat: 'yt', label: '▶️ YouTube', title: 'Cari channel di YouTube', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(b) },
    { plat: 'web', label: '🌐 Web', title: 'Cari website resmi', url: 'https://www.google.com/search?q=' + encodeURIComponent(b + ' website resmi') },
  ];
}
// Deteksi OTOMATIS: rakit 3 arketipe POLA konten yang lazim di niche brand
// (jualan terus / estetik / edukatif). Caption tiap pola disintesis deterministik dari
// bank kategori supaya analisisnya realistis. Ini POLA, bukan akun IG asli — jadi
// nggak ada handle palsu/preview yang menyesatkan. Preview IG asli = dari handle yang user isi.
function detectCompetitors(c) {
  const f = factsOf(c);
  const rng = mulberry(c.id + '|detect'); // seed tetap → hasil sama tiap kali
  const tags = (f.bank.tags && f.bank.tags.length) ? f.bank.tags : ['bisnislokal', 'umkm', 'viral', 'fyp'];
  const tg = i => '#' + tags[((i % tags.length) + tags.length) % tags.length];
  const tips = (f.bank.tips && f.bank.tips.length) ? f.bank.tips : [{ t: 'Konsistensi', d: 'Rutin posting lebih penting daripada sempurna.' }];
  const mists = (f.bank.mistakes && f.bank.mistakes.length) ? f.bank.mistakes : [{ t: 'Asal posting', d: 'tanpa hook di 3 detik pertama.' }];
  const prod = lower1(f.product || 'produk kami');
  const labels = ARCHETYPE_LABELS;
  // 1) Si Jualan Terus — promo terus, pembuka datar, CTA agresif, mega-hashtag
  const hardsell = [];
  for (let i = 0; i < 6; i++) {
    const disc = pick(rng, ['20%', '30%', '50%', 'up to 40%']);
    hardsell.push(`Halo gengs! PROMO SPESIAL diskon ${disc} ${prod} khusus hari ini aja 🔥🔥 Buruan checkout sebelum kehabisan, order sekarang lewat DM ya! #${tags[0]} #promo #viral #fyp #racunshopee #diskonheboh`);
  }
  // 2) Si Estetik — caption pendek estetik, tanpa CTA, minim hashtag
  const aesthetic = ['golden hour ✨', 'less is more 🤍', 'self reminder ☕', 'quiet luxury.', 'mood of the day 🌿', 'in my soft era ✨'];
  // 3) Si Edukatif — hook kuat + tips + CTA + hashtag sehat (lawan terberat)
  const hooks = makeHooks(f, '', rng, 6);
  const edu = [];
  for (let i = 0; i < 6; i++) {
    const tip = tips[i % tips.length], mist = mists[i % mists.length];
    edu.push(`${hooks[i % hooks.length].text}\n\n${cap1(tip.t)}: ${tip.d} Banyak yang skip ini, padahal ${lower1(mist.d)}\n\nSave biar nggak lupa ya, share ke temen yang butuh! ${tg(i)} ${tg(i + 1)} ${tg(i + 2)}`);
  }
  return [
    { handle: labels[0], archetype: true, raw: hardsell.join('\n---\n') },
    { handle: labels[1], archetype: true, raw: aesthetic.join('\n---\n') },
    { handle: labels[2], archetype: true, raw: edu.join('\n---\n') },
  ];
}
// contoh caption "akunmu" versi ProdPilot — dipakai buat ngisi kolom "kamu" otomatis
// kalau user belum nempel caption aslinya. Deterministik & lolos compliance (genCaption).
function mySampleFromBrand(c) {
  const f = factsOf(c);
  const topics = (f.bank.topics && f.bank.topics.length) ? f.bank.topics : ['produk andalan kami'];
  const goals = ['Edukasi', 'Interaksi', 'Cerita', 'Edukasi', 'Interaksi', 'Jualan']; // rasio sehat: 1 promosi
  // teks ini nggak ditampilkan (cuma dianalisis buat skor). Buang token yang bikin analyzer
  // salah kira "promosi" — mis. nama produk ber-% ("Niacinamide 10%") atau harga — dari post non-jualan,
  // biar pillar-nya kebaca benar & porsi jualan realistis (bukan seolah jualan terus).
  const dePromo = s => String(s).replace(/\d+\s*%/g, '').replace(/rp\s?\d[\d.,]*/gi, '').replace(/\d+\s*rb/gi, '')
    .replace(/\b(checkout|order sekarang|beli|diskon|promo|sale|gratis ongkir)\b/gi, ''); // netralkan verba hard-sell di post non-jualan
  const posts = [];
  for (let i = 0; i < 6; i++) {
    const cap = genCaption(c, { topic: topics[i % topics.length], goal: goals[i] }, i + 1);
    let text = cap.caption_long + '\n\n' + cap.hashtags.join(' ');
    if (goals[i] !== 'Jualan') text = dePromo(text); // sisakan 1 post promosi → 80/20
    posts.push(text);
  }
  return posts.join('\n---\n');
}
// bandingkan akun kita vs kompetitor (skor, pola hook, tiru/kelemahan) + carikan celah
function compareReport(c, myRaw, comps, autoDetected, realHandles) {
  const f = factsOf(c);
  const rng = mulberry(c.id + '|compare|' + comps.map(x => x.handle).join(','));
  // kolom "kamu": pakai caption asli kalau ditempel (≥2 post), kalau nggak → contoh ProdPilot
  const hasMyReal = myRaw && parsePosts(myRaw).length >= 2;
  const mineAuto = !hasMyReal;
  const mine = analyzeAccount(parsePosts(hasMyReal ? myRaw : mySampleFromBrand(c)));
  const rows = comps.map(cp => ({ handle: cp.handle, archetype: !!cp.archetype, a: analyzeAccount(parsePosts(cp.raw)) }));
  const all = rows.map(r => r.a);
  const competitors = rows.map(r => {
    const topPatterns = Object.entries(r.a.patternFreq).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => k + ' (' + v + 'x)');
    const kelemahan = [];
    if (r.a.hookScore < 6) kelemahan.push('Hook lemah (skor ' + r.a.hookScore + '/10) — banyak post dibuka datar');
    if (r.a.ctaCoverage < 0.5) kelemahan.push('Sering lupa CTA (' + Math.round(r.a.ctaCoverage * 100) + '% post yang punya ajakan)');
    if (r.a.promoShare > 0.5) kelemahan.push('Kebanyakan jualan (' + Math.round(r.a.promoShare * 100) + '% promosi) — gampang bikin audiens jenuh');
    if (r.a.megaShare > 0.3) kelemahan.push('Bergantung pada mega-hashtag — jangkauannya nggak setarget kelihatannya');
    if (r.a.wall > 0.3) kelemahan.push('Caption tembok teks, melelahkan dibaca');
    if (!kelemahan.length) kelemahan.push('Eksekusinya rapi — lawan dengan sudut pandang & kejujuran, bukan format yang sama');
    const tiru = [];
    if (r.a.hookScore >= 7) tiru.push('Pola hook mereka works: ' + (topPatterns[0] || 'baris pertama langsung ke inti') + ' — adaptasi ke voice-mu, jangan salin kalimatnya');
    if (r.a.ctaCoverage >= 0.8) tiru.push('Disiplin CTA di hampir tiap post — kebiasaan yang layak dicontoh');
    if (r.a.varScore >= 7) tiru.push('Campuran kontennya sehat (' + Object.keys(r.a.pillars).join(', ') + ') — struktur mingguannya bisa diadaptasi');
    if (!tiru.length) tiru.push('Konsistensi posting-nya — sisanya justru peluangmu buat tampil lebih rapi');
    return { handle: r.handle, archetype: r.archetype, overall: r.a.overall, n: r.a.n, scores: r.a, hook_patterns: topPatterns.length ? topPatterns : ['(belum ada pola hook yang konsisten)'], tiru_adaptasi: tiru, kelemahan };
  });
  const gaps = GAP_PLAYS.filter(g => !all.some(a => a.posts.some(p => g.re.test(p.text))) && (!mine || !mine.posts.some(p => g.re.test(p.text))));
  const hook_bank = makeHooks(f, '', rng, 6).map(h => h.text + '  ·  (' + h.pattern + ')');
  const action_ideas = gaps.slice(0, 3).map(g => g.idea);
  competitors.forEach(cp => {
    const weak = cp.kelemahan[0];
    if (/hook lemah/i.test(weak)) action_ideas.push(`Serang di hook: ${cp.handle} buka post dengan datar — pastikan 3 detik pertamamu selalu pakai pola kuat (bank hook di bawah siap pakai).`);
    else if (/kebanyakan jualan/i.test(weak)) action_ideas.push(`${cp.handle} jualan terus — rebut audiensnya dengan konten memberi (tips & cerita) di topik yang sama.`);
  });
  while (action_ideas.length < 5 && gaps[action_ideas.length]) action_ideas.push(gaps[action_ideas.length].idea);
  return {
    type: 'compare', mine, mineAuto, competitors, autoDetected: !!autoDetected,
    realHandles: (realHandles || []).map(h => String(h).replace(/^@+/, '').trim().toLowerCase()).filter(h => /^[a-z0-9._]{2,30}$/.test(h)).filter((h, i, a) => a.indexOf(h) === i).slice(0, 4),
    gaps: gaps.map(g => g.label + ' — belum ada yang menggarap ini'), hook_bank, action_ideas: action_ideas.slice(0, 5),
    learning_note: autoDetected
      ? 'Ini analisis 3 POLA konten yang paling sering muncul di niche-mu (jualan terus, estetik, edukatif) — bukan akun asli, jadi nggak ada handle/preview palsu. Pola & celahnya nyata untuk niche ini. Buat preview feed asli, isi @handle kompetitor aslimu di kolom kompetitor. Prinsipnya: tiru polanya, jangan kalimatnya; menang di celah yang mereka tinggalkan.'
      : 'Perbandingan dihitung dari caption asli yang kamu tempel — pola hook, CTA, hashtag, dan campuran konten dideteksi otomatis. Prinsipnya: tiru polanya, jangan kalimatnya; lalu menang di celah yang mereka tinggalkan.',
  };
}

/* ═══════════════════════ AI ENHANCER (opsional, fallback ke lokal) ═══════════════════════
 * Kalau user isi kunci AI di ⚙️, hasil generator disempurnakan model.
 * Kalau kunci kosong / AI error / format tak sesuai → tetap pakai mesin lokal.
 */
// nama model per provider sesuai preferensi kualitas-vs-kecepatan
const SPEED_MODELS = {
  anthropic: { fast: 'claude-haiku-4-5-20251001', balanced: 'claude-sonnet-5', best: 'claude-opus-4-8' },
  openai:    { fast: 'gpt-4o-mini', balanced: 'gpt-4o', best: 'gpt-4o' },
};
const detectProvider = k => String(k).trim().startsWith('sk-ant-') ? 'anthropic' : 'openai'; // tebak provider dari prefix kunci
const aiKey = () => (store.get('ce3_key', '') || '').trim(); // kunci AI tersimpan
const aiSpeed = () => store.get('ce3_speed', 'balanced'); // preferensi kecepatan
const aiModelManual = () => (store.get('ce3_model', '') || '').trim(); // override model manual
const hasAI = () => !!aiKey(); // AI aktif kalau ada kunci
// tentukan model final: manual > pilihan otomatis per provider & kecepatan
function aiResolvedModel() {
  const key = aiKey(); if (!key) return '';
  const manual = aiModelManual(); if (manual) return manual;
  const p = detectProvider(key);
  return SPEED_MODELS[p][aiSpeed()] || SPEED_MODELS[p].balanced;
}
// panggil API Claude/OpenAI langsung dari browser, balikin teks mentah (throw kalau gagal)
async function callAI(system, user) {
  const key = aiKey();
  const provider = detectProvider(key);
  const model = aiResolvedModel();
  const isOA = provider === 'openai';
  const url = isOA ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages';
  const headers = isOA
    ? { 'content-type': 'application/json', authorization: 'Bearer ' + key }
    : { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  const body = isOA
    ? { model, max_tokens: 3200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }
    : { model, max_tokens: 3200, system, messages: [{ role: 'user', content: user }] };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((isOA ? 'OpenAI' : 'Anthropic') + ' ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = isOA
    ? (data.choices || []).map(c => c.message?.content || '').join('\n').trim()
    : (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) throw new Error('balasan AI kosong');
  return text;
}

// bersihkan input jadi @handle bersih: buang URL (ig/tiktok/yt), @, query, trailing slash, spasi
const cleanHandle = s => String(s || '').trim()
  .replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  .replace(/^(?:instagram|tiktok|youtube)\.com\//i, '')
  .replace(/[?#].*$/, '').replace(/^@+/, '').replace(/\/+$/, '').split('/')[0].trim();

/* ── BACKEND RISET (opsional): ambil data publik IG/TikTok via backend Laravel (root repo) ── */
const DEFAULT_RISET_API = 'http://localhost:4000'; // default backend Laravel (fitur "Ambil otomatis")
// URL backend: pakai yang disimpan user, kalau kosong fallback ke default localhost:4000.
// Jadi "Ambil otomatis" langsung jalan begitu server riset hidup — user nggak perlu set manual dulu.
const risetApi = () => ((store.get('ce3_risetapi', '') || '').trim() || DEFAULT_RISET_API).replace(/\/+$/, '');
const hasRisetApi = () => !!risetApi();
// tarik statistik kompetitor dari backend: GET /ig/:handle atau /tiktok/:handle
async function fetchCompetitorStats(handle, platform) {
  const base = risetApi();
  if (!base) throw new Error('Set dulu Backend Riset di ⚙️ (URL backend Laravel).');
  const h = String(handle || '').replace(/^@+/, '').trim();
  if (!h) throw new Error('Isi handle akunnya dulu.');
  const root = /\/api\/v\d/.test(base) ? base : base + '/api/v1'; // prefix backend = /api/v1
  const path = platform === 'tiktok' ? '/tiktok/' : platform === 'youtube' ? '/youtube/' : '/ig/';
  const platName = platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Instagram';
  let res;
  try {
    res = await fetch(root + path + encodeURIComponent(h));
  } catch (e) {
    throw new Error('Server riset belum jalan di ' + base + '. Jalankan backend Laravel: buka Terminal di folder project → ketik "php artisan serve --port=4000". Habis itu klik Ambil otomatis lagi. (' + String(e.message || e).slice(0, 40) + ')');
  }
  if (!res.ok) {
    let raw = ''; try { raw = await res.text(); } catch {}
    let msg = raw; try { const j = JSON.parse(raw); msg = j.message || j.error || raw; } catch {}
    msg = String(msg || '').slice(0, 160);
    // 502 = sumber eksternal (IG/TikTok/YT) yang nolak/gagal — bukan backend-mu mati
    if (res.status === 502) throw new Error((msg || platName + ' gagal dibaca') + ' — ini dari ' + platName + ' (sering kejadian: rate-limit/blok/akun privat). Coba lagi 1–2 menit, cek ejaan @handle, atau isi manual.');
    if (res.status === 404) throw new Error('Akun @' + h + ' nggak ketemu di ' + platName + '. Cek ejaan handle-nya.');
    throw new Error('Backend ' + res.status + ': ' + (msg || 'error tak dikenal'));
  }
  return res.json();
}

/* ── CROSS-POST: publish 1 konten ke IG + FB + TikTok sekaligus (via backend) ── */
// kredensial akun bisnis (disimpan di browser ini saja) — dikirim per-request ke backend user
const pubCreds = () => store.get('ce3_pubcreds', { metaToken: '', igUserId: '', fbPageId: '', tiktokToken: '' });
const savePubCreds = v => store.set('ce3_pubcreds', v);
// kirim cross-post ke backend → balikin { okCount, total, results[] }
async function crossPost(payload) {
  const base = risetApi();
  if (!base) throw new Error('Set dulu Backend Riset di ⚙️ (URL backend Laravel).');
  const root = /\/api\/v\d/.test(base) ? base : base + '/api/v1';
  const res = await fetch(root + '/publish/all', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Backend ' + res.status + ': ' + (await res.text().catch(() => '')).slice(0, 140));
  return res.json();
}
// ambil caption siap-posting dari 1 item riwayat (regen deterministik → caption + hashtag)
function captionFromHist(c, h) {
  try {
    const d = TYPES[h.type].gen(c, h.daily, h.seed);
    if (h.type === 'carousel') return sanitize((d.caption || '') + '\n\n' + (d.hashtags || []).join(' '), factsOf(c));
    if (h.type === 'caption') return sanitize((d.caption_long || d.caption_short || '') + '\n\n' + (d.hashtags || []).join(' '), factsOf(c));
    if (h.type === 'script') return sanitize((d.hooks && d.hooks[0] ? d.hooks[0].text + '\n\n' : '') + (d.cta || ''), factsOf(c));
    if (h.type === 'storyboard') return sanitize((d.concept || '') + '\n\n' + (d.production_notes || ''), factsOf(c));
    if (h.type === 'ideas') return sanitize((d.ideas && d.ideas[0] ? d.ideas[0].hook + '\n\n' + d.ideas[0].concept : ''), factsOf(c));
    return '';
  } catch (e) { return ''; }
}

/* ── GAMBAR AI (OpenAI Images) — pendekatan JSON: spec gambar → render jadi gambar ──
 * imgKey: kunci khusus gambar > kunci utama (kalau itu OpenAI). Hanya OpenAI yang punya image-gen.
 */
const imgKey = () => { const k = (store.get('ce3_imgkey', '') || '').trim(); if (k) return k; const main = aiKey(); return detectProvider(main) === 'openai' ? main : ''; };
const imgModel = () => (store.get('ce3_imgmodel', '') || 'gpt-image-1').trim(); // model gambar tersimpan
const hasImgAI = () => !!imgKey(); // gambar AI aktif kalau ada kunci OpenAI
// ukuran output per model & aspek (potret 4:5-an default utk feed IG)
const IMG_SIZES = {
  'gpt-image-1': { square: '1024x1024', portrait: '1024x1536', landscape: '1536x1024' },
  'dall-e-3':    { square: '1024x1024', portrait: '1024x1792', landscape: '1792x1024' },
};
function imgSizeFor(model, aspect) { return (IMG_SIZES[model] || IMG_SIZES['gpt-image-1'])[aspect || 'portrait'] || '1024x1024'; }
// ArrayBuffer → base64 (chunked, biar nggak overflow stack utk gambar besar)
function bufToB64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const CH = 32768;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}
// data URL → Blob (buat kirim gambar referensi ke endpoint /images/edits)
function dataUrlToBlob(dataUrl) {
  const c = String(dataUrl).indexOf(','); const head = dataUrl.slice(0, c), b64 = dataUrl.slice(c + 1);
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
// panggil OpenAI Images dari browser → balikin data URL PNG (throw kalau gagal).
// Kalau ada referenceImage (acuan brand) → pakai /images/edits (image-to-image).
async function openaiImage(prompt, opts) {
  const o = opts || {}; const key = o.key || imgKey(); const model = o.model || imgModel();
  const size = imgSizeFor(model, o.aspect); const base = 'https://api.openai.com/v1';
  let res;
  if (o.referenceImage) {
    const form = new FormData();
    form.append('model', model); form.append('prompt', prompt); form.append('size', size);
    form.append('image', dataUrlToBlob(o.referenceImage), 'ref.png');
    res = await fetch(base + '/images/edits', { method: 'POST', headers: { authorization: 'Bearer ' + key }, body: form });
  } else {
    res = await fetch(base + '/images/generations', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ model, prompt, size, n: 1 }) });
  }
  if (!res.ok) throw new Error('OpenAI Images ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const data = await res.json(); const first = (data.data || [])[0] || {};
  if (first.b64_json) return 'data:image/png;base64,' + first.b64_json;
  if (first.url) { const r2 = await fetch(first.url); return 'data:image/png;base64,' + bufToB64(await r2.arrayBuffer()); }
  throw new Error('gambar kosong dari API');
}
// Tahap 1: susun N KONSEP gambar (image_prompt Inggris + caption) — pakai AI teks kalau ada, else deterministik.
function buildImageConceptUser(c, type, d, daily, n) {
  const brief = imgBriefGet(c).trim();
  const focus = type === 'carousel'
    ? 'Carousel Instagram: ' + n + ' gambar slide nyambung (slide 1 = cover hook). Judul: "' + (d.title || '') + '". Inti tiap slide:\n' + (d.slides || []).slice(0, n).map(s => s.slide + '. ' + s.headline + ' — ' + (s.visual || s.subtext || '')).join('\n')
    : 'Topik: ' + ((daily && daily.topic) || d.title || d.concept || '') + '. Buat ' + n + ' gambar feed nyambung.';
  return [
    'Buat ' + n + ' KONSEP GAMBAR sosial media BERBEDA-BEDA (variasi angle/komposisi/mood), format potret 4:5 buat feed IG.',
    '=== PROFIL BRAND ===\n' + buildBrandLines(c) + '\n====================',
    brief ? 'ARAHAN GAMBAR dari user (WAJIB jadi acuan utama tiap gambar): ' + brief : '',
    focus,
    'Keluarkan HANYA JSON valid dalam pagar ```json (tanpa teks lain):',
    '{"images":[{"image_prompt":"<prompt detail BAHASA INGGRIS buat image generator: subjek utama, komposisi, art style, pencahayaan, palet warna sesuai brand, mood, latar; sebut teks singkat on-image bila relevan>","caption":"<caption Indonesia singkat>"}]} — total ' + n + ' item berbeda.',
    'Tiap image_prompt deskriptif & spesifik (bukan kalimat perintah), aman brand, tanpa merek/logo pihak ketiga.',
  ].filter(Boolean).join('\n\n');
}
// prompt gambar deterministik (fallback kalau AI teks tak aktif / gagal)
function deterministicImagePrompt(c, visual, i) {
  const f = factsOf(c); const p = paletteFor(c, i);
  const brief = imgBriefGet(c).trim();
  const moods = ['bright airy', 'warm cozy', 'clean minimal', 'bold vibrant', 'soft pastel', 'moody premium'];
  const compo = ['centered hero shot', 'flat lay top-down', 'lifestyle candid', 'close-up macro detail', 'rule-of-thirds', 'negative space'];
  const cat = catOf(c).label;
  return [
    'Professional social media photo for ' + f.name + ' (' + cat + ').',
    brief ? 'Art direction (follow this): ' + brief + '.' : '',
    'Subject: ' + (visual || f.product || cat) + '.',
    compo[i % compo.length] + ', ' + moods[i % moods.length] + ' mood.',
    'Color palette around ' + p.bg + ' and ' + p.ink + '. Soft natural lighting, high detail, editorial quality, 4:5 portrait.',
    'No third-party logos, no watermark, no gibberish text.',
  ].filter(Boolean).join(' ');
}
async function aiImageConcepts(c, type, d, daily, n) {
  if (hasAI()) {
    try {
      const raw = await callAI('Kamu art director senior. Balas HANYA satu blok JSON valid.', buildImageConceptUser(c, type, d, daily, n));
      const j = parseJSONBlock(raw);
      const list = Array.isArray(j && j.images) ? j.images : (Array.isArray(j) ? j : []);
      const out = list.map(o => ({ image_prompt: String((o && (o.image_prompt || o.prompt)) || '').trim(), caption: (o && o.caption) || '' })).filter(x => x.image_prompt);
      if (out.length) return out.slice(0, n);
    } catch (e) { /* jatuh ke deterministik */ }
  }
  const items = imageItemsFor(type, d, c);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const it = items[i] || items[items.length - 1] || {};
    const visual = (d.slides && d.slides[i] && d.slides[i].visual) || it.sub || it.headline || (daily && daily.topic) || '';
    arr.push({ image_prompt: deterministicImagePrompt(c, visual, i), caption: it.headline || '' });
  }
  return arr;
}
// rangkum profil brand jadi baris-baris "Key: value" buat prompt AI
function buildBrandLines(c) {
  const f = factsOf(c); const L = [];
  const add = (k, v) => { if (v && String(v).trim()) L.push(k + ': ' + String(v).trim()); };
  add('Nama', f.name); add('Kategori', catOf(c).label); add('Produk/jasa', c.products);
  add('Harga', c.price); add('Pembeda (USP)', c.usp); add('Bukti', c.proof);
  add('Pembeli utama', c.buyer); add('Masalah pembeli', c.painpoint); add('Impian pembeli', c.desire);
  add('Nada bicara', toneList(c).join(', ')); add('Sapaan', f.sapaan); add('Emoji', f.emojiPref);
  add('Frasa khas (WAJIB dipakai)', c.signature);
  add('Kata TERLARANG (HARAM dipakai)', [c.forbidden, c.forbiddenClaims].filter(Boolean).join(', '));
  add('Tujuan konten', c.goal); add('CTA utama', c.cta); add('Promo aktif', c.promo);
  add('Area/pasar', c.area); add('Sertifikasi', c.certifications);
  if (c.brandGuide && String(c.brandGuide).trim()) L.push('Panduan brand (kutipan dari PDF guideline): ' + String(c.brandGuide).slice(0, 1500));
  if (c.scriptRef && String(c.scriptRef).trim()) L.push('Referensi script COPYWRITING (tiru gaya, struktur, & diksi buat script/caption organik — bukan disalin mentah): ' + String(c.scriptRef).slice(0, 1500));
  if (c.scriptRefAds && String(c.scriptRefAds).trim()) L.push('Referensi script ADS (tiru pola hook, angle jualan, & CTA buat konten iklan Meta/TikTok — bukan disalin mentah): ' + String(c.scriptRefAds).slice(0, 1500));
  return L.join('\n');
}
// system prompt AI: peran + profil brand + playbook + aturan compliance per kategori
function buildAISystem(c) {
  const comply = c.category === 'skincare'
    ? 'COMPLIANCE SKINCARE (aturan BPOM): hanya klaim penampilan. DILARANG kata "menyembuhkan/mengobati/memutihkan/permanen/100%/nomor 1". Ganti dengan "membantu merawat/menyamarkan/mencerahkan tampilan", "kulit TAMPAK/TERASA lebih…".'
    : c.category === 'fnb' ? 'COMPLIANCE F&B: sebut channel order + harga jujur + status halal bila ada; tanpa klaim kesehatan/diet.'
    : 'COMPLIANCE UMUM: tanpa overclaim/superlatif kosong; jangan mengarang angka di luar profil brand.';
  return [
    'Kamu Content Strategist & Copywriter senior untuk agency konten di Indonesia. Bikin konten sosmed yang nempel banget sama karakter brand di bawah — kualitas tinggi, spesifik, tidak generik, dan aman aturan.',
    '', '=== PROFIL BRAND ===', buildBrandLines(c), '====================',
    '', 'PLAYBOOK: Hook kuat di 3 detik pertama (bukan salam). Struktur Hook→Build (value baru tiap 5–8 detik)→Payoff konkret→TEPAT 1 CTA. Caption: hook di 125 karakter pertama, baris pendek. Hashtag 3–5 mid-tier (hindari #fyp/#viral). Rasio konten 80% memberi / 20% jualan.',
    'ATURAN: Bahasa Indonesia sesuai nada brand; pakai sapaan brand; WAJIB pakai frasa khas bila ada; HARAM pakai kata terlarang brand; selalu sentuh pain point audiens; tutup dengan CTA brand.',
    '', comply,
    '', 'OUTPUT: kembalikan HANYA satu blok JSON valid (tanpa kalimat lain) dengan struktur field PERSIS seperti contoh yang diberikan user. Jangan mengubah nama field atau bentuknya. Isi tiap field kamu tulis ulang jadi versi terbaik & paling spesifik ke brand.',
  ].join('\n');
}
// user prompt AI: brief hari ini + contoh JSON lokal yang harus ditiru bentuknya
function buildAIUser(type, local, daily) {
  const map = { topic: 'Topik', goal: 'Tujuan', platform: 'Platform', durasi: 'Durasi' };
  const d = []; for (const k in map) if (daily[k]) d.push('- ' + map[k] + ': ' + daily[k]);
  return [
    'Buatkan ' + TYPES[type].label + '.',
    d.length ? 'Brief hari ini:\n' + d.join('\n') : 'Brief: ambil dari profil brand & promo aktif.',
    daily.notes ? '\nCATATAN KHUSUS dari user (WAJIB diikuti): ' + daily.notes : '',
    '', 'Kembalikan HANYA JSON dengan struktur PERSIS seperti contoh ini (ganti isinya dengan versi terbaikmu, jaga nama field & jumlah item mirip):',
    '```json', JSON.stringify(local), '```',
  ].join('\n');
}
// ambil & parse blok JSON dari balasan AI (toleran: fence ```json atau kurung {..})
function parseJSONBlock(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let raw = (m ? m[1] : text).trim();
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  try { return JSON.parse(raw); } catch (_) { return null; }
}
const AI_REQ = { script: ['hooks', 'scenes'], carousel: ['slides', 'caption'], caption: ['caption_long', 'hooks'], storyboard: ['shots'], ideas: ['ideas'] }; // field wajib per jenis
// cek bentuk JSON AI: field wajib ada & array tidak kosong
function aiShapeOK(type, o) {
  if (!o || typeof o !== 'object') return false;
  return (AI_REQ[type] || []).every(k => o[k] != null && (!Array.isArray(o[k]) || o[k].length));
}
// sanitize rekursif ke semua string di dalam objek/array hasil AI
function sanitizeDeep(o, f) {
  if (typeof o === 'string') return sanitize(o, f);
  if (Array.isArray(o)) return o.map(x => sanitizeDeep(x, f));
  if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = sanitizeDeep(o[k], f); return r; }
  return o;
}
const _pickArr = (a, fb) => Array.isArray(a) && a.length ? a : fb; // pakai array AI kalau berisi, kalau nggak fallback lokal
const _s = (v, d) => (v == null ? (d || '') : String(v)); // string aman (null → default)
// rapikan hashtag dari AI: slug + prefix # + unik + maks 6 (fallback lokal kalau kosong)
function _cleanTags(a, fb) {
  const arr = _pickArr(a, fb).map(t => '#' + slugTag(String(t).replace(/^#/, ''))).filter(t => t.length > 3);
  return arr.length ? [...new Set(arr)].slice(0, 6) : fb;
}
// paksa output AI ke bentuk PERSIS hasil lokal (isi diambil dari AI, struktur dijaga)
function normalizeAI(type, ai, local) {
  const out = { ...local };
  ['title', 'frame', 'concept', 'formula', 'sound_suggestion', 'learning_note', 'compliance_notes', 'cta', 'caption', 'caption_long', 'caption_short', 'production_notes'].forEach(k => { if (ai[k] != null && String(ai[k]).trim()) out[k] = String(ai[k]); });
  if (type === 'script') {
    out.hooks = _pickArr(ai.hooks, local.hooks).slice(0, 3).map((h, i) => ({ text: cap1(_s(h.text, local.hooks[i] && local.hooks[i].text)), pattern: _s(h.pattern, (local.hooks[i] && local.hooks[i].pattern) || 'Hook'), why: _s(h.why, local.hooks[i] && local.hooks[i].why) }));
    const sc = _pickArr(ai.scenes, local.scenes).map(s => ({ visual: _s(s.visual), voiceover: _s(s.voiceover), onscreen_text: _s(s.onscreen_text), duration_sec: Math.max(2, parseInt(s.duration_sec) || 4) }));
    out.scenes = scaleDur(sc, local.duration_sec).map((s, i) => ({ scene: i + 1, ...s }));
  } else if (type === 'carousel') {
    out.cover_alternatives = _pickArr(ai.cover_alternatives, local.cover_alternatives).slice(0, 2).map(String);
    out.slides = _pickArr(ai.slides, local.slides).map((s, i, arr) => ({ slide: i + 1, role: _s(s.role, i === 0 ? 'hook' : i === arr.length - 1 ? 'cta' : 'isi'), headline: _s(s.headline), subtext: _s(s.subtext), visual: _s(s.visual, 'Visual pendukung sesuai headline') }));
    out.hashtags = _cleanTags(ai.hashtags, local.hashtags);
  } else if (type === 'caption') {
    out.hooks = _pickArr(ai.hooks, local.hooks).slice(0, 5).map(h => typeof h === 'string' ? h : _s(h.text));
    out.hook_details = null;
    out.hashtags = _cleanTags(ai.hashtags, local.hashtags);
  } else if (type === 'storyboard') {
    const sh = _pickArr(ai.shots, local.shots).map(s => ({ visual: _s(s.visual), camera: _s(s.camera, 'Eye-level'), talent_props: _s(s.talent_props, '-'), voiceover: _s(s.voiceover), onscreen_text: _s(s.onscreen_text), sfx_music: _s(s.sfx_music, 'Musik'), duration_sec: Math.max(2, parseInt(s.duration_sec) || 4) }));
    out.shots = scaleDur(sh, local.duration_sec).map((s, i) => ({ shot: i + 1, ...s }));
    out.broll = _pickArr(ai.broll, local.broll).map(String);
  } else if (type === 'ideas') {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    out.ideas = _pickArr(ai.ideas, local.ideas).slice(0, 7).map((it, i) => ({ no: i + 1, day: _s(it.day, days[i]), pillar: _s(it.pillar, 'Edukasi'), format: _s(it.format, 'Reels'), hook: cap1(_s(it.hook)), concept: _s(it.concept), cta: _s(it.cta, 'Save dulu') }));
  }
  return out;
}
/** Hasilkan konten: lokal dulu, lalu sempurnakan dengan AI kalau kunci ada. */
async function produce(c, type, daily, seed) {
  const local = TYPES[type].gen(c, daily, seed);
  if (!hasAI()) return { data: local, viaAI: false };
  try {
    const raw = await callAI(buildAISystem(c), buildAIUser(type, local, daily));
    const parsed = parseJSONBlock(raw);
    if (!aiShapeOK(type, parsed)) throw new Error('format AI tidak sesuai');
    return { data: sanitizeDeep(normalizeAI(type, parsed, local), factsOf(c)), viaAI: true };
  } catch (e) {
    toast('AI: ' + String(e.message || e).slice(0, 40) + ' — pakai mesin lokal');
    return { data: local, viaAI: false };
  }
}

/* ═══════════════════════ GAMBAR MOCKUP & REFERENSI FOTO ═══════════════════════
 * Offline: "gambar" = grafik SVG bergaya brand (bisa diunduh PNG), "referensi foto"
 * = grid shot-list ala feed IG. Tanpa API gambar / tanpa jaringan.
 */
// palet warna poster bergaya brand (bg / teks / aksen)
const MOCK_PALETTES = [
  { bg: '#1C5B43', fg: '#FDFBF3', ac: '#F2B441' },
  { bg: '#E4572E', fg: '#FFF7F2', ac: '#1C5B43' },
  { bg: '#F6F0E3', fg: '#1C1712', ac: '#E4572E' },
  { bg: '#1C1712', fg: '#F6F0E3', ac: '#E4572E' },
  { bg: '#113D2C', fg: '#E1EEE6', ac: '#F2B441' },
  { bg: '#B44A1E', fg: '#FFF3E9', ac: '#F2B441' },
];
const xmlEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m])); // escape karakter buat SVG/XML
// bungkus teks jadi baris-baris (maks N karakter per baris)
function wrapText(str, max) {
  const words = String(str || '').split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur.trim()); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur.trim());
  return lines;
}
// pilih palet ber-seed brand, lalu digilir per index gambar
function paletteFor(c, i) { const base = Math.floor(mulberry(c.id + '|pal')() * MOCK_PALETTES.length); return MOCK_PALETTES[(base + i) % MOCK_PALETTES.length]; }
// Poster 4:5 (1080x1350) bergaya brand
function mockupSVG(pal, kicker, headline, sub, handle) {
  const H = wrapText(headline, 17).slice(0, 5);
  const S = wrapText(sub || '', 42).slice(0, 3);
  const hStart = 470 - (H.length - 1) * 46;
  const sStart = hStart + H.length * 92 + 6;
  const hLines = H.map((l, i) => `<text x="70" y="${hStart + i * 92}" fill="${pal.fg}" font-family="Georgia,serif" font-size="82" font-weight="700">${xmlEsc(l)}</text>`).join('');
  const sLines = S.map((l, i) => `<text x="72" y="${sStart + i * 46}" fill="${pal.fg}" font-family="Arial" font-size="34" opacity="0.85">${xmlEsc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${pal.bg}"/><rect x="70" y="90" width="130" height="12" rx="6" fill="${pal.ac}"/><text x="70" y="180" fill="${pal.ac}" font-family="Arial" font-weight="700" font-size="30" letter-spacing="4">${xmlEsc(String(kicker).toUpperCase())}</text>${hLines}${sLines}<text x="70" y="1285" fill="${pal.fg}" font-family="Arial" font-size="30" opacity="0.7">@${xmlEsc(handle)}</text></svg>`;
}
// variasi komposisi & mood untuk referensi foto
const COMPO = ['close-up makro', 'flat lay dari atas', 'rule of thirds', 'framing simetris', 'banyak ruang kosong (negative space)', 'low angle dramatis', 'cahaya golden hour', 'candid natural'];
const MOODS = ['hangat & cozy', 'bersih & minimal', 'ceria & colorful', 'moody & elegan', 'segar & natural', 'bold & kontras'];
// kartu SVG 1 referensi foto (gradien palet + nomor + label + mood)
function photoTileSVG(pal, n, label, mood) {
  const L = wrapText(label, 20).slice(0, 3);
  const lines = L.map((l, i) => `<text x="34" y="${360 + i * 40}" fill="${pal.fg}" font-family="Arial" font-size="30" font-weight="600">${xmlEsc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.bg}"/><stop offset="1" stop-color="${pal.ac}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g${n})"/><text x="34" y="90" fill="${pal.fg}" font-family="Georgia,serif" font-size="72" font-weight="700" opacity="0.9">${n}</text><rect x="34" y="120" width="70" height="7" rx="3" fill="${pal.fg}" opacity="0.7"/>${lines}<text x="34" y="560" fill="${pal.fg}" font-family="Arial" font-size="24" opacity="0.75">📸 ${xmlEsc(mood)}</text></svg>`;
}
const svgDataURI = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); // SVG jadi data URI (buat src img)
// Unduh SVG sebagai PNG (via canvas); fallback ke .svg kalau gagal
function downloadImage(svg, name, w, h) {
  const url = svgDataURI(svg);
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(b => {
        if (!b) throw new Error('no blob');
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Gambar diunduh ✓');
      }, 'image/png');
    } catch (e) { const a = document.createElement('a'); a.href = url; a.download = name + '.svg'; a.click(); toast('Diunduh (SVG) ✓'); }
  };
  img.onerror = () => { const a = document.createElement('a'); a.href = url; a.download = name + '.svg'; a.click(); toast('Diunduh (SVG) ✓'); };
  img.src = url;
}

// Kumpulkan "kartu gambar" dari hasil generate (min 3)
function imageItemsFor(type, d, c) {
  const handle = slugTag(c.name);
  if (type === 'carousel') return d.slides.map(s => ({ kicker: 'Slide ' + s.slide, headline: s.headline, sub: s.subtext, handle }));
  if (type === 'caption') {
    const base = [{ kicker: 'Cover', headline: (d.hooks && d.hooks[0]) || d.caption_short, sub: '', handle }];
    (d.hooks || []).slice(1, 4).forEach((h, i) => base.push({ kicker: 'Alt ' + (i + 1), headline: h, sub: '', handle }));
    return base;
  }
  if (type === 'script') return (d.hooks || []).map((h, i) => ({ kicker: 'Cover ' + (i + 1), headline: h.text, sub: h.pattern, handle }));
  if (type === 'storyboard') return (d.shots || []).slice(0, 4).map((s, i) => ({ kicker: 'Frame ' + (i + 1), headline: s.onscreen_text || s.visual, sub: s.visual, handle }));
  return [];
}
// blok "gambar siap-pakai": grid mockup poster + tombol unduh (min N gambar)
function renderMockups(type, d, c, minN) {
  let items = imageItemsFor(type, d, c).filter(x => x.headline && String(x.headline).trim());
  if (!items.length) return null;
  // pastikan minimal N gambar
  const handle = slugTag(c.name);
  while (items.length < (minN || 3)) items.push({ kicker: 'Bonus', headline: d.title || d.concept || c.name, sub: c.usp || '', handle });
  const wrap = el('div');
  wrap.append(el('div', { class: 'asset-head' }, [
    el('b', { textContent: '🖼️ Gambar siap-pakai (' + items.length + ')' }),
    el('button', { textContent: '⬇️ Unduh semua', class: 'dl', style: 'padding:7px 14px;', onclick: () => { items.forEach((it, i) => setTimeout(() => downloadImage(mockupSVG(paletteFor(c, i), it.kicker, it.headline, it.sub, it.handle), slugTag(c.name) + '-' + type + '-' + (i + 1), 1080, 1350), i * 250)); } }),
  ]));
  const grid = el('div', { class: 'mockups' });
  items.forEach((it, i) => {
    const svg = mockupSVG(paletteFor(c, i), it.kicker, it.headline, it.sub, it.handle);
    grid.append(el('div', { class: 'mockup' }, [
      el('img', { src: svgDataURI(svg), alt: it.headline, loading: 'lazy' }),
      el('div', { class: 'cap' }, [
        el('span', { textContent: it.kicker }),
        el('button', { class: 'dl', textContent: '⬇️ PNG', onclick: () => downloadImage(svg, slugTag(c.name) + '-' + type + '-' + (i + 1), 1080, 1350) }),
      ]),
    ]));
  });
  wrap.append(grid);
  wrap.append(el('div', { class: 'tiny', style: 'margin-top:6px;', textContent: 'Grafik dasar bergaya brand — pas buat quote/tips card. Bisa langsung dipost atau dipoles di Canva.' }));
  return wrap;
}
// blok 8 referensi foto (moodboard shot-list ala feed IG) + daftar yang bisa disalin
function renderPhotoRefs(c, topic, n) {
  n = n || 8;
  const f = factsOf(c); const rng = mulberry(c.id + '|photoref|' + (topic || ''));
  const visuals = f.bank.visuals;
  const wrap = el('div');
  wrap.append(el('div', { class: 'asset-head' }, [el('b', { textContent: '📸 ' + n + ' referensi foto buat feed IG-mu' })]));
  wrap.append(el('div', { class: 'tiny', style: 'margin:-2px 0 8px;', textContent: 'Moodboard shot-list: 8 angle foto yang saling nyambung buat grid feed rapi. Pakai sebagai panduan motret / brief fotografer.' }));
  const grid = el('div', { class: 'feedgrid' });
  const refs = [];
  for (let i = 0; i < n; i++) {
    const v = visuals[i % visuals.length];
    const label = cap1(v) + ' · ' + COMPO[i % COMPO.length];
    const mood = pick(rng, MOODS);
    refs.push({ label, mood });
    const svg = photoTileSVG(paletteFor(c, i), i + 1, label, mood);
    grid.append(el('div', { class: 'feedcell' }, el('img', { src: svgDataURI(svg), alt: label, title: label + ' — ' + mood, loading: 'lazy' })));
  }
  wrap.append(grid);
  // daftar teks biar bisa disalin
  const list = el('ul', { class: 'clean num', style: 'margin-top:10px;' });
  refs.forEach(r => list.append(el('li', { textContent: r.label + ' — nuansa ' + r.mood })));
  const det = el('details', { class: 'adv' }, [el('summary', { textContent: '📋 Lihat & salin daftar 8 referensi' }), list,
    el('button', { textContent: '📋 Salin daftar', style: 'margin-top:8px;', onclick: () => copyText(refs.map((r, i) => (i + 1) + '. ' + r.label + ' — nuansa ' + r.mood).join('\n'), '8 referensi foto') })]);
  wrap.append(det);
  return wrap;
}
// jalankan worker atas banyak item dengan batas konkurensi (biar nggak kena rate-limit)
function runPool(items, worker, conc) {
  conc = conc || 2; let idx = 0;
  const runners = Array.from({ length: Math.min(conc, items.length || 1) }, async () => {
    while (idx < items.length) { const i = idx++; await worker(items[i], i); }
  });
  return Promise.all(runners);
}
// unduh data URL (PNG) sebagai file
function downloadDataUrl(url, name) {
  const a = el('a', { href: url, download: (name || 'gambar') + '.png' });
  document.body.append(a); a.click(); a.remove();
}
// Panel GAMBAR AI: tombol generate → konsep JSON → OpenAI Images → grid gambar asli (unduh PNG + caption).
// Panel GAMBAR AI (khusus carousel): otomatis generate dari JSON → OpenAI Images → grid gambar.
function aiImagePanel(type, d, c, daily, n, opts) {
  n = Math.max(1, Math.min(n || 4, 8));
  const auto = !!(opts && opts.auto);
  const wrap = el('div', { class: 'aiimg' });
  const genBtn = el('button', { class: 'primary', style: 'padding:8px 16px;', textContent: '🎨 Bikin ' + n + ' gambar' });
  wrap.append(el('div', { class: 'asset-head' }, [el('b', { textContent: '✨ Gambar AI (' + imgModel() + ')' }), genBtn]));
  wrap.append(el('div', { class: 'tiny', style: 'margin:2px 0 10px;', textContent: 'Gambar asli dari OpenAI Images — otomatis disusun dari spec JSON carousel-mu, lalu dirender. Referensi visual + arahan gambar brand jadi acuan.' }));
  const grid = el('div', { class: 'mockups' });
  wrap.append(grid);
  let running = false;
  const run = async () => {
    if (running) return; running = true;
    genBtn.disabled = true; genBtn.textContent = '⏳ nyusun konsep…'; grid.innerHTML = '';
    let concepts;
    try { concepts = await aiImageConcepts(c, type, d, daily, n); }
    catch (e) { toast('Gagal nyusun konsep gambar ✗', 'err'); genBtn.disabled = false; genBtn.textContent = '🎨 Coba lagi'; running = false; return; }
    const ref = (getRefs(c)[0] || {}).data; // acuan brand (image-to-image via /edits)
    const tiles = concepts.map((_, i) => { const t = el('div', { class: 'mockup' }, [el('div', { class: 'aiimg-load', textContent: '⏳ gambar ' + (i + 1) + '…' })]); grid.append(t); return t; });
    let done = 0, ok = 0; genBtn.textContent = '🎨 render 0/' + concepts.length + '…';
    await runPool(concepts, async (cp, i) => {
      try {
        const url = await openaiImage(cp.image_prompt, { aspect: 'portrait', referenceImage: ref });
        tiles[i].innerHTML = '';
        tiles[i].append(
          el('img', { src: url, alt: cp.caption || ('gambar ' + (i + 1)), loading: 'lazy' }),
          el('div', { class: 'cap' }, [el('span', { textContent: 'Slide ' + (i + 1) }), el('button', { class: 'dl', textContent: '⬇️ PNG', onclick: () => downloadDataUrl(url, slugTag(c.name) + '-ai-' + (i + 1)) })]),
        );
        if (cp.caption) tiles[i].append(el('div', { class: 'tiny', style: 'padding:2px 6px 6px;', textContent: sanitize(cp.caption, factsOf(c)) }));
        ok++;
      } catch (e) { tiles[i].innerHTML = ''; tiles[i].append(el('div', { class: 'aiimg-err', textContent: '❌ ' + String(e.message || e).slice(0, 90) })); }
      done++; genBtn.textContent = '🎨 render ' + done + '/' + concepts.length + '…';
    }, 2);
    genBtn.disabled = false; genBtn.textContent = '🔁 Bikin ulang'; running = false;
    toast(ok ? (ok + ' gambar AI jadi ✨') : 'Gambar AI gagal ✗', ok ? 'ok' : 'err');
  };
  genBtn.onclick = run;
  if (auto) setTimeout(run, 60); // otomatis jalan begitu carousel muncul
  return wrap;
}
// Blok tambahan untuk hasil IG NON-carousel: mockup dasar + (IG Feed) referensi foto. Gambar AI = khusus carousel.
function igExtras(type, d, c, daily) {
  if (type === 'carousel') return null; // carousel handle sendiri (gambar AI)
  const platform = (daily && daily.platform) || '';
  if (!/^IG /.test(platform)) return null;
  const box = el('div');
  const m = renderMockups(type, d, c, 3);
  if (m) { box.append(el('div', { class: 'divider' })); box.append(m); }
  if (platform === 'IG Feed') box.append(renderPhotoRefs(c, daily && daily.topic, 8));
  return box.children.length ? box : null;
}

/* ═══════════════════════ EXPORT PDF-TEKS (in-browser, tanpa library) ═══════════════════════
 * Merender hasil generate (teks) jadi dokumen PDF A4 rapi pakai font inti Helvetica.
 * Dipakai untuk semua jenis kecuali carousel (carousel diekspor sebagai gambar slide).
 */
const pdfEsc = s => String(s).replace(/([\\()])/g, '\\$1'); // escape \ ( ) untuk string literal PDF
// buang karakter di luar Latin-1 (font inti PDF Helvetica cuma dukung ini)
// map karakter tipografi umum (en/em dash, kutip lengkung, bullet, …) ke ASCII sebelum buang non-Latin1
const LATIN1_MAP = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '•': '-', '…': '...', ' ': ' ', '−': '-', '→': '->' };
function toLatin1(s) { let o = ''; for (const ch of String(s == null ? '' : s)) { const m = LATIN1_MAP[ch]; if (m !== undefined) { o += m; continue; } const c = ch.codePointAt(0); if (c === 9 || c === 10 || (c >= 32 && c <= 255)) o += (c <= 255 ? ch : ''); } return o; }
// rakit byte PDF A4 dari teks mentah: styling+word-wrap → paginate → rakit objek PDF manual
function buildDocPDF(title, body) {
  const PW = 595.28, PH = 841.89, M = 50, SIZE = 10.5, TSIZE = 19, LEAD = 14.5, maxW = PW - 2 * M; // ukuran A4 (pt), margin, font
  const wrapCount = sz => Math.max(8, Math.floor(maxW / (sz * 0.505)));
  const src = (String(title) + '\nTITLEBREAK\n' + String(body)).split('\n');
  // 1) styling + word-wrap tiap baris
  const flow = [];
  src.forEach((raw, idx) => {
    const clean = toLatin1(raw).replace(/\s+$/, '');
    if (clean === 'TITLEBREAK') { flow.push({ t: '', size: SIZE, bold: false, gap: 6 }); return; }
    const isTitle = idx === 0;
    const trimmed = clean.trim();
    const isHead = !isTitle && trimmed.length > 0 && trimmed.length < 46 && (/:\s*$/.test(trimmed) || /^[A-Z0-9][A-Z0-9 \/&.\-]{2,}$/.test(trimmed));
    const size = isTitle ? TSIZE : SIZE;
    const bold = isTitle || isHead;
    if (trimmed === '') { flow.push({ t: '', size, bold, gap: 7 }); return; }
    wrapText(clean, wrapCount(size)).forEach(w => flow.push({ t: w, size, bold, gap: 0 }));
  });
  // 2) paginate → halaman berisi baris ber-koordinat
  const pages = [[]]; let y = PH - M;
  flow.forEach(it => {
    const lead = (it.size > SIZE ? it.size + 8 : LEAD) + (it.gap || 0);
    if (y - lead < M) { pages.push([]); y = PH - M; }
    pages[pages.length - 1].push({ t: it.t, size: it.size, bold: it.bold, y: y - it.size });
    y -= lead;
  });
  // 3) rakit objek PDF (2 font inti + tiap halaman: page + content)
  const parts = []; const offsets = {}; let cursor = 0;
  const push = b => { const buf = typeof b === 'string' ? b : b; parts.push(buf); cursor += buf.length; };
  const startObj = id => { offsets[id] = cursor; push(id + ' 0 obj\n'); };
  const endObj = () => push('endobj\n');
  push('%PDF-1.4\n');
  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj();
  const pageObjId = i => 5 + i * 2;
  const kids = pages.map((_, i) => `${pageObjId(i)} 0 R`).join(' ');
  startObj(2); push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`); endObj();
  startObj(3); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n'); endObj();
  startObj(4); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n'); endObj();
  pages.forEach((lines, i) => {
    const pid = pageObjId(i), cid = pid + 1;
    let cs = '';
    lines.forEach(l => { if (l.t === '') return; cs += `BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf ${M} ${l.y.toFixed(1)} Td (${pdfEsc(l.t)}) Tj ET\n`; });
    startObj(pid); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>\n`); endObj();
    startObj(cid); push(`<< /Length ${cs.length} >>\nstream\n`); push(cs); push('endstream\n'); endObj();
  });
  // 4) tabel xref (offset byte tiap objek) + trailer, wajib buat PDF valid
  const xrefStart = cursor;
  const maxId = 4 + pages.length * 2;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) xref += String(offsets[id] || 0).padStart(10, '0') + ' 00000 n \n';
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  const str = parts.join('');
  const bytes = new Uint8Array(str.length); // string → byte (1 char = 1 byte)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}
// unduh hasil generate sebagai file PDF
function downloadDocPDF(name, title, body) {
  try {
    const blob = new Blob([buildDocPDF(title, body)], { type: 'application/pdf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('PDF diunduh ✓');
  } catch (e) { toast('Gagal bikin PDF: ' + String(e.message || e).slice(0, 40)); }
}

/* ── PDF TABEL (A4 landscape) — dipakai buat storyboard: shot list rapi berkolom ── */
// columns: [{label,w}] (w = bobot relatif), rows: array of array string, extraLines: paragraf di bawah tabel
function buildTablePDF(title, columns, rows, extraLines) {
  const PW = 595.28, PH = 841.89, M = 34, SIZE = 7.6, TSIZE = 15, PAD = 3.5, LH = 9.4; // A4 potrait
  const usable = PW - 2 * M;
  const wsum = columns.reduce((a, c) => a + c.w, 0);
  const cols = columns.map(c => ({ label: c.label, w: c.w / wsum * usable }));
  const colX = []; { let x = M; for (const c of cols) { colX.push(x); x += c.w; } }
  const esc = pdfEsc, lat = s => toLatin1(String(s == null ? '' : s));
  const cellLines = (txt, w) => wrapText(lat(txt), Math.max(4, Math.floor((w - 2 * PAD) / (SIZE * 0.5)))).slice(0, 8);
  const pages = []; let cs = '', y = 0;
  // gambar satu baris (header/data) dari sudut atas `top`, balikin y bawah baris
  function rowOps(cells, top, o) {
    const linesPer = cells.map((t, i) => cellLines(t, cols[i].w));
    const maxL = Math.max(1, ...linesPer.map(a => a.length));
    const h = maxL * LH + 2 * PAD, bottom = top - h;
    if (o && o.fill) cs += `0.95 0.92 0.84 rg ${M.toFixed(1)} ${bottom.toFixed(1)} ${usable.toFixed(1)} ${h.toFixed(1)} re f\n`;
    cs += `0.8 0.79 0.73 RG 0.6 w\n${M.toFixed(1)} ${bottom.toFixed(1)} ${usable.toFixed(1)} ${h.toFixed(1)} re S\n`;
    for (let i = 1; i < cols.length; i++) cs += `${colX[i].toFixed(1)} ${bottom.toFixed(1)} m ${colX[i].toFixed(1)} ${top.toFixed(1)} l S\n`;
    cs += `0.12 0.11 0.09 rg\n`; // warna teks gelap (reset dari fill header)
    const font = o && o.bold ? 'F2' : 'F1';
    linesPer.forEach((lines, i) => lines.forEach((ln, j) => { cs += `BT /${font} ${SIZE} Tf ${(colX[i] + PAD).toFixed(1)} ${(top - PAD - SIZE - j * LH).toFixed(1)} Td (${esc(ln)}) Tj ET\n`; }));
    return bottom;
  }
  const drawHeader = () => { y = rowOps(columns.map(c => c.label), y, { bold: true, fill: true }); };
  const newPage = withTitle => {
    if (cs) pages.push(cs);
    cs = ''; y = PH - M;
    if (withTitle) { // judul bisa panjang → wrap biar nggak kepotong di tepi kanan
      cs += `0.12 0.11 0.09 rg\n`;
      wrapText(lat(title), Math.floor(usable / (TSIZE * 0.53))).forEach(tl => { cs += `BT /F2 ${TSIZE} Tf ${M} ${(y - TSIZE).toFixed(1)} Td (${esc(tl)}) Tj ET\n`; y -= TSIZE + 3; });
      y -= 9;
    }
    drawHeader();
  };
  newPage(true);
  rows.forEach(r => {
    const maxL = Math.max(1, ...r.map((t, i) => cellLines(t, cols[i].w).length));
    if (y - (maxL * LH + 2 * PAD) < M) newPage(false);
    y = rowOps(r, y, {});
  });
  (extraLines || []).forEach(line => {
    if (y - LH - 4 < M) newPage(false);
    y -= 8;
    wrapText(lat(line), Math.floor(usable / (SIZE * 0.5))).forEach(w => { if (y - LH < M) newPage(false); cs += `0.12 0.11 0.09 rg BT /F1 ${SIZE} Tf ${M} ${(y - SIZE).toFixed(1)} Td (${esc(w)}) Tj ET\n`; y -= LH; });
  });
  pages.push(cs);
  // rakit objek PDF (2 font + tiap halaman landscape)
  const parts = []; const offsets = {}; let cursor = 0;
  const push = b => { parts.push(b); cursor += b.length; };
  const startObj = id => { offsets[id] = cursor; push(id + ' 0 obj\n'); };
  const endObj = () => push('endobj\n');
  push('%PDF-1.4\n');
  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj();
  const pageObjId = i => 5 + i * 2;
  startObj(2); push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObjId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>\n`); endObj();
  startObj(3); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n'); endObj();
  startObj(4); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n'); endObj();
  pages.forEach((stream, i) => {
    const pid = pageObjId(i), cid = pid + 1;
    startObj(pid); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>\n`); endObj();
    startObj(cid); push(`<< /Length ${stream.length} >>\nstream\n`); push(stream); push('endstream\n'); endObj();
  });
  const xrefStart = cursor, maxId = 4 + pages.length * 2;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) xref += String(offsets[id] || 0).padStart(10, '0') + ' 00000 n \n';
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  const str = parts.join(''); const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}
// storyboard → PDF tabel (kolom shot list) + b-roll & catatan di bawah
function downloadStoryboardPDF(name, title, d) {
  try {
    const columns = [
      { label: '#', w: 22 }, { label: 'Durasi', w: 40 }, { label: 'Visual', w: 150 }, { label: 'Kamera', w: 78 },
      { label: 'Talent / Props', w: 104 }, { label: 'Voiceover', w: 135 }, { label: 'Teks layar', w: 112 }, { label: 'Musik / SFX', w: 88 },
    ];
    const rows = (d.shots || []).map(s => [String(s.shot), s.duration_sec + 's', s.visual, s.camera, s.talent_props, s.voiceover, s.onscreen_text, s.sfx_music]);
    const extra = ['B-ROLL: ' + ((d.broll || []).join(' · ') || '-'), 'CATATAN PRODUKSI: ' + (d.production_notes || '-')];
    const blob = new Blob([buildTablePDF(title, columns, rows, extra)], { type: 'application/pdf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('PDF tabel diunduh ✓');
  } catch (e) { toast('Gagal bikin PDF: ' + String(e.message || e).slice(0, 40)); }
}
// ide seminggu → PDF tabel (satu baris per hari) + catatan rasio di bawah
function downloadIdeasPDF(name, title, d) {
  try {
    const columns = [
      { label: '#', w: 20 }, { label: 'Hari', w: 54 }, { label: 'Pilar', w: 80 }, { label: 'Format', w: 58 },
      { label: 'Hook', w: 150 }, { label: 'Konsep', w: 235 }, { label: 'CTA', w: 100 },
    ];
    const rows = (d.ideas || []).map(i => [String(i.no), i.day, i.pillar, i.format, i.hook, i.concept, i.cta]);
    const extra = ['CATATAN: ' + (d.learning_note || '-')];
    const blob = new Blob([buildTablePDF(title, columns, rows, extra)], { type: 'application/pdf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('PDF tabel diunduh ✓');
  } catch (e) { toast('Gagal bikin PDF: ' + String(e.message || e).slice(0, 40)); }
}

/* ═══════════════════════ PDF BRAND GUIDELINE (offline) ═══════════════════════ */
// coba inflate stream PDF terkompresi (deflate / deflate-raw); null kalau gagal/tak didukung
async function inflateMaybe(bytes) {
  for (const fmt of ['deflate', 'deflate-raw']) {
    try {
      if (typeof DecompressionStream === 'undefined') return null;
      const ds = new DecompressionStream(fmt);
      const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      return new Uint8Array(buf);
    } catch (_) { /* coba format lain */ }
  }
  return null;
}
// tarik teks dari isi (...) operator Tj di stream PDF (decode escape oktal & khusus)
function pdfTextFromStream(latin1) {
  const out = [];
  const re = /\(((?:\\[\s\S]|[^()\\])*)\)/g; let m;
  while ((m = re.exec(latin1))) {
    const t = m[1].replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8) & 0xff)).replace(/\\([()\\nrt])/g, (_, ch) => ({ n: '\n', r: '', t: ' ' }[ch] != null ? ({ n: '\n', r: '', t: ' ' }[ch]) : ch));
    if (t && /[a-zA-Z]/.test(t)) out.push(t);
  }
  return out.join(' ');
}
// ekstrak teks brand guideline dari PDF (teks langsung + stream yang di-inflate), maks 6000 char
async function extractPdfText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const CH = 32768; let latin1 = '';
  for (let i = 0; i < bytes.length; i += CH) latin1 += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  let text = pdfTextFromStream(latin1);
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g; let m; const parts = [];
  while ((m = re.exec(latin1)) && parts.length < 60) {
    const raw = m[1]; const b = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i) & 0xff;
    const inf = await inflateMaybe(b);
    if (inf) { let s = ''; for (let i = 0; i < inf.length; i += CH) s += String.fromCharCode.apply(null, inf.subarray(i, i + CH)); parts.push(pdfTextFromStream(s)); }
  }
  text = (text + ' ' + parts.join(' ')).replace(/\s+/g, ' ').trim();
  return text.slice(0, 6000);
}
// ekstrak teks dari DOCX (ZIP → word/document.xml di-inflate deflate-raw → buang tag XML), maks 6000 char
async function extractDocxText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const dv = new DataView(arrayBuffer);
  // cari End of Central Directory (sig 0x06054b50), scan dari belakang
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65558; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('bukan DOCX valid');
  let off = dv.getUint32(eocd + 16, true);      // offset central directory
  const count = dv.getUint16(eocd + 10, true);  // jumlah entri
  let target = null;
  for (let n = 0; n < count && off + 46 <= bytes.length; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const fnLen = dv.getUint16(off + 28, true);
    const exLen = dv.getUint16(off + 30, true);
    const cmLen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    let name = ''; for (let i = 0; i < fnLen; i++) name += String.fromCharCode(bytes[off + 46 + i]);
    if (name === 'word/document.xml') { target = { method, csize, lho }; break; }
    off += 46 + fnLen + exLen + cmLen;
  }
  if (!target) throw new Error('document.xml tak ditemukan');
  // ke local file header → lompat ke data
  const lho = target.lho;
  if (dv.getUint32(lho, true) !== 0x04034b50) throw new Error('header ZIP rusak');
  const lfn = dv.getUint16(lho + 26, true), lex = dv.getUint16(lho + 28, true);
  const dataStart = lho + 30 + lfn + lex;
  const raw = bytes.subarray(dataStart, dataStart + target.csize);
  const inf = target.method === 0 ? raw : await inflateMaybe(raw); // 0 = stored, 8 = deflate-raw
  if (!inf) throw new Error('gagal inflate');
  const CH = 32768; let xml = '';
  for (let i = 0; i < inf.length; i += CH) xml += String.fromCharCode.apply(null, inf.subarray(i, i + CH));
  try { xml = decodeURIComponent(escape(xml)); } catch (_) { /* biarkan latin1 kalau bukan UTF-8 valid */ } // isi DOCX UTF-8
  const text = xml
    .replace(/<\/w:p>/g, '\n').replace(/<w:tab[^>]*>/g, '\t').replace(/<w:br[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')                                  // buang semua tag
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text.slice(0, 6000);
}
// dispatcher: baca teks dari file PDF atau DOCX
async function extractDocText(file) {
  const buf = await file.arrayBuffer();
  if (/\.docx$/i.test(file.name) || /officedocument\.wordprocessing/i.test(file.type)) return extractDocxText(buf);
  return extractPdfText(buf);
}

/* Uploader brand guideline PDF — dipakai di tab Profil (upload/ganti/hapus langsung, tanpa wizard) */
/* ── Picker file bergaya (bukan input bawaan browser) ──
 * opts: { accept, icon, title, hint, onPick(file, ui) }  → return elemen .filedrop
 * onPick boleh async; pakai ui.setStatus(text)/ui.setDone(bool)/ui.setTitle(text) buat feedback.
 */
function fileDropUI(opts) {
  const o = opts || {};
  const drop = el('button', { class: 'filedrop', type: 'button' });
  const icon = el('span', { class: 'fi', textContent: o.icon || '📄' });
  const txt = el('div', { class: 'ft' });
  const tt = el('b', { textContent: o.title || 'Pilih file…' });
  const sub = el('span', { textContent: o.hint || 'klik atau seret file ke sini' });
  txt.append(tt, sub);
  const btn = el('span', { class: 'fbtn', textContent: o.btn || 'Pilih' });
  drop.append(icon, txt, btn);
  const inp = el('input', { type: 'file', accept: o.accept || '', style: 'display:none;' });
  if (o.multiple) inp.multiple = true;
  const ui = {
    setStatus: t => { sub.textContent = t; },
    setTitle: t => { tt.textContent = t; },
    setDone: b => { drop.classList.toggle('done', !!b); btn.textContent = b ? 'Ganti' : (o.btn || 'Pilih'); },
    setIcon: t => { icon.textContent = t; },
  };
  const handle = list => {
    if (!list || !o.onPick) return;
    const arr = Array.prototype.slice.call(list).filter(Boolean);
    if (!arr.length) return;
    o.onPick(o.multiple ? arr : arr[0], ui);
  };
  drop.onclick = () => inp.click();
  inp.onchange = () => { handle(inp.files); inp.value = ''; };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag'); };
  drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag'); handle(e.dataTransfer.files); };
  drop.append(inp);
  if (o.done) ui.setDone(true);
  return { node: drop, ui };
}

/* ── Referensi gambar user (disimpan per-brand, di-downscale biar muat localStorage) ── */
// getter/setter generik: satu keluarga penyimpanan gambar dipakai beberapa tempat (Bikin, Riset).
function imgGet(c, key) { const v = store.get(key + c.id, []); return Array.isArray(v) ? v : []; } // baca daftar gambar utk key tsb
function imgSet(c, key, arr, max) { try { localStorage.setItem(key + c.id, JSON.stringify(arr.slice(0, max || 8))); return true; } catch (e) { return false; } } // simpan; false kalau kuota penuh
// wrapper referensi visual "Bikin Konten" (dipakai userRefStrip & validasi generate)
function getRefs(c) { return imgGet(c, 'ce3_refs_'); }
function setRefs(c, arr) { return imgSet(c, 'ce3_refs_', arr, 8); }
// Baca file gambar → dataURL JPEG kecil (maks 640px sisi panjang) biar hemat storage.
function fileToThumb(file, max) {
  max = max || 640;
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('gagal baca'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('bukan gambar valid'));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const s = Math.min(1, max / Math.max(w, h));
        w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
        const cv = el('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', 0.72));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
// Panel upload gambar generik (dipakai di Bikin & Riset). opts: {key,max,min,label,hint,btnTitle,onChange}
function renderImgUploader(container, c, opts) {
  const o = opts;
  const get = () => imgGet(c, o.key);
  const set = arr => imgSet(c, o.key, arr, o.max);
  const rerender = () => { renderImgUploader(container, c, o); if (o.onChange) o.onChange(); };
  container.innerHTML = '';
  const imgs = get();
  container.append(el('div', { style: 'font-weight:800; font-size:15px;', textContent: o.label }));
  if (o.hint) container.append(el('div', { class: 'hint', style: 'margin:3px 0 9px;', textContent: o.hint }));
  // indikator syarat minimal (kalau ada) — merah bila belum cukup, hijau bila sudah
  if (o.min) {
    const need = imgs.length < o.min;
    container.append(el('div', { class: 'hint', style: 'margin:-2px 0 10px; font-weight:700; color:' + (need ? 'var(--coral)' : 'var(--pine)') + ';', textContent: need ? ('⚠️ Minimal ' + o.min + ' gambar — baru ada ' + imgs.length + '.') : ('✓ ' + imgs.length + ' gambar (syarat min ' + o.min + ' terpenuhi)') }));
  }
  if (imgs.length < o.max) {
    const { node } = fileDropUI({
      accept: 'image/*', multiple: true, icon: '🖼️', title: o.btnTitle || 'Upload gambar',
      hint: (imgs.length ? imgs.length + '/' + o.max + ' terpakai — ' : '') + 'klik atau seret gambar (boleh banyak sekaligus)',
      btn: 'Pilih gambar',
      onPick: async (files, ui) => {
        const room = o.max - get().length;
        if (room <= 0) { toast('Sudah ' + o.max + ' gambar (maksimal) ✗', 'err'); return; }
        const list = files.filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|hei[cf])$/i.test(f.name));
        if (!list.length) { ui.setIcon('🖼️'); ui.setStatus('File harus gambar'); toast('File harus gambar ✗', 'err'); return; }
        ui.setIcon('⏳'); ui.setStatus('Memproses ' + Math.min(list.length, room) + ' gambar…');
        let ok = 0, fail = 0, full = false;
        for (const f of list.slice(0, room)) {
          try { const data = await fileToThumb(f); const cur = get(); cur.push({ name: f.name, data }); if (set(cur)) ok++; else { full = true; break; } }
          catch (e) { fail++; }
        }
        if (full) toast('Penyimpanan penuh — sebagian gambar tak tersimpan ✗', 'err');
        else if (ok) toast(ok + ' gambar tersimpan ✓' + (fail ? ' · ' + fail + ' gagal' : ''), 'ok');
        else toast('Gagal simpan gambar ✗', 'err');
        rerender();
      },
    });
    container.append(node);
  } else {
    container.append(el('div', { class: 'hint', style: 'color:var(--gold); font-weight:700;', textContent: 'Sudah ' + o.max + '/' + o.max + ' gambar — hapus salah satu dulu buat nambah.' }));
  }
  if (imgs.length) {
    const grid = el('div', { class: 'refgrid' });
    imgs.forEach((r, i) => grid.append(el('div', { class: 'refcell' }, [
      el('img', { src: r.data, alt: r.name || ('gambar ' + (i + 1)), loading: 'lazy' }),
      el('span', { class: 'num', textContent: String(i + 1) }),
      el('button', { class: 'x', title: 'Hapus gambar', textContent: '✕', onclick: () => { set(get().filter((_, j) => j !== i)); toast('Gambar dihapus', 'ok'); rerender(); } }),
    ])));
    container.append(grid);
    container.append(el('button', { class: 'file-clear', style: 'margin-top:11px;', textContent: '🗑️ Hapus semua', onclick: () => { if (!confirm('Hapus semua gambar ' + c.name + '?')) return; set([]); toast('Dikosongkan', 'ok'); rerender(); } }));
  }
}
// Referensi visual "Bikin Konten" — WAJIB (min 1), maks 8.
function renderRefUploader(container, c) {
  renderImgUploader(container, c, {
    key: 'ce3_refs_', max: 8, min: 1,
    label: '🖼️ Referensi visual kamu (wajib)',
    hint: 'Upload minimal 1 (sampai 8) gambar acuan buat IG Feed / Reels / TikTok — moodboard, foto produk, atau gaya feed. Muncul lagi di hasil biar gampang ngevisualin. Disimpan di browser kamu aja.',
    btnTitle: 'Upload gambar referensi',
  });
}
// Gambar referensi di tab Riset — min 2 (mis. screenshot feed kompetitor / contoh yang disuka), maks 8.
function renderRisetImgUploader(container, c) {
  renderImgUploader(container, c, {
    key: 'ce3_risetimg_', max: 8, min: 2,
    label: '📸 Gambar referensi akun (min 2)',
    hint: 'Upload minimal 2 screenshot — feed/konten akunmu yang mau direview atau contoh yang kamu suka. Jadi acuan visual pas audit & bandingin gaya. Disimpan di browser kamu aja.',
    btnTitle: 'Upload gambar',
  });
}
// arahan gambar (brief visual) — dipakai buat nyetir gambar AI carousel/feed
function imgBriefGet(c) { return store.get('ce3_imgbrief_' + c.id, '') || ''; }
function imgBriefField(c) {
  const wrap = el('div', { style: 'margin-top:14px; padding-top:14px; border-top:1px dashed var(--line);' });
  wrap.append(el('label', { style: 'margin-top:0;', textContent: '🎯 Arahan gambar carousel/feed (opsional)' }));
  const ta = el('textarea', { id: 'g_imgbrief', style: 'min-height:72px;', placeholder: 'mau gambar apa? contoh: botol serum di atas meja marmer, nuansa pagi, ada daun hijau — atau flat lay produk minimalis dengan properti kayu', value: imgBriefGet(c) });
  ta.oninput = () => store.set('ce3_imgbrief_' + c.id, ta.value);
  wrap.append(ta);
  wrap.append(el('div', { class: 'hint', textContent: 'Deskripsi visual yang kamu mau — dipakai buat nyetir Gambar AI (carousel/feed). Kosong = kami ikut judul & profil brand.' }));
  return wrap;
}
// Strip referensi user di kartu hasil (biar acuan visual kelihatan pas nyusun konten).
function userRefStrip(c) {
  const refs = getRefs(c);
  if (!refs.length) return null;
  const wrap = el('div', { style: 'margin-top:16px;' });
  wrap.append(el('div', { class: 'asset-head' }, [el('b', { textContent: '🖼️ Referensi visual kamu (' + refs.length + ')' })]));
  wrap.append(el('div', { class: 'tiny', style: 'margin:-2px 0 8px;', textContent: 'Gambar acuan yang kamu upload — pakai sebagai patokan gaya waktu bikin/motret.' }));
  const grid = el('div', { class: 'refgrid' });
  refs.forEach((r, i) => grid.append(el('div', { class: 'refcell' }, [
    el('img', { src: r.data, alt: r.name || ('referensi ' + (i + 1)), loading: 'lazy' }),
    el('span', { class: 'num', textContent: String(i + 1) }),
  ])));
  wrap.append(grid);
  return wrap;
}

// panel upload/ganti/hapus brand guideline PDF (dipakai di tab Profil)
function brandGuideUploader(c) {
  const wrap = el('div', { style: 'margin-top:14px; padding-top:14px; border-top:1px dashed var(--line);' });
  wrap.append(el('div', { style: 'font-weight:700; font-size:13.5px; margin-bottom:8px;', textContent: '📄 Brand guideline (PDF)' }));
  const hasG = !!c.brandGuideName;
  const { node, ui } = fileDropUI({
    accept: 'application/pdf,.pdf', icon: hasG ? '✅' : '📄',
    title: hasG ? c.brandGuideName : 'Upload brand guideline (PDF)',
    hint: hasG ? (String(c.brandGuide || '').length + ' karakter dipakai buat nyetir hasil AI') : 'klik atau seret PDF ke sini — warna, tone, do/don\'t. Diproses di browser, tidak diunggah.',
    btn: 'Pilih PDF', done: hasG,
    onPick: async (file, ui) => {
      if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') { ui.setStatus('❌ File harus PDF'); toast('File harus PDF ✗', 'err'); return; }
      ui.setIcon('⏳'); ui.setStatus('Membaca ' + file.name + '…');
      try {
        const text = await extractPdfText(await file.arrayBuffer());
        c.brandGuide = text; c.brandGuideName = file.name; saveClient(c);
        toast(text && text.length > 40 ? 'Brand guideline tersimpan ✓' : 'Tersimpan (teks PDF sedikit) ✓', 'ok');
        openBrand(c.id, 'profil');
      } catch (e) { ui.setIcon('📄'); ui.setStatus('❌ Gagal baca PDF: ' + String(e.message || e).slice(0, 50)); toast('Gagal baca PDF ✗', 'err'); }
    },
  });
  wrap.append(node);
  if (hasG) wrap.append(el('button', { class: 'file-clear', textContent: '🗑️ Hapus guideline', onclick: () => { delete c.brandGuide; delete c.brandGuideName; saveClient(c); toast('Guideline dihapus', 'ok'); openBrand(c.id, 'profil'); } }));
  return wrap;
}

/* ═══════════════════════ PROFIL: KEKUATAN ═══════════════════════ */
// bobot tiap field buat hitung kelengkapan profil (field inti bobot lebih besar)
const STRENGTH_FIELDS = [
  ['name', 2], ['category', 2], ['products', 2], ['buyer', 2], ['painpoint', 2],
  ['tone', 1.5], ['sapaan', 1.5], ['goal', 1], ['cta', 1.5],
  ['price', 1], ['usp', 1.5], ['proof', 1], ['desire', 1], ['promo', .5],
  ['forbiddenClaims', .5], ['signature', .5], ['social', .5], ['comp1', .5], ['brandGuide', .5], ['scriptRef', .5], ['scriptRefAds', .5],
];
// persen kelengkapan profil brand (0-100)
function profileStrength(c) {
  let got = 0, total = 0;
  for (const [k, w] of STRENGTH_FIELDS) { total += w; if (c[k] && String(c[k]).trim()) got += w; }
  if (Array.isArray(c.competitors) && c.competitors.length) got += .5;
  return Math.min(100, Math.round(got / total * 100));
}
// bar kelengkapan profil (warna: koral < gold < pine sesuai persen)
function strengthBar(pct, hint) {
  return el('div', { class: 'strength' }, [
    el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%;' + (pct < 50 ? 'background:var(--coral);' : pct < 75 ? 'background:var(--gold);' : '') })),
    el('span', { class: 'tiny', textContent: (hint ? 'profil ' : '') + pct + '%' }),
  ]);
}

/* ═══════════════════════ WIZARD ONBOARDING ═══════════════════════ */
// definisi 11 layar onboarding: tiap step punya field + tipe input-nya
const WIZ_STEPS = [
  { id: 'nama', emoji: '👋', title: 'Halo! Nama brand-mu apa?', sub: 'Santai aja — semua jawaban bisa diubah kapan pun.',
    fields: [{ id: 'name', type: 'text', ph: 'contoh: GlowUp Skincare', req: true, enter: true }] },
  { id: 'kategori', emoji: '🏪', title: 'Bidangnya apa?', sub: 'Ini menentukan contoh, saran, dan aturan aman yang kami siapkan buatmu.',
    fields: [{ id: 'category', type: 'cats', req: true }] },
  { id: 'produk', emoji: '🛍️', title: 'Yang paling diandalkan buat dijual?', sub: 'Sebut 1–3 aja, yang paling sering mau dipromosikan.',
    fields: [
      { id: 'products', label: 'Produk / menu / jasa andalan', type: 'textarea', ph: 'contoh: Serum Niacinamide 10%, Sunscreen SPF50', req: true },
      { id: 'price', label: 'Kisaran harganya? (opsional)', type: 'textarea', ph: 'contoh: Rp79rb–145rb' },
    ] },
  { id: 'beda', emoji: '✨', title: 'Apa yang bikin kamu beda?', sub: 'Kalau bingung, tap salah satu contoh di bawah — nanti bisa diedit.',
    fields: [
      { id: 'usp', label: 'Pembeda utama (USP)', type: 'textarea', ph: 'contoh: ringan, ber-BPOM, ramah pemula', sugg: 'usps' },
      { id: 'proof', label: 'Bukti yang bisa dipamerin (opsional)', type: 'textarea', ph: 'contoh: 10.000+ terjual, rating 4.9' },
    ] },
  { id: 'pembeli', emoji: '🎯', title: 'Siapa pembeli utamamu?', sub: 'Konten yang bagus itu ngomong ke satu orang, bukan ke semua orang.',
    fields: [{ id: 'buyer', type: 'textarea', ph: 'contoh: cewek 18–28, mahasiswa & first jobber', req: true, sugg: 'buyers' }] },
  { id: 'masalah', emoji: '😖', title: 'Masalah mereka yang kamu selesaikan?', sub: 'Ini bahan bakar utama semua konten. Tap beberapa contoh sekaligus boleh banget.',
    fields: [
      { id: 'painpoint', label: 'Masalah / keluhan mereka', type: 'textarea', ph: 'contoh: kulit kusam, takut produk abal-abal', req: true, sugg: 'pains', append: true },
      { id: 'desire', label: 'Impian mereka? (opsional)', type: 'textarea', ph: 'contoh: tampil pede tanpa makeup tebal', sugg: 'desires' },
    ] },
  { id: 'gaya', emoji: '🗣️', title: 'Gaya ngomong brand-mu?', sub: 'Semua hasil bakal ditulis dengan gaya ini.',
    fields: [
      { id: 'tone', label: 'Nada bicara (boleh pilih lebih dari satu)', type: 'pills-multi', options: TONE_LIST, req: true },
      { id: 'sapaan', label: 'Manggil audiens apa?', type: 'pills-custom', options: SAPAANS, req: true },
    ] },
  { id: 'bumbu', emoji: '🧂', title: 'Bumbu bahasanya', sub: 'Opsional, tapi bikin hasil makin "kamu banget".',
    fields: [
      { id: 'emoji', label: 'Pakai emoji?', type: 'pills', options: EMOJIS },
      { id: 'signature', label: 'Frasa khas brand (opsional)', type: 'textarea', ph: 'contoh: "glow bareng GlowUp"' },
      { id: 'forbidden', label: 'Kata yang JANGAN pernah dipakai (opsional)', type: 'textarea', ph: 'contoh: murahan, lebay' },
      { id: 'brandGuide', label: '📄 Brand guideline (PDF, opsional)', type: 'pdf' },
    ] },
  { id: 'tujuan', emoji: '📣', title: 'Kontennya buat apa?', sub: 'Semua konten diarahkan ke tujuan ini.',
    fields: [
      { id: 'goal', label: 'Tujuan utama', type: 'pills', options: GOALS, req: true },
      { id: 'cta', label: 'Ajakan di akhir konten (CTA)', type: 'pills-custom', options: CTAS, req: true, taCustom: true },
      { id: 'promo', label: 'Promo yang lagi jalan (opsional)', type: 'textarea', ph: 'contoh: Glow Bundle 149rb s/d Minggu' },
    ] },
  { id: 'pilar', emoji: '🧱', title: 'Pilar konten kamu?', sub: 'Tema yang bakal jadi tulang punggung feed-mu. Ini yang menentukan campuran "Ide Seminggu".',
    fields: [
      { id: 'pillars', label: 'Pilih pilar konten (boleh beberapa)', type: 'pills-multi', options: PILLAR_LIST, default: PILLAR_DEFAULT, req: true,
        hint: 'Rasio sehat 80/20: mayoritas memberi (Edukasi, Tips, Hiburan, BTS, Komunitas, bukti) — sedikit Promosi. Rencana 7 harimu dirakit dari pilihan ini.' },
      { id: 'scriptRef', label: 'Referensi script — Copywriting (DOCX/PDF, opsional)', type: 'doc',
        hint: 'Contoh script konten organik/copywriting lama yang gayanya mau ditiru. Dipakai buat nyetir hasil script & caption. Diproses di browser, tidak diunggah.' },
      { id: 'scriptRefAds', label: 'Referensi script — Ads (DOCX/PDF, opsional)', type: 'doc',
        hint: 'Contoh script iklan (Meta/TikTok Ads) lama yang perform bagus. Dipakai khusus buat nyetir hasil Ads. Diproses di browser, tidak diunggah.' },
    ] },
  { id: 'aman', emoji: '🛡️', title: 'Biar kontenmu aman', sub: 'Kami udah isikan aturan umum bidangmu — cek & sesuaikan aja.', skippable: true,
    fields: [
      { id: 'forbiddenClaims', label: 'Klaim yang dilarang', type: 'textarea', ph: 'contoh: menyembuhkan, putih permanen' },
      { id: 'certifications', label: 'Sertifikasi yang boleh disebut', type: 'textarea', ph: 'contoh: BPOM, Halal MUI' },
    ] },
  { id: 'saingan', emoji: '🔭', title: 'Terakhir: akun & saingan', sub: 'Buat fitur review & bandingkan kompetitor. Boleh dilewati.', skippable: true,
    fields: [
      { id: 'social', label: 'Akun IG brand-mu', type: 'text', ph: '@brandku' },
      ...COMP_KEYS.map((k, i) => ({ id: k, label: 'Kompetitor ' + (i + 1), type: 'text', ph: '@saingan_' + (i + 1), ...(i === MAX_COMP - 1 ? { enter: true } : {}) })),
    ] },
];
let wiz = null; // state wizard aktif (draft brand + step)
// mulai wizard (brand baru kalau client null, atau edit) dari step tertentu
function startWizard(client, stepIdx = 0) {
  wiz = { draft: client ? { ...client } : { id: uid(), category: '' }, step: stepIdx, isNew: !client };
  renderWizard();
}
// render satu layar wizard (progress + judul + field + navigasi)
// Alat bantu di step "saingan": rekomendasi kompetitor otomatis + tombol cari di Instagram.
function wizCompetitorTools() {
  const box = el('div', { style: 'margin-bottom:16px; padding-bottom:14px; border-bottom:1px dashed var(--line);' });
  const s = suggestCompetitors(wiz.draft); // akun asli dicocokkan ke jasa/produk brand
  box.append(el('div', { class: 'hint', style: 'margin:0 0 8px;', html: s.length
    ? '✨ Kami cocokkan <b>' + s.length + ' akun asli</b> ke produk/jasa brand-mu. Klik <b>Rekomendasikan</b> buat isi otomatis kolom di bawah, atau <b>Cari kompetitor</b> buat cari sendiri di Instagram.'
    : '🔎 Belum ketemu akun yang pas otomatis buat niche ini. Pakai <b>Cari kompetitor</b> buat cari di Instagram, lalu salin @handle-nya ke kolom di bawah.' }));
  const row = el('div', { class: 'row', style: 'gap:8px; flex-wrap:wrap;' });
  if (s.length) row.append(el('button', { class: 'primary', type: 'button', textContent: '✨ Rekomendasikan (' + s.length + ')', onclick: () => {
    setComps(wiz.draft, s); toast(s.length + ' kompetitor terisi otomatis ✓', 'ok'); renderWizard();
  } }));
  row.append(el('button', { type: 'button', textContent: (wiz.showCompSearch ? '✕ Tutup pencarian' : '🔎 Cari kompetitor'), onclick: () => { wiz.showCompSearch = !wiz.showCompSearch; renderWizard(); } }));
  if (compsOf(wiz.draft).length) row.append(el('button', { class: 'ghost', type: 'button', textContent: '🗑️ Kosongkan', onclick: () => { setComps(wiz.draft, []); toast('Kolom kompetitor dikosongkan', 'ok'); renderWizard(); } }));
  box.append(row);
  if (wiz.showCompSearch) {
    const p = renderIgSearchPanel(wiz.draft, null, h => {
      const clean = cleanHandle(h);
      if (!clean) return false;
      const cur = compsOf(wiz.draft);
      if (cur.some(x => x.replace(/^@+/, '').toLowerCase() === clean.toLowerCase())) return false; // dup
      if (cur.length >= MAX_COMP) return false; // penuh
      setComps(wiz.draft, [...cur, clean]);
      saveWizDraft(); renderWizard();
      return true;
    });
    p.style.marginTop = '12px'; box.append(p);
  }
  return box;
}
// simpan draft onboarding (brand baru saja) → bisa dilanjut kalau tab ke-refresh
function saveWizDraft() { if (wiz && wiz.isNew && wiz.draft && wiz.draft.name) store.set('ce3_wizdraft', { draft: wiz.draft, step: wiz.step }); }
function clearWizDraft() { store.del('ce3_wizdraft'); }
// lanjutkan onboarding dari draft tersimpan
function resumeWizard() {
  const d = store.get('ce3_wizdraft', null);
  if (!d || !d.draft) return renderHome();
  wiz = { draft: d.draft, step: Math.min(d.step || 0, WIZ_STEPS.length - 1), isNew: true };
  renderWizard();
}
function renderWizard() {
  const steps = WIZ_STEPS;
  const step = steps[wiz.step];
  const app = $('#app'); app.innerHTML = '';
  const box = el('div', { class: 'wiz view' });
  box.append(el('div', { class: 'wiz-top' }, [
    el('button', { class: 'ghost', textContent: '✕', title: 'Keluar (isian tersimpan sebagai draft)', onclick: () => {
      // isian brand baru otomatis tersimpan sbg draft → keluar tanpa takut hilang
      if (wiz.isNew && wiz.draft.name) { saveWizDraft(); toast('Disimpan sebagai draft — lanjutkan kapan aja dari Home ✓', 'ok'); }
      wiz = null; renderHome();
    } }),
    el('div', { class: 'wiz-progress' }, el('i', { style: 'width:' + Math.round((wiz.step + 1) / steps.length * 100) + '%;' })),
    el('span', { class: 'tiny', textContent: (wiz.step + 1) + '/' + steps.length }),
  ]));
  box.append(el('div', { class: 'emoji', textContent: step.emoji }));
  box.append(el('h2', { textContent: step.title }));
  box.append(el('div', { class: 'sub', textContent: step.sub }));
  const form = el('div', { class: 'card' });
  if (step.id === 'saingan') form.append(wizCompetitorTools()); // ✨ rekomendasi + 🔎 cari kompetitor
  step.fields.forEach(f => form.append(wizField(f)));
  box.append(form);
  // interaksi apa pun → hapus tanda "wajib belum diisi" + autosave draft
  const onInteract = e => { const w = e.target.closest && e.target.closest('[data-field]'); if (w) { w.classList.remove('field-invalid'); const er = w.querySelector('.field-err'); if (er) er.remove(); } saveWizDraft(); };
  form.addEventListener('input', onInteract);
  form.addEventListener('click', onInteract);
  const last = wiz.step === steps.length - 1;
  const nav = el('div', { class: 'wiz-nav' });
  if (wiz.step > 0) nav.append(el('button', { textContent: '← Balik', onclick: () => { wiz.step--; renderWizard(); } }));
  nav.append(el('span', { class: 'spacer' }));
  if (step.skippable && !last) nav.append(el('button', { class: 'ghost', textContent: 'Lewati', onclick: () => { wiz.step++; renderWizard(); } }));
  nav.append(el('button', { class: 'primary big', textContent: last ? '🎉 Simpan brand!' : 'Lanjut →', onclick: wizNext }));
  box.append(nav);
  app.append(box);
  window.scrollTo({ top: 0 });
  saveWizDraft();
  // autofokus field pertama kalau tipenya teks (biar bisa langsung ngetik) — bukan di layar pilih kategori/pill
  const firstType = step.fields[0] && step.fields[0].type;
  if (firstType === 'text' || firstType === 'textarea') { const fi = form.querySelector('input[type="text"], textarea'); if (fi) fi.focus(); }
}
// validasi field wajib lalu maju ke step berikutnya (prefill aturan aman saat pilih kategori)
function wizNext() {
  const step = WIZ_STEPS[wiz.step];
  document.querySelectorAll('.wiz .field-invalid').forEach(w => w.classList.remove('field-invalid'));
  for (const f of step.fields) {
    const v = wiz.draft[f.id];
    const empty = Array.isArray(v) ? v.length === 0 : !(v && String(v).trim());
    if (f.req && empty) {
      // tandai field-nya langsung (bukan cuma toast) → fokus + scroll + pesan inline
      const wrap = document.querySelector('.wiz [data-field="' + f.id + '"]');
      const nice = (f.label || step.title.replace(/[?？]$/, '')).replace(/\s*\(.*?\)\s*/g, '');
      if (wrap) {
        wrap.classList.add('field-invalid');
        if (!wrap.querySelector('.field-err')) wrap.append(el('div', { class: 'field-err', textContent: '⚠ Wajib diisi ya' }));
        const foc = wrap.querySelector('input[type="text"], textarea, .pill, button');
        if (foc && foc.focus) foc.focus();
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast('Isi dulu: ' + nice, 'err');
      return;
    }
  }
  // prefill aturan aman ketika kategori baru dipilih
  if (step.id === 'kategori') {
    const bank = BANK[wiz.draft.category] || BANK.other;
    if (!wiz.draft.forbiddenClaims) wiz.draft.forbiddenClaims = bank.forbiddenDefault;
    if (!wiz.draft.certifications && bank.certDefault) wiz.draft.certifications = bank.certDefault;
  }
  if (wiz.step === WIZ_STEPS.length - 1) return finishWizard();
  wiz.step++; renderWizard();
}
// render satu field wizard sesuai tipenya (text/textarea/pills/cats/pdf/dst)
function wizField(f) {
  const wrap = el('div');
  if (f.id) wrap.dataset.field = f.id; // buat targeting validasi "wajib belum diisi"
  if (f.label) {
    const lbl = el('label', {}, [f.label]);
    if (f.req) lbl.append(el('span', { class: 'req', textContent: ' *' }));
    wrap.append(lbl);
  }
  const val = wiz.draft[f.id] || '';
  if (f.type === 'pdf') {
    const hasG = !!wiz.draft.brandGuideName;
    const { node } = fileDropUI({
      accept: 'application/pdf,.pdf', icon: hasG ? '✅' : '📄',
      title: hasG ? wiz.draft.brandGuideName : 'Upload brand guideline (PDF)',
      hint: hasG ? ((wiz.draft.brandGuide ? wiz.draft.brandGuide.length + ' karakter terbaca' : 'teks tidak terbaca') + ' — dipakai buat nyetir hasil') : 'klik atau seret PDF ke sini. Diproses di browser — tidak diunggah.',
      btn: 'Pilih PDF', done: hasG,
      onPick: async (file, ui) => {
        if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') { ui.setStatus('❌ File harus PDF'); toast('File harus PDF ✗', 'err'); return; }
        ui.setIcon('⏳'); ui.setStatus('Membaca ' + file.name + '…');
        try {
          const text = await extractPdfText(await file.arrayBuffer());
          wiz.draft.brandGuide = text; wiz.draft.brandGuideName = file.name;
          toast(text && text.length > 40 ? 'Brand guideline terpasang ✓' : 'Terpasang (teks PDF sedikit) ✓', 'ok');
          renderWizard();
        } catch (e) { ui.setIcon('📄'); ui.setStatus('❌ Gagal baca PDF: ' + String(e.message || e).slice(0, 50)); toast('Gagal baca PDF ✗', 'err'); }
      },
    });
    wrap.append(node);
    if (hasG) wrap.append(el('button', { class: 'file-clear', textContent: '🗑️ Hapus PDF', onclick: () => { delete wiz.draft.brandGuide; delete wiz.draft.brandGuideName; toast('PDF dihapus', 'ok'); renderWizard(); } }));
    return wrap;
  }
  if (f.type === 'doc') {
    // upload referensi dokumen (script lama) — terima DOCX & PDF, diekstrak jadi teks di browser
    const nameKey = f.id + 'Name';
    const has = !!wiz.draft[nameKey];
    const { node } = fileDropUI({
      accept: '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      icon: has ? '✅' : '📄',
      title: has ? wiz.draft[nameKey] : 'Upload script (DOCX / PDF)',
      hint: has ? ((wiz.draft[f.id] ? wiz.draft[f.id].length + ' karakter terbaca' : 'teks tidak terbaca') + ' — dipakai buat nyetir hasil')
                : (f.hint || 'klik atau seret DOCX/PDF ke sini. Diproses di browser — tidak diunggah.'),
      btn: 'Pilih file', done: has,
      onPick: async (file, ui) => {
        if (!/\.(pdf|docx)$/i.test(file.name)) { ui.setStatus('❌ Harus DOCX atau PDF'); toast('File harus DOCX/PDF ✗', 'err'); return; }
        ui.setIcon('⏳'); ui.setStatus('Membaca ' + file.name + '…');
        try {
          const text = await extractDocText(file);
          wiz.draft[f.id] = text; wiz.draft[nameKey] = file.name;
          toast(text && text.length > 40 ? 'Referensi script terpasang ✓' : 'Terpasang (teks sedikit terbaca) ✓', 'ok');
          renderWizard();
        } catch (e) { ui.setIcon('📄'); ui.setStatus('❌ Gagal baca: ' + String(e.message || e).slice(0, 50)); toast('Gagal baca file ✗', 'err'); }
      },
    });
    wrap.append(node);
    if (has) wrap.append(el('button', { class: 'file-clear', textContent: '🗑️ Hapus referensi', onclick: () => { delete wiz.draft[f.id]; delete wiz.draft[nameKey]; toast('Referensi dihapus', 'ok'); renderWizard(); } }));
    return wrap;
  }
  if (f.type === 'cats') {
    const grid = el('div', { class: 'cat-grid' });
    CATS.forEach(c => {
      const card = el('div', { class: 'cat-card' + (wiz.draft.category === c.id ? ' on' : '') }, [
        el('span', { class: 'e', textContent: c.e }), c.label,
      ]);
      card.onclick = () => { wiz.draft.category = c.id; wizNext(); };
      grid.append(card);
    });
    wrap.append(grid);
  } else if (f.type === 'pills-multi') {
    // checkbox-style: boleh pilih beberapa (dipakai untuk Nada bicara & Pilar konten)
    // kalau belum pernah diisi & field punya `default` → pakai default (pre-selected)
    const cur = Array.isArray(val) ? val.slice() : (val ? [val] : (f.default ? f.default.slice() : []));
    wiz.draft[f.id] = cur;
    const pills = el('div', { class: 'pills' });
    f.options.forEach(o => {
      const on = cur.includes(o);
      const p = el('button', { class: 'pill' + (on ? ' on' : ''), textContent: (on ? '✓ ' : '') + o });
      p.onclick = e => {
        e.preventDefault();
        const i = cur.indexOf(o);
        if (i >= 0) cur.splice(i, 1); else cur.push(o);
        wiz.draft[f.id] = cur;
        p.classList.toggle('on', cur.includes(o));
        p.textContent = (cur.includes(o) ? '✓ ' : '') + o;
      };
      pills.append(p);
    });
    wrap.append(pills);
    wrap.append(el('div', { class: 'hint', textContent: f.hint || 'Pilih 1–3 yang paling nggambarin brand-mu. Tone pertama jadi acuan utama.' }));
  } else if (f.type === 'pills' || f.type === 'pills-custom') {
    const pills = el('div', { class: 'pills' });
    let custom = null;
    const setVal = v => { wiz.draft[f.id] = v; pills.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.v === v)); if (custom && f.options.includes(v)) custom.value = ''; };
    f.options.forEach(o => {
      const p = el('button', { class: 'pill' + (val === o ? ' on' : ''), textContent: o });
      p.dataset.v = o; p.onclick = e => { e.preventDefault(); setVal(o); };
      pills.append(p);
    });
    wrap.append(pills);
    if (f.type === 'pills-custom') {
      custom = el(f.taCustom ? 'textarea' : 'input', { placeholder: 'atau ketik sendiri…', value: f.options.includes(val) ? '' : val, style: 'margin-top:10px;' });
      if (!f.taCustom) custom.type = 'text';
      custom.oninput = () => { if (custom.value.trim()) { wiz.draft[f.id] = custom.value.trim(); pills.querySelectorAll('.pill').forEach(p => p.classList.remove('on')); } };
      wrap.append(custom);
    }
  } else {
    // placeholder menyesuaikan kategori yang dipilih — biar contohnya selalu relevan
    const bank0 = BANK[wiz.draft.category];
    const PH_DYN = bank0 ? {
      buyer: 'contoh: ' + bank0.buyers[0],
      painpoint: 'contoh: ' + bank0.pains.slice(0, 2).join(', '),
      desire: 'contoh: ' + bank0.desires[0],
      usp: 'contoh: ' + bank0.usps[0],
    } : {};
    const input = el(f.type === 'textarea' ? 'textarea' : 'input', { value: val, placeholder: PH_DYN[f.id] || f.ph || '' });
    if (f.type !== 'textarea') { input.type = 'text'; if (f.enter) input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); wizNext(); } }; }
    input.oninput = () => { wiz.draft[f.id] = input.value; };
    wrap.append(input);
    if (f.sugg) {
      const bank = BANK[wiz.draft.category] || BANK.other;
      const opts = bank[f.sugg] || [];
      if (opts.length) {
        const sugg = el('div', { class: 'sugg' });
        opts.forEach(o => sugg.append(el('button', { textContent: '+ ' + o, onclick: e => {
          e.preventDefault();
          if (f.append && input.value.trim()) input.value = input.value.replace(/[,\s]+$/, '') + ', ' + o;
          else input.value = o;
          wiz.draft[f.id] = input.value;
        } })));
        wrap.append(sugg);
      }
    }
  }
  return wrap;
}
// simpan brand hasil wizard (baru → layar selesai, edit → balik ke profil)
function finishWizard() {
  const d = wiz.draft;
  // rapikan: buang spasi berlebih di semua isian teks
  for (const k in d) { if (typeof d[k] === 'string') d[k] = d[k].trim(); }
  d.competitors = COMP_KEYS.map(k => d[k]).map(x => (x || '').trim()).filter(Boolean);
  saveClient(d);
  clearWizDraft(); // draft selesai → hapus
  const id = d.id, isNew = wiz.isNew;
  wiz = null;
  if (isNew) renderDone(d);
  else { toast('Profil diperbarui ✓'); openBrand(id, 'profil'); }
}
// layar selesai onboarding brand baru (kekuatan profil + CTA bikin konten)
function renderDone(c) {
  const app = $('#app'); app.innerHTML = '';
  const pct = profileStrength(c);
  const box = el('div', { class: 'wiz view', style: 'text-align:center; padding-top:34px;' });
  box.append(el('div', { class: 'done-burst', textContent: '🎉' }));
  box.append(el('h2', { style: 'font-size:34px; font-weight:900;', html: `${c.name} <em class="fancy">siap gas!</em>` }));
  box.append(el('p', { class: 'muted', style: 'max-width:420px; margin:12px auto 0;', textContent: 'Profil brand-mu udah kami pelajari. Mulai sekarang, semua script, carousel, dan caption dibuat dengan gaya & fakta brand-mu — bukan template pasaran.' }));
  const card = el('div', { class: 'card', style: 'max-width:380px; margin:22px auto 0; text-align:left;' });
  card.append(el('b', { textContent: 'Kekuatan profil' }));
  card.append(strengthBar(pct));
  card.append(el('div', { class: 'hint', textContent: pct >= 75 ? 'Mantap! Makin lengkap profil, makin tajam hasilnya.' : 'Cukup buat mulai. Lengkapi kapan pun di tab Profil biar hasil makin tajam.' }));
  box.append(card);
  box.append(el('div', { class: 'row', style: 'justify-content:center; margin-top:26px;' }, [
    el('button', { class: 'primary big', textContent: '✨ Bikin konten pertamaku', onclick: () => openBrand(c.id, 'bikin') }),
  ]));
  app.append(box);
  window.scrollTo({ top: 0 });
}

/* ═══════════════════════ HOME ═══════════════════════ */
// beranda: hero landing (kalau belum ada brand) atau grid pilih brand
function renderHome() {
  const app = $('#app'); app.innerHTML = '';
  const clients = loadClients();
  const v = el('div', { class: 'view' });
  // banner lanjutkan onboarding kalau ada draft brand baru yang belum selesai
  const wd = store.get('ce3_wizdraft', null);
  if (wd && wd.draft && wd.draft.name) {
    const dn = wd.draft.name, stepN = Math.min((wd.step || 0) + 1, WIZ_STEPS.length);
    v.append(el('div', { class: 'card', style: 'display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:space-between; border:1.5px solid var(--pine); background:var(--pine-soft, #eef3ef); margin-bottom:18px;' }, [
      el('div', {}, [
        el('b', { textContent: '⏳ Setup "' + dn + '" belum selesai' }),
        el('div', { class: 'tiny', style: 'margin-top:2px;', textContent: 'Berhenti di langkah ' + stepN + '/' + WIZ_STEPS.length + '. Lanjutin biar brand-mu siap dipakai.' }),
      ]),
      el('div', { class: 'row', style: 'gap:8px;' }, [
        el('button', { class: 'primary', textContent: 'Lanjutkan →', onclick: resumeWizard }),
        el('button', { class: 'ghost', textContent: '🗑️ Buang', onclick: () => { if (confirm('Buang draft "' + dn + '"?')) { clearWizDraft(); renderHome(); } } }),
      ]),
    ]));
  }
  if (!clients.length) {
    v.append(el('div', { class: 'hero' }, [
      el('span', { class: 'kicker', textContent: '⚡ Gratis · tanpa daftar · langsung jadi' }),
      el('h1', { html: 'Konten sosmed yang<br/><em class="fancy">kamu banget</em> — dalam hitungan detik.' }),
      el('p', { class: 'lead', textContent: 'Ceritakan brand-mu sekali (3 menit). Habis itu tiap hari tinggal klik: script video, carousel, caption + hashtag, storyboard, sampai riset kompetitor.' }),
      el('div', { class: 'hero-cta' }, [
        el('button', { class: 'primary big', textContent: 'Mulai — ceritain brand-ku →', onclick: () => startWizard(null) }),
        el('button', { class: 'big', textContent: '🎁 Coba brand contoh dulu', onclick: seedClients }),
      ]),
      el('div', { class: 'feature-band' }, [
        ['🎬', 'Script Reels & TikTok', '3 hook + adegan + CTA, tinggal shoot'],
        ['🎠', 'Carousel + preview', 'slide per slide, langsung kelihatan jadinya'],
        ['✍️', 'Caption & hashtag', 'panjang, pendek, 5 hook cadangan'],
        ['🗓️', 'Ide seminggu', '7 hari terisi, rasio 80/20 sehat'],
        ['🔍', 'Review & kompetitor', 'analisis asli dari caption-mu'],
      ].map(([e, b, s]) => el('div', { class: 'feat' }, [el('span', { class: 'e', textContent: e }), el('b', { textContent: b }), el('span', { textContent: s })]))),
    ]));
  } else {
    v.append(el('div', { class: 'home-head' }, [
      el('h1', { html: 'Mau bikin konten<br/>buat siapa hari ini?' }),
    ]));
    const grid = el('div', { class: 'brand-grid' });
    clients.forEach((c, i) => {
      const cat = catOf(c);
      const pct = profileStrength(c);
      const card = el('div', { class: 'card brand-card', onclick: () => openBrand(c.id) }, [
        el('div', { class: 'row between' }, [
          el('div', { class: 'avatar' + (i % 2 ? ' coral' : ''), textContent: (c.name || '?').trim().charAt(0).toUpperCase() }),
          el('span', { class: 'chip', textContent: cat.e + ' ' + cat.label }),
        ]),
        el('h3', { textContent: c.name || '(tanpa nama)' }),
        strengthBar(pct, true),
      ]);
      grid.append(card);
    });
    grid.append(el('div', { class: 'add-card', onclick: () => startWizard(null), textContent: '＋ Tambah brand' }));
    v.append(grid);
  }
  app.append(v);
}
// isi 2 brand contoh (skincare & F&B) biar bisa langsung dicoba tanpa isi wizard
function seedClients() {
  const list = loadClients();
  const seeds = [
    { id: uid(), name: 'GlowUp Skincare', category: 'skincare', area: 'Nasional (online)', social: '@glowupskin.id',
      products: 'Serum Niacinamide 10%, Sunscreen SPF50, Gentle Cleanser', price: 'Rp79rb–145rb',
      usp: 'Ringan, ber-BPOM, ramah pemula', proof: '10.000+ terjual, rating 4.9',
      buyer: 'Cewek 18–28, mahasiswa & first jobber', painpoint: 'Kulit kusam padahal rajin cuci muka, bekas jerawat susah pudar, takut produk abal-abal', desire: 'Tampil pede tanpa makeup tebal',
      tone: 'Santai & friendly', sapaan: 'kak', emoji: 'secukupnya', signature: 'glow bareng GlowUp', forbidden: 'murahan',
      goal: 'Jualan', cta: 'Checkout link di bio', promo: 'Glow Bundle 149rb (normal 210rb) s/d Minggu',
      forbiddenClaims: 'menyembuhkan jerawat, putih permanen, 100% ampuh', certifications: 'BPOM',
      comp1: '@glowrivalid', comp2: '@bersinarskin', competitors: ['@glowrivalid', '@bersinarskin'] },
    { id: uid(), name: 'Bakso Juara', category: 'fnb', area: 'Bekasi & Depok', social: '@baksojuara.id',
      products: 'Bakso Beranak, Bakso Mercon level 1-5, Es Teler Juara', price: 'Rp12rb–28rb',
      usp: 'Kuah kaldu sapi asli 8 jam, tanpa MSG berlebih', proof: 'Antre tiap weekend, 4.8 di GoFood',
      buyer: 'Anak muda 16–26, pelajar & keluarga', painpoint: 'Budget tipis pengen makan enak, bosen menu itu-itu aja, takut zonk coba tempat baru', desire: 'Makan puas tanpa bikin dompet nangis',
      tone: 'Lucu & relatable', sapaan: 'gais', emoji: 'banyak', signature: 'juara di kuah pertama', forbidden: 'diet, menyehatkan',
      goal: 'Interaksi', cta: 'Order via GoFood/GrabFood', promo: 'Opening cabang Depok: diskon 20% s/d Jumat',
      forbiddenClaims: 'klaim sehat/diet', certifications: 'Halal',
      comp1: '@baksosebelahh', competitors: ['@baksosebelahh'] },
  ];
  seeds.forEach(s => { if (!list.some(x => x.name === s.name)) list.push(s); });
  saveClients(list);
  toast('2 brand contoh siap dipakai 🎁');
  renderHome();
}

/* ═══════════════════════ WORKSPACE ═══════════════════════ */
let currentId = null, currentTab = 'bikin', pickedType = 'script', pickedHook = ''; // state workspace aktif
let pickedTypes = ['script']; // jenis konten terpilih (checkbox, boleh lebih dari satu)
// buka workspace brand (header + tab Bikin / Riset / Profil)
function openBrand(id, tab) {
  currentId = id; currentTab = tab || 'bikin';
  const c = getClient(id); if (!c) return renderHome();
  const app = $('#app'); app.innerHTML = '';
  const v = el('div', { class: 'view' });
  v.append(el('div', { class: 'row between' }, [
    el('button', { class: 'ghost', textContent: '← Semua brand', onclick: renderHome }),
  ]));
  v.append(el('div', { class: 'row', style: 'margin-top:10px;' }, [
    el('div', { class: 'avatar', textContent: (c.name || '?').charAt(0).toUpperCase() }),
    el('div', {}, [
      el('h2', { style: 'font-size:27px;', textContent: c.name }),
      el('div', { class: 'tiny', textContent: catOf(c).e + ' ' + catOf(c).label + (c.social ? ' · ' + c.social : '') }),
    ]),
  ]));
  const tabs = el('div', { class: 'tabs' });
  [['bikin', '✨ Bikin Konten'], ['reviewkonten', '🎯 Review Konten'], ['riset', '🔍 Riset & Review'], ['posting', '🚀 Posting'], ['profil', '👤 Profil Brand']].forEach(([id2, label]) => {
    tabs.append(el('button', { class: 'tab' + (currentTab === id2 ? ' on' : ''), textContent: label, onclick: () => openBrand(currentId, id2) }));
  });
  v.append(tabs);
  const body = el('div');
  v.append(body);
  app.append(v);
  if (currentTab === 'bikin') renderBikin(body, c);
  else if (currentTab === 'reviewkonten') renderReviewKonten(body, c);
  else if (currentTab === 'riset') renderRiset(body, c);
  else if (currentTab === 'posting') renderPosting(body, c);
  else renderProfil(body, c);
  window.scrollTo({ top: 0 });
}
const stepLabel = (n, t) => el('div', { class: 'step-label' }, [el('span', { class: 'n', textContent: n }), t]); // label langkah bernomor

/* ── TAB: REVIEW KONTEN — nilai semua hasil generate (dari riwayat) pakai reviewer ── */
let reviewFocusId = null; // id item riwayat yg mau dibuka otomatis saat masuk tab Review
// dari mana pun (mis. riwayat Bikin Konten) → loncat ke tab Review; focusId opsional (fokus 1 item)
function openReview(c, focusId) { reviewFocusId = focusId || null; openBrand(c.id, 'reviewkonten'); }
// buka hasil lengkap 1 item riwayat di tab Bikin Konten (aman: tunggu #results ada)
function openHistResult(c, h) {
  openBrand(c.id, 'bikin');
  setTimeout(() => {
    const r = $('#results'); if (!r) return;
    try { r.prepend(renderResult(h.type, TYPES[h.type].gen(c, h.daily, h.seed), c, h.daily, h.seed)); window.scrollTo({ top: r.offsetTop - 80, behavior: 'smooth' }); } catch (e) { toast('Gagal buka hasil', 'err'); }
  }, 60);
}
function renderReviewKonten(body, c) {
  const f = factsOf(c);
  const hist = store.get('ce3_hist_' + c.id, []);
  const head = el('div', { class: 'card' });
  head.append(el('div', { class: 'result-head' }, [el('span', { class: 'e', textContent: '🎯' }), el('h3', { textContent: 'Review konten hasil generate' })]));
  head.append(el('p', { class: 'muted', style: 'margin:0; font-size:14px;', html: 'Semua konten yang udah kamu bikin, dinilai reviewer (hook 3 detik, alur cerita, CTA, keterbacaan). Skor rendah? Buka hasilnya → klik <b>🎲 versi lain</b> sampai lolos.' }));
  body.append(head);
  if (!hist.length) {
    body.append(el('div', { class: 'card', style: 'margin-top:14px; text-align:center; padding:32px 20px;' }, [
      el('div', { style: 'font-size:42px;', textContent: '🗒️' }),
      el('b', { style: 'display:block; margin-top:8px;', textContent: 'Belum ada konten buat direview' }),
      el('div', { class: 'hint', style: 'margin-top:6px;', textContent: 'Bikin dulu di tab ✨ Bikin Konten — hasilnya otomatis muncul di sini buat dinilai.' }),
      el('button', { class: 'primary', style: 'margin-top:14px;', textContent: '✨ Bikin konten pertama', onclick: () => openBrand(c.id, 'bikin') }),
    ]));
    return;
  }
  // regen tiap item + nilai reviewer
  const items = hist.map(h => { let rev = null; try { rev = reviewGenerated(h.type, TYPES[h.type].gen(c, h.daily, h.seed), f); } catch (e) {} return { h, rev }; });
  const scored = items.filter(x => x.rev);
  const bench = (store.get('ce3_riset_' + c.id, {}) || {}).bench || null; // acuan kompetitor dari tab Riset
  const stat = (label, val) => el('div', { class: 'estat' }, [el('div', { class: 'estat-v', textContent: val }), el('div', { class: 'estat-l', textContent: label })]);
  if (scored.length) {
    const avgScore = r1(avg(scored.map(x => x.rev.score)));
    const failCount = {};
    scored.forEach(x => x.rev.fixes.forEach(fx => { failCount[fx.label] = (failCount[fx.label] || 0) + 1; }));
    const weakest = Object.entries(failCount).sort((a, b) => b[1] - a[1])[0];
    const sum = el('div', { class: 'card', style: 'margin-top:14px; background:var(--pine-soft,#eef3ef);' });
    sum.append(el('div', { class: 'estat-row' }, [
      stat('🗂️ Total dinilai', String(scored.length)),
      stat('⭐ Rata-rata skor', avgScore + '/10'),
      stat('🔴 Perlu dibenahi', String(scored.filter(x => x.rev.score < 8).length)),
    ]));
    if (weakest) sum.append(el('div', { class: 'hint', style: 'margin-top:8px;', html: 'Kelemahan paling sering: <b>' + weakest[0] + '</b> (' + weakest[1] + ' konten). Benahi ini dulu buat lompatan skor terbesar.' }));
    body.append(sum);
  }
  // ── perbandingan kompetitor: butuh data banding (dari tab Riset) dulu
  if (scored.length) {
    if (bench) { const bc = benchSummaryCard(scored, bench); if (bc) body.append(bc); }
    else {
      const nb = el('div', { class: 'card', style: 'margin-top:14px; border:1.5px dashed var(--pine);' });
      nb.append(el('div', { class: 'tiny', style: 'font-weight:700;', textContent: '⚔️ Mau tahu konten ini vs kompetitor?' }));
      nb.append(el('div', { class: 'hint', style: 'margin-top:4px;', textContent: 'Jalankan "🥊 Bandingkan dengan kompetitor" di tab Riset dulu. Setelah itu, tiap review di sini otomatis dikasih penjelasan "kamu vs kompetitor" — hook, CTA, hashtag, plus celah yang belum mereka garap.' }));
      nb.append(el('button', { class: 'primary', style: 'margin-top:10px;', textContent: '🔍 Ke tab Riset & bandingkan', onclick: () => openBrand(c.id, 'riset') }));
      body.append(nb);
    }
  }
  // daftar konten + skor (expand → detail reviewer + buka hasil)
  const list = el('div', { style: 'margin-top:14px;' });
  items.forEach(x => {
    const t = TYPES[x.h.type] || {};
    const box = el('details', { class: 'adv', style: 'margin-top:8px;' });
    box.dataset.hid = x.h.id;
    const badge = x.rev ? el('span', { class: 'badge ' + (x.rev.score >= 8 ? 'pine' : 'coral'), textContent: x.rev.score + '/10' }) : el('span', { class: 'badge', textContent: '—' });
    box.append(el('summary', { style: 'display:flex; align-items:center; gap:8px;' }, [
      el('span', { class: 'e', textContent: t.e || '📄' }),
      el('span', { style: 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' }, [el('b', { textContent: x.h.title || t.label || x.h.type }), el('small', { style: 'display:block; opacity:.7;', textContent: t.label || x.h.type })]),
      badge,
    ]));
    const inner = el('div', { style: 'padding-top:10px;' });
    if (x.rev) inner.append(reviewPanel(x.rev));
    else inner.append(el('div', { class: 'hint', textContent: 'Jenis "' + (t.label || x.h.type) + '" nggak dinilai per-item (ini rencana mingguan).' }));
    if (x.rev && bench) { const bp = benchItemPanel(x.rev.metrics, bench); if (bp) inner.append(bp); } // ⚔️ kamu vs kompetitor
    inner.append(el('button', { style: 'margin-top:10px;', textContent: '↗️ Buka hasil lengkap', onclick: () => openHistResult(c, x.h) }));
    box.append(inner);
    list.append(box);
  });
  body.append(list);
  // fokus ke 1 item bila dipanggil dari riwayat Bikin Konten (buka + scroll + highlight)
  if (reviewFocusId) {
    const target = reviewFocusId; reviewFocusId = null;
    setTimeout(() => {
      const d = list.querySelector('details[data-hid="' + target + '"]');
      if (!d) return;
      d.open = true; d.classList.add('flash');
      d.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => d.classList.remove('flash'), 1600);
    }, 70);
  }
}

/* ── TAB: BIKIN KONTEN ── */
function renderBikin(body, c) {
  // Alur baru (rewrite): 1 tombol Create Content → 30 konten siap pilih
  // (15 script Edukasi + 15 script Ads), masing-masing lengkap dengan caption + hashtag.
  // Hybrid: pakai Claude kalau API key diisi (dipoles saat detail dibuka), else mesin offline.
  pickedTypes = ['paket']; pickedType = 'paket';
  const intro = el('div', { class: 'card', style: 'display:flex; align-items:flex-start; gap:14px;' }, [
    el('span', { style: 'background:var(--pine-soft); color:var(--pine); width:44px; height:44px; border-radius:11px; display:inline-flex; align-items:center; justify-content:center; flex:none;', html: svgIcon('bolt', 22) }),
    el('div', {}, [
      el('b', { style: 'font-size:15.5px;', textContent: 'Create Content' }),
      el('div', { class: 'tiny', style: 'margin-top:2px;', textContent: 'Sekali klik → 30 konten siap pilih: 15 script Edukasi + 15 script Ads (Meta/TikTok), masing-masing lengkap dengan caption + hashtag. Tinggal pilih yang paling pas.' }),
      el('div', { class: 'tiny', style: 'margin-top:6px; font-weight:600; color:' + (hasAI() ? 'var(--pine)' : 'var(--ink-3)') + ';', textContent: hasAI() ? ('Mode AI aktif (' + aiResolvedModel() + ') — detail yang kamu buka dipoles Claude.') : 'Mode offline — instan, tanpa API key. Isi API key di ⚙️ Setelan buat hasil AI.' }),
    ]),
  ]);
  body.append(intro);

  // opsi ringan (opsional): platform utama + fokus/catatan
  const form = el('div', { class: 'card' });
  const mkPills = (id, label, opts, defIdx) => {
    const wrap = el('div', { id: id + '_wrap' });
    wrap.append(el('label', { style: 'margin-top:0;', textContent: label }));
    const pills = el('div', { class: 'pills', id });
    opts.forEach((g, i) => {
      const p = el('button', { class: 'pill' + (i === defIdx ? ' on' : ''), textContent: g });
      p.dataset.v = g;
      p.onclick = e => { e.preventDefault(); pills.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); p.classList.add('on'); };
      pills.append(p);
    });
    wrap.append(pills);
    return wrap;
  };
  form.append(mkPills('g_platform', 'Platform utama', ['IG Reels', 'TikTok', 'IG Feed'], 0));
  form.append(el('label', { textContent: '📝 Fokus / catatan (opsional)' }));
  const notes = el('textarea', { id: 'g_notes', style: 'min-height:64px;', placeholder: 'contoh: fokus promo lebaran, sebutkan gratis ongkir, tone lebih santai…' });
  form.append(notes);
  form.append(el('div', { class: 'hint', textContent: 'Kosongin juga nggak apa — topik otomatis diambil dari profil brand & pilar kontenmu.' }));
  body.append(form);

  const goBar = el('div', { class: 'row', style: 'margin-top:18px;' });
  const goBtn = el('button', { class: 'primary big', id: 'btnCreate', textContent: '✨ Create Content — 30 konten siap pilih' });
  goBtn.onclick = () => generate30(c);
  goBar.append(goBtn);
  body.append(goBar);
  body.append(el('div', { class: 'tiny', style: 'margin-top:6px;', textContent: '15 Edukasi + 15 Ads, tiap kartu ada caption + hashtag. Klik "Buka & pilih" buat detail (dipoles AI kalau key aktif) + tersimpan ke riwayat.' }));
  body.append(el('div', { id: 'results' }));

  // riwayat generate (bisa dibuka ulang & dihapus)
  const histWrap = el('div', { id: 'histWrap', style: 'margin-top:28px;' });
  body.append(histWrap);
  renderHist(histWrap, c);
}
// kumpulkan brief hari ini dari form (topik, goal, platform, durasi, hook, catatan)
function collectDaily() {
  const pill = id => { const on = document.querySelector('#' + id + ' .pill.on'); return on ? on.dataset.v : ''; }; // ambil nilai pill yang aktif
  return {
    topic: ($('#g_topic') || {}).value || '',
    goal: pill('g_goal'), platform: pill('g_platform'),
    durasi: ($('#g_durasi_wrap') && $('#g_durasi_wrap').style.display !== 'none') ? pill('g_durasi') : '',
    hook: pickedHook || '',
    notes: (($('#g_notes') || {}).value || '').trim(),
  };
}
// naikkan seed per jenis konten (tombol "versi lain" → variasi terkontrol)
function bumpSeed(c, type) {
  const seeds = store.get('ce3_seed_' + c.id, {});
  seeds[type] = (seeds[type] || 0) + 1;
  store.set('ce3_seed_' + c.id, seeds);
  return seeds[type];
}
// simpan hasil ke riwayat brand (maks 30, terbaru di atas)
function pushHist(c, type, title, daily, seed) {
  const hist = store.get('ce3_hist_' + c.id, []);
  hist.unshift({ id: 'h' + Date.now() + '-' + Math.floor(Math.random() * 1000), type, title, daily, seed });
  store.set('ce3_hist_' + c.id, hist.slice(0, 30));
  const w = $('#histWrap'); if (w) renderHist(w, c);
}
function delHist(c, id) { store.set('ce3_hist_' + c.id, store.get('ce3_hist_' + c.id, []).filter(h => h.id !== id)); } // hapus 1 item riwayat
function clearHist(c) { store.del('ce3_hist_' + c.id); } // kosongkan riwayat brand
// render daftar riwayat hasil (buka ulang / hapus). Regen deterministik dari daily+seed
function renderHist(container, c) {
  container.innerHTML = '';
  const hist = store.get('ce3_hist_' + c.id, []);
  if (!hist.length) return;
  container.append(el('div', { class: 'row between' }, [
    el('div', { class: 'tiny', style: 'font-weight:700;', textContent: '🕐 Riwayat hasil (' + hist.length + ') — buka lagi, review, atau hapus' }),
    el('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' }, [
      el('button', { class: 'ghost', style: 'font-size:12.5px; padding:6px 10px; color:var(--pine); border-color:var(--pine);', textContent: '🎯 Review semua', title: 'Nilai semua hasil di tab Review Konten', onclick: () => openReview(c) }),
      el('button', { class: 'ghost', style: 'font-size:12.5px; padding:6px 10px;', textContent: '🗑️ Hapus semua', onclick: () => { if (!confirm('Hapus semua riwayat ' + c.name + '?')) return; clearHist(c); renderHist(container, c); toast('Riwayat dikosongkan'); } }),
    ]),
  ]));
  const list = el('div', { class: 'hist-list' });
  hist.forEach(h => {
    const t = TYPES[h.type] || {};
    list.append(el('div', { class: 'hist-item' }, [
      el('span', { class: 'e', textContent: t.e || '📄' }),
      el('div', { class: 't' }, [
        el('b', { textContent: h.title || t.label || h.type }),
        el('small', { textContent: (t.label || h.type) + (h.daily && h.daily.platform ? ' · ' + h.daily.platform : '') + (h.daily && h.daily.hook ? ' · hook: ' + h.daily.hook : '') }),
      ]),
      el('div', { class: 'acts' }, [
        el('button', { class: 'rev', textContent: '🎯 Review', title: 'Nilai konten ini di tab Review', onclick: () => openReview(c, h.id) }),
        el('button', { textContent: '↗️ Buka', onclick: () => {
          const data = TYPES[h.type].gen(c, h.daily, h.seed);
          $('#results').prepend(renderResult(h.type, data, c, h.daily, h.seed));
          const r = $('#results'); if (r) window.scrollTo({ top: r.offsetTop - 80, behavior: 'smooth' });
        } }),
        el('button', { class: 'del', textContent: '🗑️', title: 'Hapus dari riwayat', onclick: () => { delHist(c, h.id); renderHist(container, c); toast('Dihapus dari riwayat'); } }),
      ]),
    ]));
  });
  container.append(list);
}
// teks animasi "lagi masak" (mode lokal, biar terasa ada prosesnya)
const COOK_STEPS = ['Baca profil brand-mu…', 'Milih pola hook yang pas…', 'Nyusun struktur…', 'Nyocokin gaya bahasa…', 'Cek aturan aman…', 'Poles kalimat terakhir…'];
// generate konten: loop tipe (paket = 3 sekaligus) + animasi + render + simpan riwayat
async function doGenerate(c) {
  // kumpulkan semua jenis tercentang; 'paket' dibongkar jadi script+carousel+caption; buang duplikat
  const sel = (Array.isArray(pickedTypes) && pickedTypes.length) ? pickedTypes : [pickedType];
  const daily = collectDaily();
  const types = [...new Set(sel.flatMap(t => t === 'paket' ? ['script', 'carousel', 'caption'] : [t]))];
  if (daily.goal === 'Ads') types.push('ads'); // tujuan Ads → tambah materi iklan Meta/TikTok
  // ── validasi wajib: topik & referensi visual tidak boleh kosong ──
  if (!daily.topic) {
    toast('Topik wajib diisi dulu ya ✗', 'err');
    const t = $('#g_topic'); if (t) { t.focus(); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return;
  }
  if (getRefs(c).length < 1) {
    toast('Upload minimal 1 gambar referensi dulu ✗', 'err');
    const rw = $('#g_refs_wrap'); if (rw) rw.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = $('#btnGo'), results = $('#results');
  btn.disabled = true;
  try {
    for (const type of types) {
      const cookBox = el('div', { class: 'card result-card' });
      const stepEl = el('div', { class: 'cook-step' });
      cookBox.append(el('div', { class: 'cooking' }, [
        el('div', { class: 'orb', textContent: TYPES[type].e }),
        el('div', {}, [el('b', { textContent: 'Lagi nyusun ' + TYPES[type].label + '…' }), stepEl]),
      ]));
      results.prepend(cookBox);
      const seed = bumpSeed(c, type);
      let prod;
      if (hasAI()) {
        // AI: tampilkan status "nanya ke AI" sambil menunggu balasan
        stepEl.textContent = '🤖 Nanya ke AI (' + aiResolvedModel() + ')… bisa 5–15 detik';
        prod = await produce(c, type, daily, seed);
      } else {
        const cookSteps = pickN(mulberry('cook' + Date.now()), COOK_STEPS, 3);
        for (const s of cookSteps) { stepEl.textContent = s; await sleep(380); }
        prod = await produce(c, type, daily, seed);
      }
      const data = prod.data;
      cookBox.replaceWith(renderResult(type, data, c, daily, seed));
      pushHist(c, type, data.title || data.concept || TYPES[type].label, daily, seed);
      toast(TYPES[type].label + (prod.viaAI ? ' jadi (AI) ✨' : ' jadi ✨'));
    }
  } finally { btn.disabled = false; }
}

// ── OTOMASI: generate 10 varian script, nilai sendiri, peringkat otomatis → pilih terbaik tanpa input manusia ──
async function generate10(c) {
  const daily = collectDaily();
  if (!daily.topic) { toast('Topik wajib diisi dulu ya ✗', 'err'); const t = $('#g_topic'); if (t) { t.focus(); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
  if (getRefs(c).length < 1) { toast('Upload minimal 1 gambar referensi dulu ✗', 'err'); const rw = $('#g_refs_wrap'); if (rw) rw.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const btn = $('#btnAuto10'), results = $('#results');
  btn.disabled = true; const t0 = btn.textContent; btn.textContent = '⏳ nyusun 10…';
  const f = factsOf(c);
  try {
    const items = [];
    for (let i = 1; i <= 10; i++) {
      // seed deterministik 1..10 → hasil bisa direproduksi; hook diputar biar 10-nya variatif
      const hookId = daily.hook || HOOK_MENU[(i - 1) % HOOK_MENU.length][0];
      const dd = { ...daily, hook: hookId };
      const d = genScript(c, dd, i);
      const rev = reviewGenerated('script', d, f);
      const styleLabel = (HOOK_MENU.find(m => m[0] === hookId) || [])[1] || (d.hooks && d.hooks[0] ? d.hooks[0].pattern : 'Campur');
      const strong = rev && rev.checks.find(ch => ch.ok);      // kelebihan utama (kriteria pertama yang lolos)
      const gap = rev && rev.fixes && rev.fixes[0];             // PR utama (kriteria pertama yang belum)
      items.push({ i, seed: i, daily: dd, d, rev, score: rev ? rev.score : 0,
        hookText: (d.hooks && d.hooks[0] ? d.hooks[0].text : d.title),
        style: String(styleLabel).replace(/^[^A-Za-z]+/, '').trim(), // buang emoji/simbol depan label
        scenes: (d.scenes || []).length, dur: d.duration_sec,
        checks: rev ? rev.checks : [], passed: rev ? rev.passed : 0, total: rev ? rev.total : 5,
        strong: strong ? strong.label : null, gap: gap ? gap.label : null });
      await sleep(30);
    }
    // ranking otomatis: skor tertinggi → hook terkuat sebagai pemecah seri
    items.sort((a, b) => (b.score - a.score) || ((b.rev.metrics.hook || 0) - (a.rev.metrics.hook || 0)));
    results.prepend(renderCompare10(c, daily, items));
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('10 varian dinilai — #1 skor ' + items[0].score + ' ✓', 'ok');
  } finally { btn.disabled = false; btn.textContent = t0; }
}

/* ── CREATE CONTENT: 30 konten siap pilih (15 Edukasi + 15 Ads) + caption + hashtag ── */
// hook diputar biar 30-nya variatif; gaya edukasi vs jualan dipisah
const EDU_HOOKS = ['edukasi', 'mitos', 'listicle', 'question', 'number', 'mistake', 'secret', 'checklist', 'nobody', 'problem', 'stop', 'timesave', 'beforeafter', 'trend', 'relate'];
const ADS_HOOKS = ['jualan', 'harga', 'problem', 'beforeafter', 'vs', 'callout', 'timesave', 'secret', 'question', 'wish', 'confession', 'number', 'trend', 'mistake', 'stop'];
// kumpulan topik otomatis dari profil brand (promo + bank kategori)
function topicPool30(c) {
  const bank = bankOf(c);
  const pool = [];
  if (c.promo) pool.push(String(c.promo).slice(0, 60));
  (bank.topics || []).forEach(t => pool.push(t));
  const uniq = [...new Set(pool.filter(Boolean))];
  return uniq.length ? uniq : [c.product || 'produk kami'];
}
async function generate30(c) {
  const btn = $('#btnCreate'), results = $('#results');
  const on = document.querySelector('#g_platform .pill.on');
  const platform = on ? on.dataset.v : 'IG Reels';
  const notes = (($('#g_notes') || {}).value || '').trim();
  btn.disabled = true; const t0 = btn.textContent; btn.textContent = '⏳ nyusun 30 konten…';
  const f = factsOf(c);
  const pool = topicPool30(c);
  try {
    const edu = [], ads = [];
    for (let i = 0; i < 15; i++) {
      const topic = pool[i % pool.length];
      const hookId = EDU_HOOKS[i % EDU_HOOKS.length];
      const dd = { topic, goal: 'Edukasi', platform, durasi: '30 detik', hook: hookId, notes };
      const d = genScript(c, dd, i + 1);
      const cap = genCaption(c, dd, i + 1);
      const rev = reviewGenerated('script', d, f);
      edu.push({ kind: 'script', label: 'Edukasi', dd, seed: i + 1, d, cap,
        title: (d.hooks && d.hooks[0] ? d.hooks[0].text : d.title),
        caption: cap.caption_short, hashtags: cap.hashtags || [],
        score: rev ? rev.score : 0, checks: rev ? rev.checks : [],
        style: (HOOK_MENU.find(m => m[0] === hookId) || [null, hookId])[1] });
      if (i % 3 === 0) await sleep(8);
    }
    for (let i = 0; i < 15; i++) {
      const topic = pool[(i + 2) % pool.length];
      const hookId = ADS_HOOKS[i % ADS_HOOKS.length];
      const dd = { topic, goal: 'Ads', platform, hook: hookId, notes };
      const ad = genAds(c, dd, i + 1);
      ads.push({ kind: 'ads', label: 'Ads', dd, seed: i + 1, d: ad,
        title: ad.tiktok ? ad.tiktok.hook : ad.title,
        caption: ad.tiktok ? ad.tiktok.caption : ad.meta.primary_text,
        hashtags: ad.tiktok ? ad.tiktok.hashtags : [], score: null,
        style: (HOOK_MENU.find(m => m[0] === hookId) || [null, hookId])[1] });
      if (i % 3 === 0) await sleep(8);
    }
    edu.sort((a, b) => b.score - a.score); // edukasi diurut skor tertinggi
    results.prepend(renderPick30(c, edu, ads));
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('30 konten siap — tinggal pilih ✓', 'ok');
  } finally { btn.disabled = false; btn.textContent = t0; }
}
// satu kartu konten yang bisa dipilih
function pick30Card(c, it) {
  const tagStr = (it.hashtags || []).slice(0, 6).map(h => '#' + String(h).replace(/^#/, '')).join(' ');
  const style = it.style ? String(it.style).replace(/^[^A-Za-z]+/, '').trim() : '';
  const card = el('div', { class: 'card pick-card' });
  card.append(el('div', { class: 'row between', style: 'align-items:center;' }, [
    el('span', { class: 'pill-badge' + (it.label === 'Ads' ? ' ads' : ''), textContent: it.label + (style ? ' · ' + style : '') }),
    it.score != null ? el('span', { class: 'score-chip', textContent: it.score.toFixed(1) }) : el('span', { class: 'tiny', textContent: 'iklan' }),
  ]));
  card.append(el('div', { style: 'font-weight:700; margin:8px 0 4px; font-size:14.5px; line-height:1.4;', textContent: it.title }));
  card.append(el('div', { class: 'tiny', style: 'white-space:pre-wrap; color:var(--ink-2); max-height:76px; overflow:hidden;', textContent: it.caption }));
  if (tagStr) card.append(el('div', { class: 'tiny', style: 'margin-top:6px; color:var(--pine); word-break:break-word;', textContent: tagStr }));
  const acts = el('div', { class: 'row', style: 'gap:8px; margin-top:11px; flex-wrap:wrap;' });
  const openBtn = el('button', { textContent: '↗️ Buka & pilih' });
  openBtn.onclick = async () => {
    openBtn.disabled = true; const ot = openBtn.textContent; openBtn.textContent = hasAI() ? '🤖 …' : '…';
    try {
      const prod = await produce(c, it.kind, it.dd, it.seed);
      pushHist(c, it.kind, (prod.data.title || it.title), it.dd, it.seed); // simpan ke riwayat
      const style = it.style ? String(it.style).replace(/^[^A-Za-z]+/, '').trim() : '';
      const html = it.kind === 'ads'
        ? adsDocHTML(c, prod.data)
        : scriptDocHTML(c, prod.data, { style, score: it.score, checks: it.checks, caption: it.caption, hashtags: it.hashtags });
      openInTab(html); // buka di TAB BARU (halaman terpisah)
      toast('Dibuka di tab baru' + (prod.viaAI ? ' (AI) ✨' : ' ✓'), 'ok');
    } catch (e) { toast('Gagal buka: ' + String(e.message || e).slice(0, 40), 'err'); }
    finally { openBtn.disabled = false; openBtn.textContent = ot; }
  };
  acts.append(openBtn);
  const capBtn = el('button', { textContent: '📋 Salin caption' });
  capBtn.onclick = () => copyText(it.caption + (tagStr ? '\n\n' + tagStr : ''), 'Caption');
  acts.append(capBtn);
  card.append(acts);
  return card;
}
// grid 30 konten: 2 seksi (15 edukasi + 15 ads)
function renderPick30(c, edu, ads) {
  const wrap = el('div', { class: 'card', style: 'padding:18px;' });
  wrap.append(el('h2', { style: 'margin:0 0 4px; font-size:20px;', textContent: '30 konten siap pilih' }));
  wrap.append(el('div', { class: 'tiny', style: 'margin-bottom:14px;', textContent: 'Tiap kartu lengkap dengan caption + hashtag. Klik "Buka & pilih" buat lihat detail (dipoles AI kalau key aktif) sekaligus simpan ke riwayat.' }));
  const mkSec = (n, title, items) => {
    const sec = el('div', { style: 'margin-top:6px;' });
    sec.append(el('div', { class: 'step-label' }, [el('span', { class: 'n', textContent: String(n) }), title]));
    const grid = el('div', { class: 'pick-grid' });
    items.forEach(it => grid.append(pick30Card(c, it)));
    sec.append(grid);
    return sec;
  };
  wrap.append(mkSec(15, 'Script Edukasi (konten organik)', edu));
  const adsSec = mkSec(15, 'Script Ads (Meta / TikTok)', ads);
  adsSec.style.marginTop = '22px';
  wrap.append(adsSec);
  return wrap;
}
// buat halaman HTML mandiri buat 1 script → dibuka di TAB BARU (bisa banding side-by-side).
function scriptDocHTML(c, d, meta) {
  const rows = (d.scenes || []).map(s => '<tr><td class="tm">#' + s.scene + '<div class="s">' + (s.duration_sec || 0) + ' dtk</div></td><td><div><b>Visual</b> ' + esc(s.visual || '') + '</div><div><b>VO</b> ' + esc(s.voiceover || '') + '</div><div class="ost"><b>Teks layar</b> ' + esc(s.onscreen_text || '') + '</div></td></tr>').join('');
  const hooks = (d.hooks || []).map((h, i) => '<li>' + esc(h.text) + ' <span class="tag">' + esc(h.pattern || '') + '</span></li>').join('');
  const badge = meta && meta.style ? '<span class="tag blue">Gaya: ' + esc(meta.style) + '</span>' : '';
  const score = meta && meta.score != null ? '<span class="tag blue">Skor ' + meta.score.toFixed(1) + '/10</span>' : '';
  const breakdown = (meta && meta.checks && meta.checks.length)
    ? '<h2>Rincian skor</h2><div class="card"><table>' + meta.checks.map(ch => '<tr><td class="tm" style="width:30px;color:' + (ch.ok ? '#014bdf' : '#c6553a') + ';font-size:18px">' + (ch.ok ? '✓' : '✗') + '</td><td><b style="min-width:0;text-transform:none;font-size:14px;color:var(--ink)">' + esc(ch.label) + '</b>' + (ch.ok ? '' : '<div style="color:var(--ink3);font-size:12.5px;margin-top:2px">' + esc(ch.tip || '') + '</div>') + '</td></tr>').join('') + '</table></div>' : '';
  const tagLine = h => (h && h.length) ? '<div style="margin-top:10px;color:var(--pine);font-weight:600">' + esc(h.map(x => '#' + String(x).replace(/^#/, '')).join(' ')) + '</div>' : '';
  const captionBlock = (meta && meta.caption) ? '<h2>Caption + hashtag</h2><div class="card" style="padding:14px 16px"><div style="white-space:pre-wrap">' + esc(meta.caption) + '</div>' + tagLine(meta.hashtags) + '</div>' : '';
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(d.title || 'Script') + ' — ' + esc(c.name) + '</title><style>' +
    ':root{--pine:#014bdf;--ink:#14181f;--ink2:#5a626f;--ink3:#8b94a1;--line:#eaecef;--soft:#e8eefd;--bg:#fbfbfa}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 Inter,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}' +
    '.wrap{max-width:760px;margin:0 auto;padding:36px 20px 80px}h1{font-size:26px;letter-spacing:-.02em;margin:0 0 4px}' +
    '.sub{color:var(--ink2);font-size:13.5px;margin-bottom:14px}.tag{display:inline-block;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:#eef0f3;color:var(--ink2);margin:0 4px 4px 0}' +
    '.tag.blue{background:var(--soft);color:var(--pine)}h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin:26px 0 8px}' +
    'ol{margin:0;padding-left:20px}ol li{margin:6px 0}.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:2px 16px}' +
    'table{border-collapse:collapse;width:100%;font-size:14px}td{border-bottom:1px solid var(--line);padding:12px 6px;vertical-align:top}tr:last-child td{border-bottom:none}' +
    '.tm{width:64px;font-weight:700;color:var(--pine)}.tm .s{font-size:11px;color:var(--ink3);font-weight:500}td b{display:inline-block;min-width:78px;color:var(--ink3);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em}' +
    '.ost{margin-top:2px}.cta{margin-top:20px;background:var(--soft);border-radius:12px;padding:14px 16px;font-weight:600}.foot{margin-top:22px;color:var(--ink3);font-size:12.5px}' +
    '.bar{position:sticky;top:0;background:rgba(251,251,250,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:10px;align-items:center;font-size:13px}' +
    '.bar b{font-weight:800;letter-spacing:-.02em}button{font:600 13px Inter,sans-serif;border:1px solid var(--pine);background:var(--pine);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer}@media print{.bar{display:none}}' +
    '</style></head><body><div class="bar"><b>' + esc(c.name) + '</b><span style="color:var(--ink3)">· Script</span><span style="flex:1"></span><button onclick="print()">Simpan / Print PDF</button></div>' +
    '<div class="wrap"><h1>' + esc(d.title || 'Script Video') + '</h1><div class="sub">' + esc(d.platform || '') + ' · ±' + (d.duration_sec || 0) + ' detik</div>' +
    '<div>' + badge + score + '</div>' +
    '<h2>Pilihan hook</h2><div class="card"><ol>' + hooks + '</ol></div>' +
    '<h2>Adegan</h2><div class="card"><table>' + rows + '</table></div>' +
    '<div class="cta">CTA — ' + esc(d.cta || '') + '</div>' +
    captionBlock +
    breakdown +
    (d.sound_suggestion ? '<div class="foot">Sound: ' + esc(d.sound_suggestion) + '</div>' : '') +
    '<div class="foot">Dibuat oleh Content Engine · gaya ' + esc(c.name) + ' · privat di browser kamu.</div></div></body></html>';
}
// buka HTML di tab baru via blob URL (jalan offline / file://)
function openInTab(html) {
  try {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    if (!w) { toast('Tab diblokir browser — izinkan popup buat buka di tab baru', 'err'); URL.revokeObjectURL(url); return; }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast('Gagal buka tab: ' + String(e.message || e).slice(0, 40), 'err'); }
}
// halaman HTML mandiri buat 1 materi iklan (Meta + TikTok) → dibuka di TAB BARU.
function adsDocHTML(c, ad) {
  const m = ad.meta || {}, tt = ad.tiktok || {};
  const tags = (tt.hashtags && tt.hashtags.length) ? '<div style="margin-top:10px;color:var(--pine);font-weight:600">' + esc((tt.hashtags).map(x => '#' + String(x).replace(/^#/, '')).join(' ')) + '</div>' : '';
  const ttScript = (tt.script || []).map(s => '<li>' + esc(s) + '</li>').join('');
  const row = (label, val) => val ? '<tr><td>' + esc(label) + '</td><td>' + esc(val) + '</td></tr>' : '';
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(ad.title || 'Iklan') + ' — ' + esc(c.name) + '</title><style>' +
    ':root{--pine:#014bdf;--ink:#14181f;--ink2:#5a626f;--ink3:#8b94a1;--line:#eaecef;--soft:#e8eefd;--bg:#fbfbfa}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 Inter,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}' +
    '.wrap{max-width:760px;margin:0 auto;padding:36px 20px 80px}h1{font-size:26px;letter-spacing:-.02em;margin:0 0 4px}' +
    '.sub{color:var(--ink2);font-size:13.5px;margin-bottom:14px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin:26px 0 8px}' +
    '.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:4px}' +
    'ol{margin:0;padding-left:20px}ol li{margin:6px 0}table{border-collapse:collapse;width:100%;font-size:14px}td{border-bottom:1px solid var(--line);padding:10px 6px;vertical-align:top}tr:last-child td{border-bottom:none}td:first-child{width:150px;color:var(--ink3);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em}' +
    '.tag{display:inline-block;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--soft);color:var(--pine);margin:0 4px 4px 0}.foot{margin-top:22px;color:var(--ink3);font-size:12.5px}' +
    '.bar{position:sticky;top:0;background:rgba(251,251,250,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:10px;align-items:center;font-size:13px}' +
    '.bar b{font-weight:800;letter-spacing:-.02em}button{font:600 13px Inter,sans-serif;border:1px solid var(--pine);background:var(--pine);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer}@media print{.bar{display:none}}' +
    '</style></head><body><div class="bar"><b>' + esc(c.name) + '</b><span style="color:var(--ink3)">· Iklan Meta / TikTok</span><span style="flex:1"></span><button onclick="print()">Simpan / Print PDF</button></div>' +
    '<div class="wrap"><h1>' + esc(ad.title || 'Materi Iklan') + '</h1><div class="sub">Meta Ads + TikTok Ads · siap pasang</div>' +
    '<h2>Meta Ads</h2><div class="card"><table>' +
    row('Primary text', m.primary_text) + row('Headline', m.headline) + row('Description', m.description) + row('Tombol CTA', m.cta_button) + row('Format', m.format) +
    '</table></div>' +
    '<h2>TikTok Ads</h2><div class="card"><div style="margin-bottom:6px"><span class="tag">Hook</span> ' + esc(tt.hook || '') + '</div><ol>' + ttScript + '</ol></div>' +
    '<h2>Caption + hashtag</h2><div class="card"><div style="white-space:pre-wrap">' + esc(tt.caption || '') + '</div>' + tags + '</div>' +
    (ad.audience ? '<h2>Target audiens</h2><div class="card">' + esc(ad.audience) + '</div>' : '') +
    (ad.budget_hint ? '<h2>Saran budget</h2><div class="card">' + esc(ad.budget_hint) + '</div>' : '') +
    '<div class="foot">Dibuat oleh Content Engine · gaya ' + esc(c.name) + ' · privat di browser kamu.</div></div></body></html>';
}
// kartu perbandingan 10 script: tiap varian dibedakan lewat GAYA HOOK + skor + kelebihan/PR.
// buka satu varian sebagai "aktif" biar gampang dibandingin (radio, bukan 10 sekaligus).
function renderCompare10(c, daily, items) {
  const card = resultShell('script', '10 Script — auto-diperingkat', 'tanpa input manusia');
  card.append(el('div', { class: 'hint', style: 'margin:-4px 0 12px;', html: 'Bedanya di <b>gaya hook</b> tiap varian (pembuka beda-beda: pertanyaan, angka kejut, problem, dst). Tombol <b>Buka</b> membuka script di <b>tab baru</b> — bisa banding 2–3 tab sekaligus. Susah pilih? Ambil <b>#1</b>.' }));
  card.append(el('div', { style: 'background:var(--bg-2); border:1px solid var(--line); border-radius:10px; padding:11px 14px; margin-bottom:14px;' }, [
    el('div', { class: 'tiny', style: 'font-weight:700; margin-bottom:4px;', textContent: 'Skornya dari mana? — 5 kriteria, tiap lolos = 2 poin (maks 10)' }),
    el('div', { class: 'tiny', style: 'line-height:1.6;', html: '① <b>Hook 3 detik kuat</b> (pembuka nge-hit di ≤3 dtk) · ② <b>Pattern interrupt</b> (ganti visual/angle tiap 5–8 dtk) · ③ <b>Alur lengkap</b> (hook→isi→bukti→CTA) · ④ <b>Tepat 1 CTA</b> · ⑤ <b>Pacing sehat</b> (tiap beat ≤10 dtk, total ≤60 dtk). Klik <b>“Rincian skor”</b> di tiap varian buat lihat mana yang lolos/kurang.' }),
  ]));
  const best = items[0];
  // buka script di TAB BARU (halaman terpisah). save=true → simpan juga ke riwayat brand.
  const openScript = (it, save) => { if (save) pushHist(c, 'script', it.d.title || 'Script', it.daily, it.seed); openInTab(scriptDocHTML(c, it.d, { style: it.style, score: it.score, checks: it.checks })); };
  const tierColor = s => s >= 7.5 ? 'var(--pine)' : (s < 5 ? 'var(--coral)' : 'var(--gold)');
  // rincian skor: 5 kriteria ✓/✗ (kenapa skornya segitu)
  const scoreBreakdown = it => {
    const d0 = el('details', { class: 'adv', style: 'margin-top:7px;' });
    d0.append(el('summary', { style: 'font-size:12.5px;', textContent: 'Rincian skor (' + it.passed + '/' + it.total + ' kriteria lolos)' }));
    const ul = el('ul', { class: 'clean', style: 'margin-top:6px;' });
    (it.checks || []).forEach(ch => {
      ul.append(el('li', { style: 'padding:5px 0 5px 26px; border-bottom:1px solid var(--line); font-size:13px;' }, [
        el('span', { style: 'position:absolute; left:2px; top:6px; color:' + (ch.ok ? 'var(--pine)' : 'var(--coral)') + ';', html: svgIcon(ch.ok ? 'check' : 'x', 15) }),
        el('span', { style: 'color:' + (ch.ok ? 'var(--ink)' : 'var(--ink-2)') + ';', textContent: ch.label }),
        ch.ok ? null : el('div', { class: 'tiny', style: 'margin-top:2px;', textContent: '→ ' + ch.tip }),
      ].filter(Boolean)));
    });
    d0.append(ul);
    return d0;
  };
  // ── pemenang: kartu highlight ──
  const win = el('div', { style: 'border:1.5px solid var(--pine); background:var(--pine-soft); border-radius:12px; padding:14px 16px; margin-bottom:14px;' }, [
    el('div', { class: 'row between', style: 'align-items:center; gap:10px;' }, [
      el('div', { class: 'row', style: 'gap:8px; align-items:center;' }, [
        el('span', { class: 'badge pine', textContent: '🏆 #1 terbaik' }),
        el('span', { style: 'font-weight:700; font-size:14px;', textContent: 'Gaya: ' + best.style }),
        el('span', { class: 'tiny', textContent: 'skor ' + best.score.toFixed(1) + '/10 · ' + best.scenes + ' adegan · ' + best.dur + ' dtk' }),
      ]),
      el('button', { class: 'primary', style: 'font-size:13px; padding:8px 14px; white-space:nowrap;', textContent: '📄 Pakai #1 (tab baru)', title: 'Buka #1 di tab baru + simpan ke riwayat', onclick: () => openScript(best, true) }),
    ]),
    el('div', { style: 'margin-top:8px; font-size:14.5px; line-height:1.5;', textContent: '“' + best.hookText + '”' }),
    best.strong ? el('div', { class: 'tiny', style: 'margin-top:6px; color:var(--pine); font-weight:600;', textContent: '✓ Unggul: ' + best.strong }) : null,
    scoreBreakdown(best),
  ].filter(Boolean));
  card.append(win);
  // ── daftar 10 varian: tiap baris = gaya hook + skor bar + kelebihan/PR + buka ──
  card.append(el('div', { class: 'tiny', style: 'font-weight:700; margin-bottom:8px;', textContent: 'Bandingkan 10 varian (urut dari skor tertinggi):' }));
  const list = el('div', { style: 'display:flex; flex-direction:column; gap:8px;' });
  items.forEach((it, rank) => {
    const row = el('div', { style: 'border:1px solid var(--line); border-radius:12px; padding:12px 14px; background:var(--card);' + (rank === 0 ? ' border-color:var(--pine);' : '') });
    row.append(el('div', { class: 'row between', style: 'align-items:flex-start; gap:12px;' }, [
      el('div', { style: 'min-width:0; flex:1;' }, [
        el('div', { class: 'row', style: 'gap:8px; align-items:center; flex-wrap:wrap;' }, [
          el('span', { style: 'font-weight:800; font-size:15px; color:var(--ink-3);', textContent: '#' + (rank + 1) }),
          el('span', { class: 'badge', style: 'background:var(--pine-soft); color:var(--pine);', textContent: it.style }),
          el('span', { class: 'tiny', textContent: it.scenes + ' adegan · ' + it.dur + ' dtk' }),
        ]),
        el('div', { style: 'margin-top:7px; font-size:14px; line-height:1.5;', textContent: '“' + it.hookText + '”' }),
        el('div', { class: 'tiny', style: 'margin-top:5px;', html: (it.strong ? '<span style="color:var(--pine); font-weight:600;">✓ ' + it.strong + '</span>' : '') + (it.gap ? '  ·  <span style="color:var(--gold); font-weight:600;">PR: ' + it.gap + '</span>' : '') }),
      ]),
      el('div', { style: 'text-align:right; flex:none; width:100px;' }, [
        el('div', { style: 'font-weight:800; font-size:20px; color:' + tierColor(it.score) + ';', textContent: it.score.toFixed(1) }),
        el('div', { class: 'meter', style: 'height:6px; margin:4px 0 8px;' }, el('i', { style: 'width:' + Math.round(it.score * 10) + '%; background:' + tierColor(it.score) + ';' })),
        el('button', { style: 'font-size:12.5px; padding:6px 14px; width:100%;', textContent: '↗ Buka tab', title: 'Buka script ini di tab baru', onclick: () => openScript(it) }),
      ]),
    ]));
    row.append(scoreBreakdown(it)); // rincian skor dari mana saja (5 kriteria ✓/✗)
    list.append(row);
  });
  card.append(list);
  // export semua 10 (teks / PDF)
  card.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('button', { class: 'primary', textContent: '📋 Salin 10 script', onclick: () => copyText(items.map((it, r) => '#' + (r + 1) + ' · GAYA ' + it.style + ' · skor ' + it.score + '\n' + fmtScript(it.d)).join('\n\n──────────\n\n'), '10 script') }),
    el('button', { textContent: '⬇️ PDF 10 script', onclick: () => downloadDocPDF(slugTag(c.name) + '-10script', '10 Script diperingkat — ' + c.name, items.map((it, r) => '#' + (r + 1) + ' · GAYA ' + it.style.toUpperCase() + ' · SKOR ' + it.score + '/10\n' + fmtScript(it.d)).join('\n\n════════\n\n')) }),
  ]));
  card.append(learnBox('Cara milih cepat: (1) semua varian udah lolos aturan aman & 1-CTA, jadi aman semua. (2) Bedanya cuma <b>gaya pembuka</b> — pilih yang paling cocok sama karakter brand-mu. (3) Males mikir? Ambil #1. (4) Mau A/B test? Ambil 2 gaya beda (mis. “Pertanyaan” vs “Angka kejut”), posting dua-duanya, lihat mana yang nempel.'));
  return card;
}

/* ── FORMAT SALIN ── */
// format script jadi teks polos buat disalin
function fmtScript(d) {
  return ['🎬 SCRIPT ' + d.platform + ' · ±' + d.duration_sec + ' detik', '',
    'PILIHAN HOOK:', ...d.hooks.map((h, i) => (i + 1) + '. ' + h.text + '  [' + h.pattern + ']'), '',
    'ADEGAN:',
    ...d.scenes.map(s => `#${s.scene} (${s.duration_sec}s)\n  Visual: ${s.visual}\n  VO: ${s.voiceover}\n  Teks di layar: ${s.onscreen_text}`), '',
    'CTA: ' + d.cta, 'Sound: ' + d.sound_suggestion].join('\n');
}
// format carousel jadi teks polos buat disalin
function fmtCarousel(d) {
  return ['🎠 CAROUSEL: ' + d.title, '',
    ...d.slides.map(s => `SLIDE ${s.slide} [${s.role}]\n  ${s.headline}\n  ${s.subtext}\n  Visual: ${s.visual}`), '',
    'CAPTION:', d.caption, '', d.hashtags.join(' ')].join('\n');
}
// format caption jadi teks polos buat disalin
function fmtCaption(d) {
  return ['✍️ CAPTION UTAMA:', d.caption_long, '', '— CAPTION PENDEK:', d.caption_short, '',
    '— HOOK CADANGAN:', ...d.hooks.map((h, i) => (i + 1) + '. ' + h), '', d.hashtags.join(' ')].join('\n');
}
// format storyboard jadi teks polos buat disalin
function fmtStoryboard(d) {
  return ['🎥 STORYBOARD: ' + d.concept + ' · ±' + d.duration_sec + 's', '',
    ...d.shots.map(s => `SHOT ${s.shot} (${s.duration_sec}s)\n  Visual: ${s.visual}\n  Kamera: ${s.camera}\n  Talent/props: ${s.talent_props}\n  VO: ${s.voiceover}\n  Teks: ${s.onscreen_text}\n  Musik: ${s.sfx_music}`),
    '', 'B-ROLL: ' + d.broll.join(' · '), '', 'CATATAN: ' + d.production_notes].join('\n');
}
// format rencana seminggu jadi teks polos buat disalin
function fmtIdeas(d) {
  return ['🗓️ RENCANA SEMINGGU', '', ...d.ideas.map(i => `${i.day} · ${i.pillar} · ${i.format}\n  Hook: ${i.hook}\n  Konsep: ${i.concept}\n  CTA: ${i.cta}`)].join('\n\n');
}
// format iklan (Meta + TikTok) jadi teks polos buat disalin
function fmtAds(d) {
  return ['📣 IKLAN — ' + d.title, '',
    '═ META ADS ═',
    'Primary text: ' + d.meta.primary_text,
    'Headline: ' + d.meta.headline,
    'Description: ' + d.meta.description,
    'Tombol CTA: ' + d.meta.cta_button + '  |  Format: ' + d.meta.format, '',
    '═ TIKTOK ADS ═',
    'Hook: ' + d.tiktok.hook,
    ...d.tiktok.script.map(s => '  ' + s),
    'Caption: ' + d.tiktok.caption,
    'Hashtag: ' + d.tiktok.hashtags.map(h => '#' + h).join(' '),
    'Tombol CTA: ' + d.tiktok.cta_button, '',
    'Audiens: ' + d.audience,
    'Budget: ' + d.budget_hint].join('\n');
}
const FMT = { script: fmtScript, carousel: fmtCarousel, caption: fmtCaption, storyboard: fmtStoryboard, ideas: fmtIdeas, ads: fmtAds }; // registry formatter per jenis

/* ── RENDER HASIL ── */
// kerangka kartu hasil (ikon + judul + badge + tombol tutup)
function resultShell(type, title, badgeText) {
  const t = TYPES[type] || { e: '📄', label: type };
  const card = el('div', { class: 'card result-card' });
  const head = el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: t.e }),
    el('h3', { textContent: title || t.label }),
    badgeText ? el('span', { class: 'badge pine', textContent: badgeText }) : null,
    el('span', { class: 'spacer' }),
    el('button', { class: 'result-close', title: 'Tutup / hapus hasil ini dari layar', textContent: '✕', onclick: () => { card.remove(); toast('Hasil ditutup'); } }),
  ]);
  card.append(head);
  return card;
}
// baris tombol di bawah hasil: salin semua / PDF / versi lain
function actionsBar(type, data, c, daily) {
  const bar = el('div', { class: 'row', style: 'margin-top:16px;' });
  bar.append(el('button', { class: 'primary', textContent: '📋 Salin semua', onclick: () => copyText(FMT[type](data), TYPES[type].label) }));
  // ⬇️ PDF untuk semua jenis kecuali carousel; storyboard = PDF tabel, sisanya PDF teks
  if (type !== 'carousel') {
    const pdfName = slugTag(c.name) + '-' + type;
    const pdfTitle = (data.title || data.concept || TYPES[type].label) + ' — ' + c.name;
    bar.append(el('button', { textContent: '⬇️ PDF', onclick: () => type === 'storyboard' ? downloadStoryboardPDF(pdfName, pdfTitle, data) : type === 'ideas' ? downloadIdeasPDF(pdfName, pdfTitle, data) : downloadDocPDF(pdfName, pdfTitle, FMT[type](data)) }));
  }
  bar.append(el('button', { textContent: '🎲 Versi lain', onclick: async e => {
    const btn = e.target; const card0 = btn.closest('.result-card');
    btn.disabled = true; btn.textContent = hasAI() ? '🤖 minta AI…' : '🎲 …';
    const seed = bumpSeed(c, type);
    const prod = await produce(c, type, daily, seed);
    pushHist(c, type, prod.data.title || prod.data.concept || TYPES[type].label, daily, seed);
    card0.replaceWith(renderResult(type, prod.data, c, daily, seed));
    toast(prod.viaAI ? 'Versi baru (AI) 🎲' : 'Versi baru 🎲');
  } }));
  return bar;
}
const learnBox = note => el('div', { class: 'learn', html: '<b>💡 Biar makin jago:</b> ' + note }); // kotak catatan pembelajaran
const copyChip = (text, label) => el('span', { class: 'chip copy', textContent: '📋 salin', onclick: () => copyText(text, label) }); // chip kecil "salin"

// pilih renderer sesuai jenis hasil
function renderResult(type, data, c, daily, seed) {
  if (type === 'script') return renderScript(data, c, daily);
  if (type === 'carousel') return renderCarousel(data, c, daily);
  if (type === 'caption') return renderCaption(data, c, daily);
  if (type === 'storyboard') return renderStoryboard(data, c, daily);
  if (type === 'ideas') return renderIdeas(data, c, daily);
  if (type === 'ads') return renderAds(data, c, daily);
  return resultShell(type, 'Hmm, jenis ini belum ada');
}
// render hasil iklan: kolom Meta Ads + kolom TikTok Ads + audiens/budget
function renderAds(d, c, daily) {
  const card = resultShell('ads', d.title, 'Materi iklan');
  const field = (label, val, mono) => el('div', { style: 'margin-bottom:10px;' }, [
    el('div', { class: 'tiny', style: 'font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--ink-3); margin-bottom:3px;', textContent: label }),
    el('div', { style: 'font-size:14.5px; line-height:1.5;' + (mono ? '' : ''), textContent: val }),
    copyChip(val, label),
  ]);
  const grid = el('div', { class: 'grid-2' });
  // Meta
  const meta = el('div', { class: 'card', style: 'background:var(--bg-2);' });
  meta.append(el('div', { class: 'row between', style: 'margin-bottom:10px;' }, [el('b', { textContent: '📘 Meta Ads (FB/IG)' }), el('span', { class: 'badge pine', textContent: d.meta.format })]));
  meta.append(field('Primary text', d.meta.primary_text));
  meta.append(field('Headline', d.meta.headline));
  meta.append(field('Description', d.meta.description));
  meta.append(el('div', { class: 'tiny', style: 'margin-top:2px;', html: 'Tombol CTA: <b>' + d.meta.cta_button + '</b>' }));
  // TikTok
  const tt = el('div', { class: 'card', style: 'background:var(--bg-2);' });
  tt.append(el('div', { class: 'row between', style: 'margin-bottom:10px;' }, [el('b', { textContent: '🎵 TikTok Ads' }), el('span', { class: 'badge pine', textContent: 'Spark / In-feed' })]));
  tt.append(field('Hook (3 detik pertama)', d.tiktok.hook));
  const ul = el('ul', { class: 'clean num', style: 'margin-top:0;' }); d.tiktok.script.forEach(s => ul.append(el('li', { textContent: s }))); tt.append(ul);
  tt.append(field('Caption', d.tiktok.caption));
  tt.append(el('div', { class: 'tiny', style: 'margin-top:2px;', html: d.tiktok.hashtags.map(h => '#' + h).join(' ') + '  ·  Tombol: <b>' + d.tiktok.cta_button + '</b>' }));
  grid.append(meta, tt);
  card.append(grid);
  // audiens + budget
  card.append(el('div', { class: 'verdict', style: 'margin-top:14px;' }, [
    el('div', {}, [el('b', { textContent: '🎯 Saran audiens: ' }), document.createTextNode(d.audience)]),
    el('div', { style: 'margin-top:4px;' }, [el('b', { textContent: '💸 Budget & uji: ' }), document.createTextNode(d.budget_hint)]),
  ]));
  card.append(actionsBar('ads', d, c, daily));
  card.append(learnBox(d.learning_note));
  return card;
}
// render hasil script: 3 pilihan hook + timeline adegan berdurasi + chip + catatan
function renderScript(d, c, daily) {
  const card = resultShell('script', d.title, d.platform + ' · ±' + d.duration_sec + 's');
  card.append(el('div', { class: 'tiny', style: 'margin:-6px 0 12px;', textContent: 'Formula: ' + d.frame }));
  card.append(el('b', { textContent: 'Pilih 1 dari 3 hook ini buat detik 0–3 (jadi kalimat pembuka Adegan #1):' }));
  const hookWrap = el('div', { style: 'display:flex; flex-direction:column; gap:10px; margin:10px 0 4px;' });
  d.hooks.forEach(h => hookWrap.append(el('div', { class: 'hook-opt' }, [
    el('div', { class: 'row between' }, [el('span', { class: 'badge coral', textContent: h.pattern }), copyChip(h.text, 'Hook')]),
    el('b', { class: 'h', textContent: h.text }),
    el('div', { class: 'why', textContent: 'Kenapa works: ' + h.why }),
  ])));
  card.append(hookWrap);
  card.append(el('div', { class: 'divider' }));
  card.append(el('b', { textContent: 'Adegan (tinggal ikutin pas shoot):' }));
  const tl = el('div', { class: 'timeline' });
  let t0 = 0;
  const BEAT_EMO = { Hook: '🪝', Isi: '📌', Bukti: '✅', CTA: '📣' };
  d.scenes.forEach(s => {
    tl.append(el('div', { class: 'beat' }, [
      el('div', { class: 't' }, [
        el('div', { textContent: t0 + '–' + (t0 + s.duration_sec) + 's' }),
        s.role ? el('span', { class: 'badge ' + (s.role === 'CTA' ? 'coral' : 'pine'), style: 'margin-top:5px; font-size:10px;', textContent: (BEAT_EMO[s.role] || '') + ' ' + s.role }) : null,
      ]),
      el('div', {}, [
        el('div', { class: 'vis', html: '<b>🎥 Visual:</b> ' + s.visual }),
        el('div', { class: 'vo', textContent: '🗣️ ' + s.voiceover }),
        s.onscreen_text ? el('span', { class: 'ost', textContent: s.onscreen_text }) : null,
      ]),
    ]));
    t0 += s.duration_sec;
  });
  card.append(tl);
  card.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('span', { class: 'chip', textContent: '📣 CTA: ' + d.cta }),
    el('span', { class: 'chip', textContent: '🎵 ' + d.sound_suggestion.split('—')[0].trim() }),
    el('span', { class: 'chip', textContent: '🛡️ ' + d.compliance_notes.split(':')[0] }),
  ]));
  { const rv = reviewPanel(reviewGenerated('script', d, factsOf(c))); if (rv) card.append(rv); }
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('script', d, c, daily); if (ig) card.append(ig); }
  { const rr = userRefStrip(c); if (rr) card.append(rr); }
  card.append(actionsBar('script', d, c, daily));
  return card;
}
// render hasil carousel: preview HP + daftar slide + caption + hashtag
function renderCarousel(d, c, daily) {
  const card = resultShell('carousel', d.title, d.slides.length + ' slide');
  let idx = 0;
  const phone = el('div', { class: 'phone' });
  const dots = el('div', { class: 'car-dots' });
  const listWrap = el('div', { class: 'slide-list' });
  // tampilkan slide ke-i di preview HP (wrap-around) + sinkron dot & list
  function showSlide(i) {
    idx = (i + d.slides.length) % d.slides.length;
    const s = d.slides[idx];
    phone.innerHTML = '';
    phone.append(el('div', { class: 'slide-inner' }, [
      el('span', { class: 's-brand', textContent: '@' + slugTag(c.name) }),
      el('span', { class: 's-role', textContent: 'Slide ' + s.slide + ' · ' + s.role }),
      el('div', { class: 's-head', textContent: s.headline }),
      el('div', { class: 's-sub', textContent: s.subtext }),
      el('div', { class: 's-vis', textContent: '🎨 ' + s.visual }),
    ]));
    dots.innerHTML = '';
    d.slides.forEach((_, j) => dots.append(el('i', { class: j === idx ? 'on' : '' })));
    listWrap.querySelectorAll('.slide-row').forEach((r, j) => r.classList.toggle('on', j === idx));
  }
  d.slides.forEach((s, j) => {
    listWrap.append(el('div', { class: 'slide-row', onclick: () => showSlide(j) }, [
      el('span', { class: 'no', textContent: s.slide }),
      el('div', {}, [el('b', { textContent: s.headline }), el('span', { textContent: s.subtext.split('\n')[0] })]),
    ]));
  });
  const left = el('div', {}, [
    phone,
    el('div', { class: 'car-nav' }, [
      el('button', { textContent: '←', onclick: () => showSlide(idx - 1) }),
      dots,
      el('button', { textContent: '→', onclick: () => showSlide(idx + 1) }),
    ]),
  ]);
  // ── GAMBAR DULU: carousel = gambar AI (otomatis dari JSON). Butuh kunci OpenAI. ──
  if (hasImgAI()) {
    card.append(el('div', { class: 'tiny', style: 'margin:-4px 0 6px; color:var(--pine); font-weight:700;', textContent: '🎨 Gambar AI otomatis dibuat dari spec JSON carousel ini. Detail teks ada di "📝 Teks & caption tiap slide".' }));
    card.append(aiImagePanel('carousel', d, c, daily, d.slides.length, { auto: true }));
  } else {
    card.append(el('div', { class: 'learn', style: 'margin-top:4px;', html: '🎨 Carousel ini pakai <b>Gambar AI</b>. Aktifkan di ⚙️ (isi kunci OpenAI) → gambar tiap slide otomatis dibuat dari JSON. Sementara, judul & caption ada di bawah.' }));
  }
  { const rr = userRefStrip(c); if (rr) card.append(rr); }
  // detail teks tiap slide + caption (pendukung, bisa dibuka-tutup)
  const textWrap = el('div', { style: 'margin-top:6px;' });
  textWrap.append(el('div', { class: 'car-wrap' }, [left, listWrap]));
  showSlide(0);
  textWrap.append(el('div', { class: 'divider' }));
  textWrap.append(el('div', { class: 'row between' }, [el('b', { textContent: 'Alternatif judul cover:' })]));
  textWrap.append(el('div', { class: 'row', style: 'margin-top:8px;' }, d.cover_alternatives.map(cv => el('span', { class: 'chip copy', textContent: cv, onclick: () => copyText(cv, 'Judul cover') }))));
  textWrap.append(el('div', { class: 'row between', style: 'margin-top:16px;' }, [el('b', { textContent: 'Caption:' }), copyChip(d.caption + '\n\n' + d.hashtags.join(' '), 'Caption')]));
  textWrap.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption }));
  textWrap.append(el('div', { class: 'row', style: 'margin-top:10px;' },
    [...d.hashtags.map(h => el('span', { class: 'chip', textContent: h })), el('span', { class: 'chip copy', textContent: '📋 salin hashtag', onclick: () => copyText(d.hashtags.join(' '), 'Hashtag') })]));
  textWrap.append(learnBox(d.learning_note));
  card.append(el('details', { class: 'adv', style: 'margin-top:18px;' }, [el('summary', { textContent: '📝 Teks & caption tiap slide' }), textWrap]));
  { const rv = reviewPanel(reviewGenerated('carousel', d, factsOf(c))); if (rv) card.append(rv); }
  card.append(actionsBar('carousel', d, c, daily));
  return card;
}
// render hasil caption: versi panjang + pendek + 5 hook cadangan + hashtag
function renderCaption(d, c, daily) {
  const card = resultShell('caption', 'Caption + Hashtag', d.formula);
  card.append(el('div', { class: 'row between' }, [el('b', { textContent: 'Caption utama:' }), copyChip(d.caption_long + '\n\n' + d.hashtags.join(' '), 'Caption')]));
  card.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption_long }));
  card.append(el('div', { class: 'row between', style: 'margin-top:16px;' }, [el('b', { textContent: 'Versi pendek (story / TikTok):' }), copyChip(d.caption_short, 'Caption pendek')]));
  card.append(el('div', { class: 'copybox', style: 'margin-top:8px;', textContent: d.caption_short }));
  card.append(el('b', { style: 'display:block; margin-top:16px;', textContent: '5 hook cadangan (buat variasi post berikutnya):' }));
  const ul = el('ul', { class: 'clean num' });
  (d.hook_details || d.hooks.map(h => ({ text: h, pattern: '' }))).forEach(h => {
    const li = el('li', {}, [
      el('div', { class: 'row between' }, [
        el('span', { textContent: h.text }),
        el('span', { class: 'row', style: 'gap:6px;' }, [h.pattern ? el('span', { class: 'badge coral', textContent: h.pattern }) : null, copyChip(h.text, 'Hook')]),
      ]),
    ]);
    ul.append(li);
  });
  card.append(ul);
  card.append(el('div', { class: 'row', style: 'margin-top:12px;' },
    [...d.hashtags.map(h => el('span', { class: 'chip', textContent: h })), el('span', { class: 'chip copy', textContent: '📋 salin hashtag', onclick: () => copyText(d.hashtags.join(' '), 'Hashtag') })]));
  { const rv = reviewPanel(reviewGenerated('caption', d, factsOf(c))); if (rv) card.append(rv); }
  card.append(learnBox(d.learning_note));
  { const ig = igExtras('caption', d, c, daily); if (ig) card.append(ig); }
  { const rr = userRefStrip(c); if (rr) card.append(rr); }
  card.append(actionsBar('caption', d, c, daily));
  return card;
}
// render hasil storyboard: tabel shot (visual/kamera/VO/musik/durasi) + b-roll + catatan
function renderStoryboard(d, c, daily) {
  const card = resultShell('storyboard', d.concept, '±' + d.duration_sec + 's');
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['#', 'Visual & kamera', 'VO / teks di layar', 'Musik', 'Durasi'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  d.shots.forEach(s => tb.append(el('tr', {}, [
    el('td', { textContent: s.shot }),
    el('td', { html: s.visual + '<br/><span class="tiny">📷 ' + s.camera + ' · 🎭 ' + s.talent_props + '</span>' }),
    el('td', { html: s.voiceover + (s.onscreen_text ? '<br/><span class="tiny">💬 ' + s.onscreen_text + '</span>' : '') }),
    el('td', { class: 'tiny', textContent: s.sfx_music }),
    el('td', { textContent: s.duration_sec + 's' }),
  ])));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  card.append(el('b', { style: 'display:block; margin-top:16px;', textContent: 'Stok b-roll (rekam ekstra ini, kepakai terus):' }));
  card.append(el('div', { class: 'row', style: 'margin-top:8px;' }, d.broll.map(b => el('span', { class: 'chip', textContent: '🎞️ ' + b }))));
  card.append(el('div', { class: 'copybox', style: 'margin-top:14px;', textContent: '📝 ' + d.production_notes }));
  { const rv = reviewPanel(reviewGenerated('storyboard', d, factsOf(c))); if (rv) card.append(rv); }
  card.append(learnBox(d.learning_note));
  // storyboard tidak pakai generate image apa pun (mockup/gambar AI) — cukup tabel shot + b-roll
  { const rr = userRefStrip(c); if (rr) card.append(rr); }
  card.append(actionsBar('storyboard', d, c, daily));
  return card;
}
// render hasil ide seminggu: kartu per hari (pillar, hook, konsep, CTA)
function renderIdeas(d, c, daily) {
  const card = resultShell('ideas', 'Rencana konten seminggu', '80% memberi · 20% jualan');
  // tabel: satu baris per hari (Hari · Pilar · Format · Hook · Konsep · CTA)
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['Hari', 'Pilar', 'Format', 'Hook', 'Konsep', 'CTA'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  d.ideas.forEach(i => tb.append(el('tr', {}, [
    el('td', { html: '<b>' + i.day + '</b>' }),
    el('td', {}, el('span', { class: 'badge ' + (i.pillar === 'Promosi' ? 'coral' : 'pine'), textContent: i.pillar })),
    el('td', { class: 'tiny', textContent: i.format }),
    el('td', { html: '<b>' + i.hook + '</b>' }),
    el('td', { textContent: i.concept }),
    el('td', { class: 'tiny', textContent: '📣 ' + i.cta }),
  ])));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  card.append(learnBox(d.learning_note));
  card.append(actionsBar('ideas', d, c, daily));
  return card;
}

// format angka ringkas ala IG: 1.2rb, 34rb, 1,2jt
function fmtCount(n) { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',').replace(',0', '') + 'jt' : n >= 1000 ? (n / 1000).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',').replace(',0', '') + 'rb' : String(n); }
// ENGAGEMENT KOMPETITOR (isi manual dari angka publik IG mereka) → total view, ER, konten viral
// followers = jumlah follower; raw = tiap baris "like, komen, view" (view opsional)
function engagementFrom(folStr, raw) {
  const followers = parseInt(String(folStr || '').replace(/[^\d]/g, '')) || 0;
  const posts = String(raw || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const nums = l.split(/[,;\s]+/).map(x => parseInt(String(x).replace(/[^\d]/g, '')) || 0);
    return { likes: nums[0] || 0, comments: nums[1] || 0, views: nums[2] || 0 };
  }).filter(p => p.likes || p.comments || p.views);
  const eng = posts.map(p => p.likes + p.comments);
  const totalViews = posts.reduce((a, p) => a + p.views, 0);
  const totalLikes = posts.reduce((a, p) => a + p.likes, 0);
  const totalEng = eng.reduce((a, x) => a + x, 0);
  const avgEng = posts.length ? totalEng / posts.length : 0;
  const erAvg = followers ? avgEng / followers * 100 : 0; // engagement rate rata-rata (%)
  const sorted = [...eng].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
  const maxEng = eng.length ? Math.max(...eng) : 0;
  // viral = engagement ≥ 2× median akun itu sendiri (outlier) — patokan relatif per akun
  const rows = posts.map((p, i) => ({ i: i + 1, likes: p.likes, comments: p.comments, views: p.views, eng: eng[i], er: followers ? eng[i] / followers * 100 : 0, viral: median > 0 && eng[i] >= median * 2, best: eng[i] === maxEng && maxEng > 0 }));
  return { n: posts.length, followers, totalViews, totalLikes, avgEng, erAvg, median, rows, viralCount: rows.filter(r => r.viral).length };
}
// normalisasi data eng tersimpan ({followers,data,platform,agg}) → objek siap-render, atau null kalau kosong.
// dipakai buat nampilin engagement/viral/ER kompetitor & akun pribadi INLINE di perbandingan.
function engOf(eng) {
  if (!eng) return null;
  const plat = eng.platform || 'instagram';
  if ((plat === 'tiktok' || plat === 'youtube')) return eng.agg ? { platform: plat, agg: eng.agg } : null;
  const igRep = engagementFrom(eng.followers, eng.data);
  return igRep.n ? { platform: 'instagram', igRep } : null;
}
// ER (%) & jumlah konten viral dari objek engOf — buat baris adu di tabel perbandingan. null = data belum ada.
function engER(e) {
  if (!e) return null;
  if (e.igRep) return e.igRep.erAvg || null;
  if (e.agg && e.agg.engagementPct != null) return e.agg.engagementPct;
  return null;
}
function engViral(e) {
  if (!e) return null;
  if (e.igRep) return e.igRep.viralCount;
  if (e.agg && e.agg.posts) {
    const vv = e.agg.posts.filter(p => p.views != null).map(p => p.views);
    const s = [...vv].sort((a, b) => a - b), med = s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
    return vv.filter(v => med > 0 && v >= med * 2).length;
  }
  return null;
}
// render objek engOf jadi kartu engagement sesuai platform-nya
function renderEngOf(e, handle) {
  if (!e) return null;
  if (e.platform === 'tiktok') return renderTiktokAggregate(e.agg);
  if (e.platform === 'youtube') return renderYoutubeResult(e.agg);
  return renderEngagementResult(e.igRep, handle);
}
// render hasil engagement: kartu statistik + tabel per post + tanda viral/best
// KENAPA sebuah post IG viral + apa yang bisa ditiru — disimpulkan dari SINYAL ANGKA (bukan caption)
function viralWhyIG(r, rep) {
  const mult = rep.median ? (r.eng / rep.median).toFixed(1) : null;
  const why = [], learn = [];
  const clr = r.likes ? r.comments / r.likes : 0; // rasio komen : like
  const avgClr = rep.totalLikes ? (rep.rows.reduce((a, x) => a + x.comments, 0) / rep.totalLikes) : 0;
  if (r.comments && clr >= Math.max(0.03, avgClr * 1.4)) {
    why.push('komentarnya jauh di atas normal (' + Math.round(clr * 100) + '% dari like) — kontennya mancing percakapan');
    learn.push('Tiru pemicunya: buka dengan pertanyaan/opini yang bikin orang WAJIB komen.');
  }
  if (r.views && r.eng && r.views / Math.max(1, r.eng) >= 25) {
    why.push('views jauh di atas interaksi → gampang di-share (relatable / berguna buat disimpan)');
    learn.push('Angkat lagi sudut yang shareable: super relatable atau berguna buat di-save/kirim ke teman.');
  }
  if (!why.length) {
    why.push('like jauh di atas rata-rata akun → pesan & visual pembukanya nge-hit');
    learn.push('Pertahankan gaya hook/visual pembuka ini; bikin beberapa varian topik yang mirip.');
  }
  return { head: (mult ? mult + '× median akun — ' : '') + why.join('; '), learn: learn.join(' ') };
}
// KENAPA video YouTube viral + pelajaran — dari JUDUL + rasio views
function viralWhyYT(p, median) {
  const mult = median ? (p.views / median).toFixed(1) : null;
  const t = p.title || '', why = [], learn = [];
  if (/\d/.test(t)) { why.push('judul pakai angka spesifik (lebih clickable)'); learn.push('Pakai angka konkret di judul & hook.'); }
  if (/(challenge|tantangan|24 ?jam|24 ?hours|\bvs\b|nyoba|eksperimen|\btest\b|survive|stranded|terjebak|\bhari\b)/i.test(t)) { why.push('format tantangan/eksperimen → rasa penasaran tinggi'); learn.push('Bikin premis dengan "taruhan" yang jelas & bikin penasaran.'); }
  if (/(gratis|juta|miliar|rp ?\d|hadiah|giveaway|termahal|terbesar|terlama|\$)/i.test(t)) { why.push('angka/stakes besar bikin orang pengen nonton'); learn.push('Naikkan "taruhan" yang kelihatan jelas di thumbnail & judul.'); }
  if (!why.length) why.push('views jauh di atas rata-rata channel — hook & thumbnail-nya kuat');
  return { head: (mult ? mult + '× rata-rata channel — ' : '') + why.join('; '), learn: learn.join(' ') || 'Bedah 3 detik pertama & thumbnail-nya — di situ kuncinya.' };
}
function renderEngagementResult(rep, handle) {
  const wrap = el('div', { style: 'margin-top:12px;' });
  const hClean = String(handle || '').replace(/^@+/, '').trim();
  if (hClean) wrap.append(el('div', { class: 'eng-who' }, [
    el('b', { textContent: '📸 @' + hClean }),
    el('a', { class: 'chip golink', href: 'https://www.instagram.com/' + encodeURIComponent(hClean) + '/', target: '_blank', rel: 'noopener noreferrer', title: 'Buka profil IG-nya buat pastikan akun & angkanya benar', textContent: '↗ cek profil IG' }),
  ]));
  if (!rep.n) { wrap.append(el('div', { class: 'hint', textContent: 'Isi minimal 1 baris data postingan dulu (like, komen, view).' })); return wrap; }
  const stat = (label, val) => el('div', { class: 'estat' }, [el('div', { class: 'estat-v', textContent: val }), el('div', { class: 'estat-l', textContent: label })]);
  wrap.append(el('div', { class: 'estat-row' }, [
    stat('👁️ Total views', rep.totalViews ? fmtCount(rep.totalViews) : '—'),
    stat('❤️ Total likes', fmtCount(rep.totalLikes)),
    stat('📈 Engagement rate', rep.erAvg ? rep.erAvg.toFixed(2) + '%' : '—'),
    stat('🔥 Konten viral', String(rep.viralCount)),
  ]));
  if (!rep.followers) wrap.append(el('div', { class: 'hint', style: 'margin:6px 0;', textContent: 'Isi jumlah followers biar engagement rate-nya kehitung.' }));
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['#', '❤️ Like', '💬 Komen', '👁️ View', 'ER', 'Status'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  rep.rows.forEach(r => tb.append(el('tr', {}, [
    el('td', { textContent: r.i }),
    el('td', { textContent: fmtCount(r.likes) }),
    el('td', { textContent: fmtCount(r.comments) }),
    el('td', { textContent: r.views ? fmtCount(r.views) : '—' }),
    el('td', { textContent: rep.followers ? r.er.toFixed(2) + '%' : '—' }),
    el('td', { class: r.viral ? 'cmp-win' : '', textContent: r.viral ? '🔥 Viral' : (r.best ? '⭐ Terbaik' : '–') }),
  ])));
  tbl.append(tb);
  wrap.append(el('div', { class: 'tscroll' }, tbl));
  const erNote = rep.erAvg ? (rep.erAvg >= 3 ? 'ER ' + rep.erAvg.toFixed(2) + '% tergolong tinggi (patokan sehat 1–3%). Audiensnya aktif.' : rep.erAvg >= 1 ? 'ER ' + rep.erAvg.toFixed(2) + '% sehat (patokan 1–3%).' : 'ER ' + rep.erAvg.toFixed(2) + '% di bawah 1% — jangkauan besar tapi interaksi tipis, ada celah buatmu.') : '';
  const virals = rep.rows.filter(r => r.viral);
  const vbox = el('div', { class: 'verdict' });
  if (virals.length) {
    vbox.append(el('div', { class: 'viral-head' }, el('b', { textContent: '🔥 Kenapa ' + virals.length + ' konten ini viral & apa yang bisa ditiru' })));
    virals.forEach(r => {
      const ins = viralWhyIG(r, rep);
      vbox.append(el('div', { style: 'margin-top:7px;' }, [el('b', { textContent: 'Post #' + r.i + ' — ' }), document.createTextNode(ins.head)]));
      vbox.append(el('div', { class: 'tiny', style: 'margin-top:2px;', textContent: '💡 Pelajaran: ' + ins.learn }));
    });
    vbox.append(el('div', { class: 'tiny', style: 'margin-top:8px; opacity:.8;', textContent: 'Alasan disimpulkan dari pola angka (like/komen/views) vs median akun — buka postingannya buat konfirmasi sudut & hook-nya.' }));
  } else {
    vbox.append(el('div', {}, [el('b', { textContent: 'Belum ada konten viral' }), document.createTextNode(' — belum ada yang engagement-nya ≥ 2× median akun. Konsisten dulu; outlier-nya bakal kelihatan seiring waktu.')]));
  }
  if (erNote) vbox.append(el('div', { class: 'tiny', style: 'margin-top:6px;', textContent: erNote }));
  wrap.append(vbox);
  return wrap;
}
// kartu agregat TikTok (per-video tak tersedia dari scrape publik → tampilkan agregat + estimasi)
function renderTiktokAggregate(d) {
  const wrap = el('div', { style: 'margin-top:12px;' });
  const u = String(d.username || '').replace(/^@+/, '').trim();
  if (u) wrap.append(el('div', { class: 'eng-who' }, [
    el('b', { textContent: '🎵 @' + u }),
    el('a', { class: 'chip golink', href: 'https://www.tiktok.com/@' + encodeURIComponent(u), target: '_blank', rel: 'noopener noreferrer', title: 'Buka profil TikTok-nya buat pastikan akun & angkanya benar', textContent: '↗ cek profil TikTok' }),
  ]));
  const stat = (label, val) => el('div', { class: 'estat' }, [el('div', { class: 'estat-v', textContent: val }), el('div', { class: 'estat-l', textContent: label })]);
  wrap.append(el('div', { class: 'estat-row' }, [
    stat('👥 Followers', d.followers ? fmtCount(d.followers) : '—'),
    stat('❤️ Total likes', d.totalLikes ? fmtCount(d.totalLikes) : '—'),
    stat('🎬 Jumlah video', d.videoCount ? fmtCount(d.videoCount) : '—'),
    stat('📈 ER (estimasi)', d.engagementPct != null ? d.engagementPct + '%' : '—'),
  ]));
  wrap.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: (d.note || '') + ' Buat deteksi konten viral per-video, isi angka tiap video manual di bawah.' }));
  return wrap;
}
// kartu hasil YouTube: subscriber + total/avg views + tabel video (views per video; viral = ≥2× median)
function renderYoutubeResult(d) {
  const wrap = el('div', { style: 'margin-top:12px;' });
  const u = String(d.username || '').replace(/^@+/, '').trim();
  if (u || d.title) wrap.append(el('div', { class: 'eng-who' }, [
    el('b', { textContent: '▶️ ' + (d.title ? d.title + ' ' : '') + (u ? '@' + u : '') }),
    u ? el('a', { class: 'chip golink', href: 'https://www.youtube.com/@' + encodeURIComponent(u), target: '_blank', rel: 'noopener noreferrer', title: 'Buka channel-nya buat pastikan akun & angkanya benar', textContent: '↗ cek channel' }) : null,
  ]));
  const stat = (label, val) => el('div', { class: 'estat' }, [el('div', { class: 'estat-v', textContent: val }), el('div', { class: 'estat-l', textContent: label })]);
  const posts = (d.posts || []).filter(p => p.views != null);
  const views = posts.map(p => p.views);
  const sorted = [...views].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
  const maxV = views.length ? Math.max(...views) : 0;
  const viralCount = views.filter(v => median > 0 && v >= median * 2).length;
  wrap.append(el('div', { class: 'estat-row' }, [
    stat('👥 Subscriber', d.followers ? fmtCount(d.followers) : '—'),
    stat('👁️ Total views', d.totalViews ? fmtCount(d.totalViews) : '—'),
    stat('📊 Rata-rata views', d.avgViews ? fmtCount(d.avgViews) : '—'),
    stat('🔥 Video viral', String(viralCount)),
  ]));
  if (posts.length) {
    const tbl = el('table', { class: 't' });
    tbl.append(el('thead', {}, el('tr', {}, ['#', 'Judul', '👁️ Views', 'Status'].map(h => el('th', { textContent: h })))));
    const tb = el('tbody');
    posts.forEach((p, i) => {
      const viral = median > 0 && p.views >= median * 2, best = p.views === maxV && maxV > 0;
      tb.append(el('tr', {}, [
        el('td', { textContent: i + 1 }),
        el('td', {}, p.url ? el('a', { class: 'iglink', href: p.url, target: '_blank', rel: 'noopener', textContent: (p.title || 'video').slice(0, 54) }) : (p.title || 'video').slice(0, 54)),
        el('td', { textContent: fmtCount(p.views) }),
        el('td', { class: viral ? 'cmp-win' : '', textContent: viral ? '🔥 Viral' : (best ? '⭐ Terbaik' : '–') }),
      ]));
    });
    tbl.append(tb);
    wrap.append(el('div', { class: 'tscroll' }, tbl));
  }
  // kenapa video-video ini viral + apa yang bisa dipelajari (dari judul + rasio views)
  const virals = posts.filter(p => median > 0 && p.views >= median * 2);
  if (virals.length) {
    const vbox = el('div', { class: 'verdict' });
    vbox.append(el('div', { class: 'viral-head' }, el('b', { textContent: '🔥 Kenapa ' + virals.length + ' video ini viral & apa yang bisa ditiru' })));
    virals.forEach(p => {
      const ins = viralWhyYT(p, median);
      vbox.append(el('div', { style: 'margin-top:7px;' }, [el('b', { textContent: '“' + (p.title || 'video').slice(0, 46) + '” — ' }), document.createTextNode(ins.head)]));
      vbox.append(el('div', { class: 'tiny', style: 'margin-top:2px;', textContent: '💡 Pelajaran: ' + ins.learn }));
    });
    vbox.append(el('div', { class: 'tiny', style: 'margin-top:8px; opacity:.8;', textContent: 'Alasan disimpulkan dari judul & rasio views vs median channel — tonton videonya buat konfirmasi hook & thumbnail-nya.' }));
    wrap.append(vbox);
  }
  wrap.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: (d.note || '') + ' Viral = views ≥ 2× median channel.' }));
  return wrap;
}
/* ── TAB: POSTING (CROSS-POST) ── */
// Kirim 1 konten ke IG + FB + TikTok sekaligus lewat backend (API resmi Meta/TikTok).
function renderPosting(body, c) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🚀' }),
    el('h3', { textContent: 'Posting sekaligus (cross-post)' }),
  ]));
  card.append(el('p', { class: 'muted', style: 'margin:0 0 12px; font-size:14px;', html: 'Kirim <b>satu konten</b> ke <b>Instagram + Facebook + TikTok</b> sekali klik. Auto-publish beneran lewat API resmi — butuh <b>Backend Riset</b> (⚙️) jalan + token akun bisnis diisi. Belum ada token? Pakai <b>🧪 Simulasi</b> buat lihat alurnya.' }));

  // status backend + kredensial
  const cr = pubCreds();
  const credOk = { instagram: !!(cr.metaToken && cr.igUserId), facebook: !!(cr.metaToken && cr.fbPageId), tiktok: !!cr.tiktokToken };
  if (!hasRisetApi()) card.append(el('div', { class: 'hint', style: 'margin-bottom:10px;', html: '⚠️ Backend belum diset. Buka <b>⚙️ → Backend Riset</b> (klik 🔍 Deteksi server). Tanpa backend, cuma bisa 🧪 Simulasi.' }));

  // ── sumber konten: dari riwayat (regen caption) + caption editable ──
  card.append(el('label', { textContent: '1. Pilih konten dari riwayat (opsional)' }));
  const hist = store.get('ce3_hist_' + c.id, []);
  const sel = el('select');
  sel.append(el('option', { value: '', textContent: hist.length ? '— pilih hasil buatanmu —' : '(belum ada riwayat, tulis caption manual)' }));
  hist.forEach(h => sel.append(el('option', { value: h.id, textContent: (TYPES[h.type] ? TYPES[h.type].e + ' ' : '') + (h.title || (TYPES[h.type] && TYPES[h.type].label) || h.type) })));
  card.append(sel);

  card.append(el('label', { style: 'margin-top:12px;', textContent: '2. Caption' }));
  const cap = el('textarea', { style: 'min-height:130px;', placeholder: 'Tulis caption di sini, atau pilih dari riwayat di atas biar terisi otomatis…' });
  card.append(cap);
  const capHint = el('div', { class: 'tiny', style: 'margin-top:4px;' });
  const updCapHint = () => { capHint.textContent = cap.value.length + ' karakter' + (cap.value.length > 2200 ? ' — IG maksimal 2.200, bakal dipotong.' : ''); };
  cap.oninput = updCapHint; updCapHint();
  card.append(capHint);
  sel.onchange = () => { const h = hist.find(x => x.id === sel.value); if (h) { cap.value = captionFromHist(c, h) || cap.value; updCapHint(); toast('Caption diambil dari riwayat ✓', 'ok'); } };

  // ── media URL + tipe ──
  card.append(el('label', { style: 'margin-top:12px;', textContent: '3. URL media (wajib) — harus link publik' }));
  const media = el('input', { type: 'text', placeholder: 'https://…/gambar.jpg atau https://…/video.mp4' });
  card.append(media);
  card.append(el('div', { class: 'hint', html: 'API Meta & TikTok <b>menarik media dari URL publik</b>, bukan upload file. Taruh gambar/video di hosting yang bisa diakses (mis. hasil gambar AI yang sudah kamu unggah, Cloudinary, S3, dsb). <b>TikTok cuma menerima video (.mp4)</b>.' }));
  let mediaType = 'video';
  const typeRow = el('div', { class: 'pills', style: 'margin-top:8px;' });
  [['video', '🎬 Video (Reels/TikTok)'], ['image', '🖼️ Gambar (feed IG/FB)']].forEach(([v, label]) => {
    const b = el('button', { class: 'pill' + (mediaType === v ? ' on' : ''), textContent: label });
    b.onclick = e => { e.preventDefault(); mediaType = v; typeRow.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
    typeRow.append(b);
  });
  card.append(typeRow);

  // ── pilih platform ──
  card.append(el('label', { style: 'margin-top:14px;', textContent: '4. Kirim ke platform' }));
  const picked = { instagram: credOk.instagram, facebook: credOk.facebook, tiktok: credOk.tiktok };
  const platRow = el('div', { style: 'margin-top:6px;' });
  [['instagram', '📸 Instagram', 'metaToken + IG User ID'], ['facebook', '📘 Facebook Page', 'metaToken + Page ID'], ['tiktok', '🎵 TikTok', 'TikTok token']].forEach(([k, label, need]) => {
    const row = el('label', { class: 'checkrow', style: 'display:flex; align-items:center; gap:10px; margin:8px 0; cursor:pointer; flex-wrap:wrap;' });
    const cb = el('input', { type: 'checkbox', style: 'width:18px; height:18px; flex:0 0 auto; margin:0; accent-color:var(--pine,#4a7c59);' }); cb.checked = picked[k];
    cb.onchange = () => { picked[k] = cb.checked; };
    row.append(cb, el('span', { style: 'font-weight:600;', textContent: label }),
      el('span', { class: 'tiny', style: 'font-weight:400; color:' + (credOk[k] ? 'var(--pine,#4a7c59)' : '#b2664a') + ';', textContent: credOk[k] ? '✓ token siap' : '⚠ butuh ' + need + ' — atur di Setelan' }));
    platRow.append(row);
  });
  card.append(platRow);

  // ── tombol aksi ──
  const out = el('div');
  async function doPublish(dryRun) {
    const platforms = Object.keys(picked).filter(k => picked[k]);
    if (!platforms.length) return toast('Pilih minimal 1 platform', 'err');
    if (!cap.value.trim()) return toast('Caption masih kosong', 'err');
    if (!media.value.trim()) return toast('URL media wajib diisi', 'err');
    if (!dryRun && !hasRisetApi()) return toast('Backend belum diset (⚙️). Pakai 🧪 Simulasi dulu.', 'err');
    const payload = { platforms, caption: cap.value.trim(), mediaUrl: media.value.trim(), mediaType, creds: pubCreds(), dryRun };
    out.innerHTML = ''; out.append(el('div', { class: 'hint', textContent: (dryRun ? '🧪 Simulasi…' : '🚀 Mengirim…') }));
    try {
      const r = await crossPost(payload);
      out.innerHTML = ''; out.append(renderPublishResult(r));
      toast(dryRun ? 'Simulasi selesai — request valid ✓' : (r.okCount + '/' + r.total + ' platform terkirim'), r.okCount === r.total ? 'ok' : 'err');
    } catch (e) { out.innerHTML = ''; out.append(el('div', { class: 'hint', style: 'color:#b26;', textContent: '❌ ' + String(e.message || e) })); toast('Gagal: ' + String(e.message || e).slice(0, 60), 'err'); }
  }
  card.append(el('div', { class: 'row', style: 'margin-top:16px; gap:10px; flex-wrap:wrap;' }, [
    el('button', { class: 'primary', textContent: '🚀 Publish ke semua', onclick: () => doPublish(false) }),
    el('button', { textContent: '🧪 Simulasi (dry-run)', onclick: () => doPublish(true) }),
    el('button', { class: 'ghost', textContent: '⚙️ Isi token akun', onclick: openSettings }),
  ]));
  card.append(out);
  body.append(card);
}
// kartu hasil cross-post: status per platform (✓ terkirim / ✗ gagal / 🧪 simulasi)
function renderPublishResult(r) {
  const wrap = el('div', { class: 'card result-card', style: 'margin-top:14px;' });
  wrap.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: r.dryRun ? '🧪' : '📮' }),
    el('h3', { textContent: r.dryRun ? 'Hasil simulasi (belum benar-benar diposting)' : 'Hasil posting: ' + r.okCount + '/' + r.total + ' berhasil' }),
  ]));
  const NAMES = { instagram: '📸 Instagram', facebook: '📘 Facebook', tiktok: '🎵 TikTok' };
  (r.results || []).forEach(res => {
    const row = el('div', { style: 'margin-top:10px; padding:10px 12px; border-radius:10px; background:var(--card2,#f7f3ec);' });
    row.append(el('div', { style: 'font-weight:700;', html: (res.ok ? (res.dryRun ? '🧪 ' : '✅ ') : '❌ ') + (NAMES[res.platform] || res.platform) }));
    if (res.ok && res.url) row.append(el('div', { class: 'tiny', style: 'margin-top:3px;' }, el('a', { class: 'iglink', href: res.url, target: '_blank', rel: 'noopener', textContent: res.url })));
    if (res.ok && res.dryRun) row.append(el('div', { class: 'tiny', style: 'margin-top:3px; color:var(--muted,#777);', textContent: 'Request valid — tinggal isi token asli & klik Publish beneran.' }));
    if (!res.ok) row.append(el('div', { class: 'tiny', style: 'margin-top:3px; color:#b26;', textContent: res.error || 'gagal' }));
    wrap.append(row);
  });
  return wrap;
}

/* ── TAB: RISET & REVIEW ── */
// tab riset: review akun (checklist audit mandiri) + bandingkan kompetitor
function renderRiset(body, c) {
  const saved = store.get('ce3_riset_' + c.id, {}); // input riset dipersist per brand
  const persist = () => store.set('ce3_riset_' + c.id, saved);

  // ── review akun: cukup masukkan @handle → keluar checklist audit mandiri
  const revCard = el('div', { class: 'card' });
  const revHead = el('h3', { textContent: 'Review akun ' + (saved.handle || c.social || 'IG/TikTok-mu') });
  revCard.append(el('div', { class: 'result-head' }, [el('span', { class: 'e', textContent: '🩺' }), revHead]));

  revCard.append(el('label', { style: 'margin-top:0;', textContent: 'Akun yang mau direview' }));
  saved.rvPlatform = saved.rvPlatform === 'TikTok' ? 'TikTok' : 'Instagram';
  const phFor = p => '@akun_' + (p === 'TikTok' ? 'tiktok' : 'ig') + 'mu';
  const pfRow = el('div', { class: 'pills', style: 'margin-bottom:10px;' });
  const hIn = el('input', { type: 'text', placeholder: phFor(saved.rvPlatform), value: saved.handle || c.social || '' });
  ['Instagram', 'TikTok'].forEach(p => {
    const b = el('button', { class: 'pill' + (saved.rvPlatform === p ? ' on' : ''), textContent: (p === 'Instagram' ? '📸 ' : '🎵 ') + p });
    b.onclick = e => { e.preventDefault(); saved.rvPlatform = p; persist(); pfRow.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); b.classList.add('on'); if (!hIn.value.trim()) hIn.placeholder = phFor(p); };
    pfRow.append(b);
  });
  revCard.append(pfRow);
  hIn.oninput = () => { const v = hIn.value.trim(); saved.handle = v; persist(); if (v) { c.social = v; saveClient(c); } revHead.textContent = 'Review akun ' + (v || saved.rvPlatform); };
  revCard.append(hIn);
  revCard.append(el('div', { class: 'hint', style: 'margin-bottom:4px;', textContent: 'Cukup tulis @username-nya. Karena browser nggak bisa baca isi IG/TikTok, kami kasih checklist audit mandiri yang disesuaikan brand & platform-mu — kamu tinggal buka akunnya dan centang.' }));
  // gambar referensi akun kini menyatu di dalam Review Akun (screenshot feed/konten buat acuan audit)
  const revImgWrap = el('div', { style: 'margin-top:16px; padding-top:16px; border-top:1px dashed var(--line);' });
  renderRisetImgUploader(revImgWrap, c);
  revCard.append(revImgWrap);
  // caption akunmu (opsional) → ngisi kolom "kamu" di banding kompetitor pakai data asli
  const myWrap = el('div', { style: 'margin-top:16px; padding-top:16px; border-top:1px dashed var(--line);' });
  myWrap.append(el('label', { style: 'margin-top:0;', textContent: '✍️ Caption akunmu (opsional)' }));
  const myTa = el('textarea', { style: 'min-height:96px;', placeholder: 'Tempel 5–10 caption post-mu di sini (pisahkan dengan ---).\nKosongkan aja kalau belum — kolom "kamu" di banding kompetitor bakal diisi contoh konten ProdPilot.', value: saved.myPosts || '' });
  myTa.oninput = () => { saved.myPosts = myTa.value; persist(); };
  myWrap.append(myTa);
  myWrap.append(el('div', { class: 'hint', textContent: 'Dipakai buat ngisi kolom "kamu" di banding kompetitor dengan data akun aslimu. Kosong = otomatis pakai contoh konten ProdPilot sebagai target.' }));
  revCard.append(myWrap);
  const revOut = el('div');
  revCard.append(el('div', { class: 'row', style: 'margin-top:14px;' }, [
    el('button', { class: 'primary', textContent: '🩺 Audit akun sekarang', onclick: () => {
      const rep = auditChecklist(c, saved.handle || '', saved.rvPlatform);
      revOut.innerHTML = '';
      revOut.append(renderAudit(rep, c));
      revOut.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Checklist audit siap ✓', 'ok');
    } }),
    el('span', { class: 'tiny', textContent: 'gratis · instan · dinilai sendiri, privat di browser kamu' }),
  ]));
  body.append(revCard);
  body.append(revOut);

  // ── bandingkan kompetitor
  const cmpCard = el('div', { class: 'card', style: 'margin-top:18px;' });
  cmpCard.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🥊' }),
    el('h3', { textContent: 'Bandingkan dengan kompetitor' }),
  ]));
  cmpCard.append(el('p', { class: 'muted', style: 'margin:0 0 12px; font-size:14px;', html: 'Pilih <b>platform</b> di bawah, isi <b>@handle kompetitor aslimu</b> → kami tampilkan <b>preview asli</b> (feed IG / video YouTube / profil TikTok) + angka engagement + analisis pola. Belum tahu mau bandingin siapa? Klik <b>Analisis pola otomatis</b>.' }));
  cmpCard.append(el('div', { class: 'hint', style: 'margin-bottom:10px;', html: 'Preview & angka butuh <b>internet</b> + handle asli. Engagement TikTok/YouTube ditarik otomatis dari <b>Backend Riset</b> (⚙️) atau isi manual.' }));
  // ── PILIH PLATFORM: IG / TikTok / YouTube (satu switch buat seluruh perbandingan) ──
  saved.cmpPlatform = saved.cmpPlatform || 'instagram';
  const CMP_PLAT = { instagram: { icon: '📸', name: 'Instagram' }, tiktok: { icon: '🎵', name: 'TikTok' }, youtube: { icon: '▶️', name: 'YouTube' } };
  const platSel = el('div', { class: 'pills', style: 'margin:0 0 6px;' });
  function applyCmpPlatform(pl) {
    saved.cmpPlatform = pl;
    saved.comps.forEach(cp => { cp.eng = cp.eng || {}; cp.eng.platform = pl; }); // samain platform semua kompetitor
    persist();
    platSel.querySelectorAll('.pill').forEach(x => x.classList.toggle('on', x.dataset.pl === pl));
    if (btnCompare) btnCompare.textContent = CMP_PLAT[pl].icon + ' Bandingkan + preview ' + CMP_PLAT[pl].name;
    drawComps();
  }
  ['instagram', 'tiktok', 'youtube'].forEach(pl => {
    const b = el('button', { class: 'pill' + (saved.cmpPlatform === pl ? ' on' : ''), textContent: CMP_PLAT[pl].icon + ' ' + CMP_PLAT[pl].name });
    b.dataset.pl = pl; b.onclick = e => { e.preventDefault(); applyCmpPlatform(pl); };
    platSel.append(b);
  });
  cmpCard.append(el('label', { style: 'margin:0 0 4px;', textContent: 'Platform kompetitor' }));
  cmpCard.append(platSel);
  // container yang bisa di-refresh
  const searchWrap = el('div');
  const noteWrap = el('div');
  cmpCard.append(searchWrap);
  cmpCard.append(noteWrap);
  // ── CONNECT: kompetitor di Riset ↔ kolom Kompetitor di Profil Brand (comp1..comp6) ──
  const profileComps = () => compsOf(c);
  // tulis handle Riset → balik ke Profil Brand (competitors + comp1..comp6) biar selalu sinkron
  const syncToProfile = () => { setComps(c, saved.comps.map(x => x.handle || '')); saveClient(c); };
  // tambah 1 handle rekomendasi ke slot kompetitor (isi slot kosong dulu; anti-dobel; maks MAX_COMP)
  const addCompetitor = (handle, silent) => {
    const clean = String(handle || '').replace(/^@+/, '').trim();
    if (!clean) return false;
    saved.comps = saved.comps || [];
    if (saved.comps.some(x => (x.handle || '').replace(/^@+/, '').trim().toLowerCase() === clean.toLowerCase())) return false; // sudah ada
    const empty = saved.comps.find(x => !(x.handle || '').trim());
    if (empty) empty.handle = clean;
    else if (saved.comps.length < MAX_COMP) saved.comps.push({ handle: clean, raw: '' });
    else { if (!silent) toast('Slot kompetitor penuh (maks ' + MAX_COMP + ')', 'err'); return false; }
    syncToProfile(); persist();
    if (!silent) toast('+@' + clean + ' masuk kompetitor ✓', 'ok');
    return true;
  };
  // isi otomatis handle saran (akun asli, dicocokkan ke jasa/produk brand) — lalu tulis ke Profil
  const fillSuggested = () => { const s = suggestCompetitors(c); saved.comps = (s.length ? s : ['']).slice(0, MAX_COMP).map(h => ({ handle: h, raw: '' })); saved.suggestedApplied = true; syncToProfile(); persist(); return s; };
  // inisialisasi: PROFIL = sumber kebenaran handle (pertahankan caption utk handle sama). Kosong → auto-suggest (yang nulis balik ke profil)
  const prof = profileComps();
  if (prof.length) {
    const prev = {}; (saved.comps || []).forEach(x => { if (x.handle) prev[x.handle.replace(/^@/, '').toLowerCase()] = x.raw || ''; });
    saved.comps = prof.slice(0, MAX_COMP).map(h => ({ handle: h, raw: prev[h.replace(/^@/, '').toLowerCase()] || '' }));
    saved.suggestedApplied = true; persist();
  } else if (!Array.isArray(saved.comps) || !saved.comps.length || (!saved.suggestedApplied && !saved.comps.some(x => (x.handle || '').replace(/^@/, '').trim()))) {
    fillSuggested();
  }
  // render ulang panel pencarian + catatan saran
  function refreshSearchNote() {
    const s = suggestCompetitors(c);
    searchWrap.innerHTML = ''; searchWrap.append(renderIgSearchPanel(c, null, h => { const ok = addCompetitor(h); if (ok) { drawComps(); if (typeof drawRecos === 'function') drawRecos(); } return ok; }));
    noteWrap.innerHTML = ''; noteWrap.append(el('div', { class: 'hint', style: 'margin:2px 0;', html: s.length
      ? '✨ <b>Saran kompetitor dicocokkan ke jasa/produk brand-mu</b> (akun asli & terverifikasi) — sudah terisi di bawah. Ganti/hapus kalau kurang pas.'
      : '🔎 Belum ada akun yang pas. Pakai <b>chip pencarian</b> di atas → salin @handle pesaing aslinya ke kolom bawah.' }));
  }
  refreshSearchNote();
  // dipanggil tombol "Isi ulang saran": isi ulang saran + pencarian
  function regen() { fillSuggested(); drawComps(); if (typeof drawRecos === 'function') drawRecos(); refreshSearchNote(); toast('Saran kompetitor diisi ✓', 'ok'); }
  const compsWrap = el('div');
  // box engagement per kompetitor: input followers + data per-post → hitung total view/viral/ER
  function compEngagementBox(cp, mine) {
    cp.eng = cp.eng || { followers: '', data: '', platform: saved.cmpPlatform || 'instagram' };
    if (!cp.eng.platform) cp.eng.platform = saved.cmpPlatform || 'instagram';
    const box = el('details', { class: 'adv', style: 'margin-top:8px;' });
    if (mine) box.open = true; // akunku: langsung kebuka
    box.append(el('summary', { textContent: '📊 Total view · konten viral · engagement' }));
    const inner = el('div', { style: 'padding-top:10px;' });
    const out = el('div');
    // pilih platform IG / TikTok / YouTube
    const PLAT_LABEL = { instagram: '📸 Instagram', tiktok: '🎵 TikTok', youtube: '▶️ YouTube' };
    const platRow = el('div', { class: 'pills', style: 'margin-bottom:8px;' });
    ['instagram', 'tiktok', 'youtube'].forEach(pl => {
      const bb = el('button', { class: 'pill' + (cp.eng.platform === pl ? ' on' : ''), textContent: PLAT_LABEL[pl] });
      bb.onclick = e => { e.preventDefault(); cp.eng.platform = pl; persist(); platRow.querySelectorAll('.pill').forEach(x => x.classList.remove('on')); bb.classList.add('on'); };
      platRow.append(bb);
    });
    inner.append(platRow);
    // penegasan: kotak ini punya siapa (akunku vs kompetitor)
    inner.append(el('div', { class: 'tiny', style: 'margin-bottom:8px; color:var(--' + (mine ? 'gold' : 'pine') + ');', html: mine
      ? '✅ Ini <b>akunmu</b> — cek engagement-mu sendiri, lalu bandingin angkanya (ER, konten viral) sama kompetitor di bawah.'
      : '📌 Angka di kotak ini dari akun <b>kompetitor</b> ini (handle di atas) — <b>bukan akunmu</b>. Tiap kompetitor punya kotak sendiri, jadi yang keluar satu per kompetitor.' }));
    // baris tombol otomatis (kalau backend diset) + petunjuk
    inner.append(el('div', { class: 'tiny', style: 'margin-bottom:8px;', html: hasRisetApi()
      ? 'Klik <b>Ambil otomatis</b> → tarik followers & engagement langsung dari akun publik mereka. Atau isi manual di bawah.'
      : 'Buka akun mereka, lihat angka publiknya, isi di sini. Views buat Reels/TikTok; foto biasa kosongin. (Aktifkan <b>Ambil otomatis</b> dengan set Backend Riset di ⚙️.)' }));
    const fol = el('input', { type: 'text', inputmode: 'numeric', placeholder: 'Jumlah followers (mis. 47900)', value: cp.eng.followers || '', style: 'margin-bottom:8px;' });
    fol.oninput = () => { cp.eng.followers = fol.value; persist(); };
    const ta = el('textarea', { style: 'min-height:96px;', placeholder: 'Satu baris per postingan: like, komen, view\nContoh:\n1200, 45, 30000\n980, 30, 15000\n5400, 210, 120000', value: cp.eng.data || '' });
    ta.oninput = () => { cp.eng.data = ta.value; persist(); };
    const compute = () => { out.innerHTML = ''; out.append(renderEngagementResult(engagementFrom(cp.eng.followers, cp.eng.data), (cp.handle || 'akun').replace(/^@?/, '@'))); };
    const btn = el('button', { class: 'primary', style: 'margin-top:8px;', textContent: '📊 Hitung engagement', onclick: compute });
    // tarik otomatis dari backend (IG per-post; TikTok agregat)
    const auto = el('button', { style: 'margin-top:8px;', textContent: '🔗 Ambil otomatis', onclick: async () => {
      auto.disabled = true; const t0 = auto.textContent; auto.textContent = '⏳ ambil…';
      try {
        const plat = cp.eng.platform || 'instagram';
        const d = await fetchCompetitorStats(cp.handle, plat);
        cp.eng.followers = String(d.followers || ''); fol.value = cp.eng.followers;
        if (plat === 'tiktok') { persist(); out.innerHTML = ''; out.append(renderTiktokAggregate(d)); toast('Data TikTok terambil ✓', 'ok'); }
        else if (plat === 'youtube') { persist(); out.innerHTML = ''; out.append(renderYoutubeResult(d)); toast('Data YouTube terambil ✓', 'ok'); }
        else {
          cp.eng.data = (d.posts || []).map(p => (p.likes || 0) + ',' + (p.comments || 0) + ',' + (p.views || 0)).join('\n');
          ta.value = cp.eng.data; persist();
          if ((d.posts || []).length) { compute(); toast('Data IG terambil ✓', 'ok'); }
          else { // IG cuma kasih followers (API diblok / akun privat) → panduan, bukan "isi 1 baris"
            const hh = (cp.handle || 'akun').replace(/^@+/, '').trim();
            out.innerHTML = '';
            out.append(el('div', { class: 'eng-who' }, [el('b', { textContent: '📸 @' + hh }), el('a', { class: 'chip golink', href: 'https://www.instagram.com/' + encodeURIComponent(hh) + '/', target: '_blank', rel: 'noopener noreferrer', textContent: '↗ cek profil IG' })]));
            out.append(el('div', { class: 'hint', style: 'color:var(--gold);', html: '✓ Followers <b>' + fmtCount(d.followers || 0) + '</b> keisi otomatis. ' + (d.note || 'Angka per-post IG nggak kebaca — isi like,komen,view per baris di bawah, lalu Hitung engagement.') }));
            toast('Followers terambil ✓ — per-post isi manual', 'ok');
          }
        }
      } catch (e) { toast('Gagal ambil data', 'err'); out.innerHTML = ''; out.append(el('div', { class: 'hint', style: 'color:var(--coral-dark, #b2664a);', textContent: '⚠️ ' + String(e.message || e) })); }
      auto.disabled = false; auto.textContent = t0;
    } });
    inner.append(fol, ta, el('div', { class: 'row', style: 'gap:8px;' }, [btn, auto]), out);
    box.append(inner);
    return box;
  }
  // gambar ulang daftar input kompetitor (handle + textarea caption)
  function drawComps() {
    compsWrap.innerHTML = '';
    saved.comps.forEach((cp, i) => {
      const box = el('div', { style: 'margin-top:14px;' });
      box.append(el('label', { textContent: 'Kompetitor ' + (i + 1) }));
      const h = el('input', { type: 'text', placeholder: '@handle_kompetitor_asli (buat preview IG)', value: cp.handle || '', style: 'margin-bottom:8px;' });
      h.oninput = () => { cp.handle = h.value; persist(); syncToProfile(); }; // sinkron ke Profil Brand
      box.append(h);
      box.append(compEngagementBox(cp)); // 📊 total view / viral / engagement (auto dari backend / isi manual)
      compsWrap.append(box);
    });
  }
  // ── panel rekomendasi kompetitor LINTAS PLATFORM (IG/TikTok/YouTube/web) ──
  const recoWrap = el('div');
  function drawRecos() {
    recoWrap.innerHTML = '';
    const picks = suggestCompetitors(c).slice(0, 4); // 4 akun asli, dicocokkan ke niche brand
    if (!picks.length) return; // niche jasa/lainnya → pool kosong; user pakai chip pencarian IG di atas
    const present = new Set((saved.comps || []).map(x => (x.handle || '').replace(/^@+/, '').trim().toLowerCase()).filter(Boolean));
    const card = el('div', { class: 'card', style: 'margin:12px 0; border:1.5px solid var(--pine); background:var(--pine-soft,#eef3ef);' });
    card.append(el('div', { class: 'row between', style: 'align-items:center; gap:8px; flex-wrap:wrap;' }, [
      el('b', { textContent: '✨ Rekomendasi kompetitor (lintas platform)' }),
      el('button', { class: 'primary', type: 'button', style: 'font-size:12.5px; padding:6px 10px;', textContent: '✨ Pakai 4-nya', onclick: () => {
        let n = 0; picks.forEach(h => { if (addCompetitor(h, true)) n++; });
        drawComps(); drawRecos();
        toast(n ? '+' + n + ' kompetitor rekomendasi masuk ✓' : 'Semua rekomendasi sudah dipakai', n ? 'ok' : 'err');
      } }),
    ]));
    card.append(el('div', { class: 'tiny', style: 'margin:4px 0 10px;', html: 'Akun IG-nya asli & cocok niche-mu. Klik ikon platform buat intip mereka di <b>IG · TikTok · YouTube · web</b> — pilih yang paling aktif, <b>Pakai</b> buat masukin ke slot bawah, lalu Bandingkan.' }));
    picks.forEach(h => {
      const clean = h.replace(/^@+/, '');
      const used = present.has(clean.toLowerCase());
      const row = el('div', { class: 'reco-row' });
      row.append(el('div', { class: 'reco-info' }, [el('b', { textContent: prettyBrand(clean) }), el('small', { style: 'display:block; opacity:.7;', textContent: '@' + clean })]));
      const links = el('div', { class: 'reco-links' });
      crossPlatformLinks(clean).forEach(l => links.append(el('a', { class: 'chip golink', href: l.url, target: '_blank', rel: 'noopener noreferrer', title: l.title, textContent: l.label })));
      row.append(links);
      row.append(el('button', { type: 'button', class: used ? 'ghost' : '', style: 'font-size:12.5px; padding:6px 10px; flex:0 0 auto;', disabled: used, textContent: used ? '✓ Dipakai' : '➕ Pakai', onclick: () => { if (addCompetitor(clean)) { drawComps(); drawRecos(); } } }));
      card.append(row);
    });
    recoWrap.append(card);
  }
  drawRecos();
  cmpCard.append(recoWrap);
  // ── engagement AKUNKU: cek akun sendiri buat dibandingin langsung sama kompetitor ──
  saved.myHandle = saved.myHandle || saved.handle || c.social || '';
  saved.myEng = saved.myEng || { followers: '', data: '', platform: saved.cmpPlatform || 'instagram' };
  const myCp = { handle: saved.myHandle, eng: saved.myEng };
  const myCard = el('div', { class: 'card', style: 'margin:12px 0; border:1.5px solid var(--gold);' });
  myCard.append(el('div', { class: 'row between', style: 'align-items:center; gap:8px; flex-wrap:wrap;' }, [
    el('b', { textContent: '📊 Cek engagement akunku' }),
    el('span', { class: 'tiny', style: 'opacity:.75;', textContent: 'akun kamu sendiri — buat dibandingin sama kompetitor' }),
  ]));
  const myH = el('input', { type: 'text', placeholder: '@handle akunmu (mis. @brandkamu)', value: saved.myHandle, style: 'margin:8px 0;' });
  myH.oninput = () => { saved.myHandle = myH.value; myCp.handle = myH.value; if (!c.social) { c.social = myH.value; saveClient(c); } persist(); };
  myCard.append(myH);
  myCard.append(el('div', { class: 'tiny', style: 'margin-bottom:6px;', html: hasRisetApi() ? 'Klik <b>Ambil otomatis</b> di dalam → tarik followers & engagement akunmu langsung. Atau isi manual.' : 'Isi followers + like/komen/view postinganmu → <b>Hitung engagement</b>. (Aktifkan <b>Ambil otomatis</b> dengan set Backend Riset di ⚙️.)' }));
  myCard.append(compEngagementBox(myCp, true));
  cmpCard.append(myCard);
  drawComps();
  cmpCard.append(compsWrap);
  const cmpOut = el('div');
  // ambil angka real semua kompetitor dari backend sekaligus (kalau Backend Riset diset).
  // isi cp.eng otomatis → balikin ringkasan engagement per handle biar bisa ditampilkan.
  async function autoFetchAll() {
    if (!hasRisetApi()) return [];
    const targets = saved.comps.filter(cp => (cp.handle || '').replace(/^@+/, '').trim());
    if (!targets.length) return [];
    const results = await Promise.all(targets.map(async cp => {
      const plat = cp.eng?.platform || 'instagram';
      try {
        const d = await fetchCompetitorStats(cp.handle, plat);
        cp.eng = cp.eng || {}; cp.eng.platform = plat;
        cp.eng.followers = String(d.followers || '');
        if (plat === 'tiktok' || plat === 'youtube') { cp.eng.agg = d; return { handle: cp.handle, plat, d }; }
        cp.eng.data = (d.posts || []).map(p => (p.likes || 0) + ',' + (p.comments || 0) + ',' + (p.views || 0)).join('\n');
        cp.eng.agg = null;
        return { handle: cp.handle, plat, d };
      } catch (e) { return { handle: cp.handle, plat, err: String(e.message || e).slice(0, 80) }; }
    }));
    persist(); drawComps(); // refresh box engagement dengan angka yang baru ditarik
    return results;
  }
  // ringkasan "📊 Data engagement real" hasil auto-fetch → kartu per kompetitor
  function renderAutoEngagement(results) {
    const ok = results.filter(r => r && !r.err);
    if (!ok.length) return null;
    const wrap = el('div', { class: 'card result-card', style: 'margin-bottom:14px;' });
    wrap.append(el('div', { class: 'result-head' }, [
      el('span', { class: 'e', textContent: '📊' }),
      el('h3', { textContent: 'Data engagement real (langsung dari akun publik)' }),
    ]));
    const PICON = { tiktok: '🎵 ', youtube: '▶️ ', instagram: '📸 ' };
    ok.forEach(r => {
      const handle = (r.handle || 'akun').replace(/^@?/, '@');
      wrap.append(el('div', { class: 'sub', style: 'margin-top:10px; font-weight:700;', textContent: (PICON[r.plat] || '📸 ') + handle }));
      wrap.append(r.plat === 'tiktok'
        ? renderTiktokAggregate(r.d)
        : r.plat === 'youtube'
          ? renderYoutubeResult(r.d)
          : renderEngagementResult(engagementFrom(r.d.followers, (r.d.posts || []).map(p => (p.likes || 0) + ',' + (p.comments || 0) + ',' + (p.views || 0)).join('\n')), handle));
    });
    const errs = results.filter(r => r && r.err);
    if (errs.length) wrap.append(el('div', { class: 'hint', style: 'margin-top:10px;', html: '⚠️ Gagal ambil: ' + errs.map(r => (r.handle || '') + ' (' + r.err + ')').join(', ') + '. Sisanya bisa diisi manual di box tiap kompetitor.' }));
    return wrap;
  }
  // jalankan perbandingan: pakai caption yang ditempel; kalau kosong → auto-deteksi kompetitor.
  // saat forceAuto=false & Backend Riset aktif → sekalian tarik angka real semua kompetitor.
  const runCompare = async forceAuto => {
    let autoEng = null; const fetched = {};
    if (!forceAuto && hasRisetApi()) {
      btnCompare.disabled = true; const t0 = btnCompare.textContent; btnCompare.textContent = '⏳ ambil data real…';
      try {
        const results = await autoFetchAll();
        autoEng = renderAutoEngagement(results);
        results.forEach(r => { if (r && !r.err && r.d) fetched[(r.handle || '').replace(/^@+/, '').trim().toLowerCase()] = r.d; });
      } catch (e) { toast('Sebagian data gagal ditarik', 'err'); }
      btnCompare.disabled = false; btnCompare.textContent = t0;
    }
    const pasted = saved.comps.filter(cp => cp.raw && parsePosts(cp.raw).length >= 2)
      .map(cp => ({ handle: (cp.handle || '@kompetitor').trim(), raw: cp.raw }));
    // handle asli yang user isi → buat preview embed asli (IG feed / YouTube video / TikTok profil)
    const realHandles = saved.comps.map(cp => (cp.handle || '').trim()).filter(Boolean);
    const auto = forceAuto || !pasted.length;
    const comps = auto ? detectCompetitors(c) : pasted;
    const rep = compareReport(c, saved.myPosts || '', comps, auto, realHandles);
    rep.platform = saved.cmpPlatform || 'instagram'; // platform buat preview embed
    rep.fetched = fetched; // data backend per handle (buat embed video YouTube / stats TikTok)
    // engagement per kompetitor + akun pribadi (manual ATAU auto backend) → ditampilkan INLINE di perbandingan
    rep.engagement = {}; saved.comps.forEach(cp => { const e = engOf(cp.eng); if (e) rep.engagement[(cp.handle || '').replace(/^@+/, '').trim().toLowerCase()] = e; });
    rep.myEngagement = engOf(saved.myEng); rep.myHandle = saved.myHandle || c.social || '';
    saved.bench = compBench(rep); persist(); // simpan acuan → dipakai tab Review Konten buat "kamu vs kompetitor"
    cmpOut.innerHTML = '';
    if (autoEng) cmpOut.append(autoEng); // angka real di atas analisis pola
    cmpOut.append(renderCompare(rep, c, h => { const ok = addCompetitor(h); if (ok) { drawComps(); if (typeof drawRecos === 'function') drawRecos(); } return ok; }));
    cmpOut.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(auto ? 'Pola niche dianalisis ✓' : 'Perbandingan siap ✓', 'ok');
  };
  const btnCompare = el('button', { class: 'primary', textContent: (CMP_PLAT[saved.cmpPlatform] || CMP_PLAT.instagram).icon + ' Bandingkan + preview ' + (CMP_PLAT[saved.cmpPlatform] || CMP_PLAT.instagram).name, onclick: () => runCompare(false) });
  cmpCard.append(el('div', { class: 'row', style: 'margin-top:14px; flex-wrap:wrap;' }, [
    btnCompare,
    el('button', { textContent: '🔍 Analisis pola otomatis', onclick: () => runCompare(true) }),
    el('button', { textContent: '✨ Isi ulang saran', onclick: () => regen() }),
    saved.comps.length < MAX_COMP ? el('button', { textContent: '＋ Tambah kompetitor', onclick: () => { saved.comps.push({ handle: '', raw: '' }); persist(); drawComps(); } }) : null,
  ]));
  body.append(cmpCard);
  body.append(cmpOut);
}
// bar skor 0-10 (warna: low/mid/normal sesuai nilai)
function scoreMeter(label, score, note) {
  const cls = score < 5 ? 'low' : score < 7.5 ? 'mid' : '';
  return el('div', { class: 'meter-row' }, [
    el('div', {}, [el('div', { class: 'meter-label', textContent: label }), note ? el('div', { class: 'tiny', textContent: note }) : null]),
    el('div', { class: 'meter' }, el('i', { class: cls, style: 'width:' + (score * 10) + '%;' })),
    el('div', { class: 'score-num', textContent: score }),
  ]);
}
// Checklist audit akun (interaktif — bisa dicentang, disalin, di-PDF).
function renderAudit(d, c) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🩺' }),
    el('h3', { textContent: 'Audit ' + d.handle + ' (' + d.platform + ')' }),
  ]));
  card.append(el('p', { class: 'muted', style: 'margin:0 0 6px; font-size:13.5px;', html: '<b>Panduan audit mandiri.</b> Browser nggak bisa baca isi ' + d.platform + ' langsung, jadi buka ' + d.handle + ' di HP, lalu centang tiap poin yang sudah beres. Yang belum kecentang = PR kamu.' }));
  const prog = el('div', { class: 'audit-progress' });
  card.append(prog);
  let done = 0;
  const upd = () => { prog.textContent = '✅ ' + done + ' / ' + d.total + ' beres' + (done === d.total ? ' — mantap, akun rapi!' : ''); };
  d.sections.forEach(sec => {
    const box = el('div', { class: 'audit-sec' });
    box.append(el('b', { textContent: sec.title }));
    sec.items.forEach(txt => {
      const item = el('button', { class: 'audit-item', type: 'button' }, [
        el('span', { class: 'box', html: svgIcon('check') }),
        el('span', { class: 'lbl', textContent: txt }),
      ]);
      item.onclick = () => { const on = item.classList.toggle('done'); done += on ? 1 : -1; upd(); };
      box.append(item);
    });
    card.append(box);
  });
  upd();
  card.append(el('div', { class: 'row', style: 'margin-top:16px;' }, [
    el('button', { class: 'primary', textContent: '📋 Salin checklist', onclick: () => copyText(auditText(d), 'Checklist audit') }),
    el('button', { textContent: '⬇️ PDF', onclick: () => downloadDocPDF(slugTag(c.name) + '-audit', 'Audit ' + d.handle + ' (' + d.platform + ')', auditText(d)) }),
  ]));
  card.append(learnBox(d.learning_note));
  return card;
}
// checklist audit jadi teks (buat salin / PDF)
function auditText(d) {
  const lines = ['AUDIT ' + d.handle + ' (' + d.platform + ')', ''];
  d.sections.forEach(s => { lines.push(s.title); s.items.forEach(i => lines.push('[ ] ' + i)); lines.push(''); });
  lines.push('Catatan: ' + d.learning_note);
  return lines.join('\n');
}
// render rapor review akun (skor total + meter + tabel per post + saran)
function renderReview(d) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🩺' }),
    el('h3', { textContent: (d.handle ? 'Review ' + d.handle + ' — ' : 'Hasil review — ') + d.n + ' post dianalisis' + (d.platform ? ' (' + d.platform + ')' : '') }),
  ]));
  card.append(el('div', { class: 'hero-score' }, [
    el('span', { class: 'n', style: d.overall < 5 ? 'color:var(--coral-dark);' : d.overall < 7.5 ? 'color:var(--gold);' : 'color:var(--pine);', textContent: d.overall }),
    el('span', { class: 'd', textContent: '/ 10' }),
  ]));
  const meters = el('div', { style: 'margin-top:12px;' });
  d.scores.forEach(s => meters.append(scoreMeter(s.aspect, s.score, s.note)));
  card.append(meters);
  card.append(el('div', { class: 'divider' }));
  card.append(el('b', { textContent: 'Per post (baris pertama = hook kamu):' }));
  const tbl = el('table', { class: 't' });
  tbl.append(el('thead', {}, el('tr', {}, ['#', 'Baris pertama', 'Hook', 'Pola', 'CTA', 'Tag', 'Jenis'].map(h => el('th', { textContent: h })))));
  const tb = el('tbody');
  d.perPost.forEach(p => tb.append(el('tr', {}, [
    el('td', { textContent: p.no }),
    el('td', { textContent: p.firstLine.slice(0, 52) + (p.firstLine.length > 52 ? '…' : '') }),
    el('td', { html: '<b>' + p.hook + '</b>/10' }),
    el('td', { class: 'tiny', textContent: p.pattern }),
    el('td', { textContent: p.hasCTA ? '✓' : '✗' }),
    el('td', { textContent: p.tags }),
    el('td', { class: 'tiny', textContent: p.pillar }),
  ])));
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  const sec = (title, cls, items) => { if (!items.length) return; card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: title })); const ul = el('ul', { class: 'clean ' + cls }); items.forEach(i => ul.append(el('li', { textContent: i }))); card.append(ul); };
  sec('Yang udah bagus:', 'good', d.strengths);
  sec('Yang bocor:', 'bad', d.weaknesses);
  sec('Rekomendasi:', 'num', d.recommendations);
  sec('Quick wins minggu ini:', 'idea', d.quick_wins);
  card.append(learnBox(d.learning_note));
  return card;
}
// hyperlink ke profil IG dari sebuah handle (buang @, buka tab baru)
function igUrl(handle) { return 'https://www.instagram.com/' + encodeURIComponent(String(handle).replace(/^@+/, '').trim().toLowerCase()); }
function igHandleLink(handle, style) {
  const clean = '@' + String(handle).replace(/^@+/, '').trim();
  return el('a', { class: 'iglink', href: igUrl(handle), target: '_blank', rel: 'noopener noreferrer', title: 'Buka ' + clean + ' di Instagram', textContent: clean, style: style || '' });
}
// PREVIEW IG ASLI: sematkan widget embed resmi Instagram (profil, followers, feed asli).
// Tanpa API key / server — cukup <iframe> ke /<handle>/embed. Butuh internet & handle asli.
function igEmbedCard(handle) {
  const clean = String(handle).replace(/^@+/, '').trim().toLowerCase();
  const wrap = el('div', { class: 'igembed' });
  wrap.append(el('div', { class: 'igembed-head' }, [
    igHandleLink(clean, 'font-size:15px;'),
    el('a', { class: 'igembed-open', href: igUrl(clean), target: '_blank', rel: 'noopener noreferrer', textContent: 'Buka di Instagram ↗' }),
  ]));
  // iframe embed resmi IG — render profil + feed asli. sandbox longgar krn butuh script IG.
  const frame = el('iframe', {
    src: 'https://www.instagram.com/' + encodeURIComponent(clean) + '/embed',
    loading: 'lazy', scrolling: 'no', title: 'Instagram @' + clean,
    allowtransparency: 'true', frameborder: '0',
  });
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  wrap.append(el('div', { class: 'igembed-frame' }, frame));
  wrap.append(el('div', { class: 'tiny', style: 'padding:8px 12px 10px; opacity:.75;', textContent: 'Preview asli dari Instagram (butuh internet). Kalau kosong, handle-nya mungkin keliru, private, atau IG minta login.' }));
  return wrap;
}
// preview VIDEO TERBARU channel YouTube (embed resmi youtube.com/embed/<videoId>) — videoId dari Backend Riset
function ytEmbedCard(handle, data) {
  const clean = String(handle).replace(/^@+/, '').trim();
  const chUrl = 'https://www.youtube.com/@' + encodeURIComponent(clean);
  const wrap = el('div', { class: 'igembed' });
  wrap.append(el('div', { class: 'igembed-head' }, [
    el('a', { class: 'iglink', href: chUrl, target: '_blank', rel: 'noopener noreferrer', style: 'font-size:15px;', textContent: '@' + clean }),
    el('a', { class: 'igembed-open', href: chUrl, target: '_blank', rel: 'noopener noreferrer', textContent: 'Buka channel ↗' }),
  ]));
  const vid = data && Array.isArray(data.posts) && data.posts.find(p => p.shortcode);
  if (vid) {
    const fr = el('iframe', { src: 'https://www.youtube.com/embed/' + encodeURIComponent(vid.shortcode), loading: 'lazy', title: 'YouTube @' + clean, frameborder: '0' });
    fr.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    fr.setAttribute('allowfullscreen', '');
    wrap.append(el('div', { class: 'igembed-frame yt' }, fr));
    wrap.append(el('div', { class: 'tiny', style: 'padding:8px 12px 10px; opacity:.75;', textContent: 'Video terbaru' + (data.followers ? ' · ' + fmtCount(data.followers) + ' subscriber' : '') + (vid.title ? ' — ' + String(vid.title).slice(0, 50) : '') }));
  } else {
    wrap.append(el('div', { class: 'hint', style: 'margin:10px 12px;', html: 'Aktifkan <b>Backend Riset</b> (⚙️) lalu Bandingkan lagi → video terbaru channel tampil di sini. Sementara, <a class="iglink" href="' + chUrl + '" target="_blank" rel="noopener">buka channel ↗</a>.' }));
  }
  return wrap;
}
// muat script embed resmi TikTok (re-inject supaya blockquote yang baru ikut diproses)
function loadTiktokEmbed() {
  const old = document.getElementById('ttembedjs'); if (old) old.remove();
  document.body.append(el('script', { id: 'ttembedjs', src: 'https://www.tiktok.com/embed.js', async: true }));
}
// preview PROFIL TikTok (embed resmi "creator") + stats agregat sebagai fallback yang selalu berguna
function ttEmbedCard(handle, data) {
  const clean = String(handle).replace(/^@+/, '').trim();
  const ttUrl = 'https://www.tiktok.com/@' + encodeURIComponent(clean);
  const wrap = el('div', { class: 'igembed' });
  wrap.append(el('div', { class: 'igembed-head' }, [
    el('a', { class: 'iglink', href: ttUrl, target: '_blank', rel: 'noopener noreferrer', style: 'font-size:15px;', textContent: '@' + clean }),
    el('a', { class: 'igembed-open', href: ttUrl, target: '_blank', rel: 'noopener noreferrer', textContent: 'Buka di TikTok ↗' }),
  ]));
  // stats agregat (kalau backend udah narik) — selalu berguna walau embed gagal muat
  if (data && (data.followers || data.totalLikes || data.videoCount)) {
    wrap.append(el('div', { class: 'tiny', style: 'padding:8px 12px; font-weight:600;', textContent: [data.followers ? fmtCount(data.followers) + ' followers' : '', data.totalLikes ? fmtCount(data.totalLikes) + ' likes' : '', data.videoCount ? fmtCount(data.videoCount) + ' video' : ''].filter(Boolean).join(' · ') }));
  }
  // embed resmi creator TikTok
  const bq = el('blockquote', { class: 'tiktok-embed', cite: ttUrl, style: 'max-width:100%; min-width:280px; margin:0;' });
  bq.setAttribute('data-unique-id', clean); bq.setAttribute('data-embed-type', 'creator');
  bq.append(el('section', {}, el('a', { href: ttUrl, target: '_blank', rel: 'noopener noreferrer', textContent: '@' + clean })));
  wrap.append(el('div', { style: 'padding:4px 12px;' }, bq));
  loadTiktokEmbed();
  wrap.append(el('div', { class: 'tiny', style: 'padding:2px 12px 10px; opacity:.7;', textContent: 'Preview profil TikTok (butuh internet). Kalau nggak muncul, klik "Buka di TikTok".' }));
  return wrap;
}
// preview kompetitor sesuai platform terpilih
function previewCard(handle, platform, data) {
  if (platform === 'youtube') return ytEmbedCard(handle, data);
  if (platform === 'tiktok') return ttEmbedCard(handle, data);
  return igEmbedCard(handle);
}
// CARI KOMPETITOR: link cari resmi Instagram (hashtag niche + kata kunci) dari profil brand.
// Bukan scraping — buka pencarian IG sendiri di tab baru (kamu login) → intip akun nyata → salin handle-nya.
function igSearchLinks(c, extra) {
  const f = factsOf(c);
  const tagUrl = t => 'https://www.instagram.com/explore/tags/' + encodeURIComponent(String(t).replace(/[^a-z0-9]/gi, '').toLowerCase()) + '/';
  const kwUrl = q => 'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(q);
  const tags = (f.bank.tags && f.bank.tags.length) ? f.bank.tags.slice(0, 5) : ['bisnislokal', 'umkm'];
  const catKw = { skincare: 'skincare lokal', fnb: 'kuliner', fashion: 'fashion lokal', service: 'jasa', edu: 'kelas online', other: 'brand lokal' }[c.category] || 'brand lokal';
  const area = (f.area || '').replace(/\(.*?\)/g, '').replace(/[^\w\s]/g, ' ').trim().split(/\s+/)[0] || '';
  const kws = [];
  // DESKRIPSI bisnis (kalau ada) jadi kata kunci utama → hasil pencarian paling pas
  const desc = String(extra || '').replace(/\s+/g, ' ').trim();
  if (desc) { const q = desc.split(/\s+/).slice(0, 5).join(' '); if (q.length >= 3) kws.push(q); }
  // JASA/PRODUK yang ditawarkan berikutnya
  (f.products || []).slice(0, 2).forEach(pr => { const q = lower1(String(pr).split(/[,/]/)[0].trim()); if (q) kws.push(q); });
  kws.push(catKw + (area ? ' ' + area : ' indonesia')); // niche + lokasi
  const links = [];
  [...new Set(kws)].filter(Boolean).slice(0, 3).forEach(q => links.push({ label: '🔎 ' + q, url: kwUrl(q) }));
  tags.forEach(t => links.push({ label: '#' + t, url: tagUrl(t) }));
  return links;
}
// panel "Cari kompetitor di Instagram" — chip link yang buka pencarian IG asli (pakai deskripsi bisnis kalau ada)
function renderIgSearchPanel(c, extra, onAdd) {
  const box = el('div', { class: 'igsearch' });
  box.append(el('b', { style: 'display:block;', textContent: '🔎 Cari kompetitor di Instagram' }));
  box.append(el('div', { class: 'tiny', style: 'margin:3px 0 10px;', html: onAdd
    ? 'Klik salah satu → pencarian IG kebuka di tab baru. Intip akun yang muncul, <b>salin @handle-nya</b>, lalu tempel langsung di kotak bawah → <b>Tambah</b> (nggak perlu scroll cari slot).'
    : 'Klik salah satu → pencarian Instagram asli kebuka di tab baru (kamu lagi login). Intip akun yang muncul, <b>salin @handle-nya</b>, tempel di kolom kompetitor bawah → preview feed aslinya langsung tampil.' }));
  const chips = el('div', { class: 'row', style: 'flex-wrap:wrap; gap:8px;' });
  igSearchLinks(c, extra).forEach(l => chips.append(el('a', { class: 'chip golink', href: l.url, target: '_blank', rel: 'noopener noreferrer', textContent: l.label })));
  box.append(chips);
  // isi @handle LANGSUNG dari sini (nggak perlu scroll ke slot kompetitor) — dukung banyak handle sekaligus
  if (typeof onAdd === 'function') {
    box.append(el('div', { class: 'tiny', style: 'margin:12px 0 4px; font-weight:600;', textContent: 'Udah nemu akunnya? Tempel @handle-nya di sini:' }));
    const rowc = el('div', { class: 'row', style: 'gap:8px; flex-wrap:wrap; align-items:stretch;' });
    const inp = el('input', { type: 'text', placeholder: '@handle atau instagram.com/handle (boleh banyak, pisah koma)', style: 'flex:1 1 220px; margin:0;' });
    const doAdd = () => {
      const handles = String(inp.value || '').split(/[\s,\n]+/).map(cleanHandle).filter(Boolean);
      if (!handles.length) { inp.focus(); return; }
      let n = 0; handles.forEach(h => { if (onAdd(h)) n++; });
      if (n) { inp.value = ''; toast('+' + n + ' kompetitor ditambah ✓', 'ok'); }
      else toast('Handle sudah ada / slot penuh', 'err');
      inp.focus();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } };
    rowc.append(inp, el('button', { type: 'button', class: 'primary', style: 'flex:0 0 auto;', textContent: '➕ Tambah', onclick: doAdd }));
    box.append(rowc);
    box.append(el('div', { class: 'tiny', style: 'margin-top:4px; opacity:.75;', textContent: 'URL lengkap juga boleh — @-nya & instagram.com/-nya kami rapikan otomatis.' }));
  }
  return box;
}
// render hasil banding kompetitor (tabel skor + tiru/kelemahan + celah + bank hook + langkah menang)
function renderCompare(d, c, onAdd) {
  const card = el('div', { class: 'card result-card' });
  card.append(el('div', { class: 'result-head' }, [
    el('span', { class: 'e', textContent: '🥊' }),
    el('h3', { textContent: 'Kamu vs kompetitor' }),
  ]));
  if (d.autoDetected) card.append(el('div', { class: 'hint', style: 'margin:0 0 12px;', html: '🔍 <b>Analisis POLA niche</b> (bukan akun asli) — 3 pola konten tipikal. Buat preview feed asli, isi @handle kompetitor aslimu di kolom di atas.' }));
  const tbl = el('table', { class: 't' });
  const eKey = h => String(h || '').replace(/^@+/, '').trim().toLowerCase();
  const cols = [{ label: c.name + (d.mineAuto ? ' (kamu · contoh ProdPilot)' : ' (kamu)'), a: d.mine, eng: d.myEngagement }]
    .concat(d.competitors.map(cp => ({ label: cp.handle, a: cp.scores, eng: (d.engagement || {})[eKey(cp.handle)] })));
  tbl.append(el('thead', {}, el('tr', {}, [el('th', { textContent: 'Aspek' })].concat(cols.map(col => el('th', { textContent: col.label }))))));
  const tb = el('tbody');
  const hasEng = cols.some(col => col.eng); // ada minimal 1 kolom (kamu / kompetitor) punya angka engagement
  // metrik + arah "lebih baik" ('up' makin tinggi bagus, 'down' makin rendah bagus). null = netral
  const metrics = [
    { label: 'Skor total', num: (a) => a ? a.overall : null, fmt: v => v, dir: 'up' },
    { label: 'Hook 3 detik', num: (a) => a ? a.hookScore : null, fmt: v => v, dir: 'up' },
    { label: 'CTA', num: (a) => a ? a.ctaCoverage * 100 : null, fmt: v => Math.round(v) + '%', dir: 'up' },
    { label: 'Hashtag (median)', num: (a) => a ? a.medianTags : null, fmt: v => v, dir: null },
    { label: 'Porsi jualan', num: (a) => a ? a.promoShare * 100 : null, fmt: v => Math.round(v) + '%', dir: 'down' },
  ].concat(hasEng ? [
    { label: '📈 Engagement rate', num: (a, col) => engER(col.eng), fmt: v => v.toFixed(2) + '%', dir: 'up' },
    { label: '🔥 Konten viral', num: (a, col) => engViral(col.eng), fmt: v => String(v), dir: 'up' },
  ] : []);
  const wins = [], losses = [];
  metrics.forEach(m => {
    const tr = el('tr');
    tr.append(el('td', { html: '<b>' + m.label + '</b>' }));
    const compVals = cols.slice(1).map(col => m.num(col.a, col)).filter(v => v != null);
    cols.forEach((col, ci) => {
      const v = m.num(col.a, col);
      let disp = v == null ? '—' : String(m.fmt(v)), cls = '';
      // KOLOM KAMU (ci===0): adu vs kompetitor terbaik → ▲ unggul / ▼ ketinggalan
      if (ci === 0 && v != null && m.dir && compVals.length) {
        const best = m.dir === 'up' ? Math.max(...compVals) : Math.min(...compVals);
        if ((m.dir === 'up' && v > best) || (m.dir === 'down' && v < best)) { disp = '▲ ' + disp; cls = 'cmp-win'; wins.push(m.label); }
        else if ((m.dir === 'up' && v < best) || (m.dir === 'down' && v > best)) { disp = '▼ ' + disp; cls = 'cmp-lose'; losses.push(m.label); }
        else { disp = '= ' + disp; }
      }
      tr.append(el('td', { textContent: disp, class: cls }));
    });
    tb.append(tr);
  });
  tbl.append(tb);
  card.append(el('div', { class: 'tscroll' }, tbl));
  // verdict head-to-head: kamu unggul di mana, ketinggalan di mana
  const vs = d.competitors.length > 1 ? 'kompetitor terbaik' : (d.competitors[0] ? d.competitors[0].handle : 'kompetitor');
  card.append(el('div', { class: 'verdict' }, [
    wins.length ? el('div', {}, [el('b', { textContent: '🏆 Kamu unggul: ' }), document.createTextNode(wins.join(', '))]) : null,
    losses.length ? el('div', {}, [el('b', { textContent: '🎯 Perlu dikejar: ' }), document.createTextNode(losses.join(', '))]) : null,
    el('div', { class: 'tiny', style: 'margin-top:4px;', textContent: '▲/▼ = kolom kamu dibanding ' + vs + '.' + (d.competitors.some(cp => cp.archetype) ? ' Kompetitor di sini = POLA niche, bukan akun asli — isi @handle asli mereka buat preview & angka nyata.' : '') }),
  ].filter(Boolean)));
  if (d.mineAuto) card.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: 'Kolom "kamu" diisi otomatis dari contoh konten ProdPilot untuk brand-mu (jadi patokan target). Mau pakai data akun aslimu? Tempel caption-mu di kotak "Caption akunmu" di Review Akun, terus bandingkan lagi.' }));
  // 📊 engagement · konten viral · statistik AKUN PRIBADI-mu — biar side-by-side sama kompetitor di bawah
  if (d.myEngagement) {
    const mb = el('details', { class: 'adv', open: true, style: 'margin-top:10px; border-color:var(--gold);' });
    mb.append(el('summary', { html: '📊 Engagement · konten viral · statistik <b>akunmu</b> ' + (d.myHandle ? ('(' + (d.myHandle.replace(/^@?/, '@')) + ')') : '') }));
    mb.append(renderEngOf(d.myEngagement, d.myHandle || 'akunmu'));
    card.append(mb);
  } else {
    card.append(el('div', { class: 'hint', style: 'margin-top:10px;', html: '📊 Engagement <b>akun pribadimu</b> belum diisi — isi di kartu <b>📊 Cek engagement akunku</b> (di atas, border emas) biar kolom "kamu" ikut punya angka ER & konten viral buat diadu.' }));
  }
  d.competitors.forEach((cp) => {
    card.append(el('div', { class: 'divider' }));
    // arketipe = pola (bukan akun asli) → label biasa; kompetitor asli (dari caption) → handle link
    const head = cp.archetype
      ? el('b', { style: 'font-size:16px;', textContent: cp.handle })
      : igHandleLink(cp.handle, 'font-size:16px;');
    card.append(el('div', { class: 'row between' }, [head, el('span', { class: 'chip', textContent: cp.n + ' post · skor ' + cp.overall })]));
    if (!cp.archetype) card.append(previewCard(cp.handle, d.platform || 'instagram', (d.fetched || {})[String(cp.handle).replace(/^@+/, '').trim().toLowerCase()])); // preview asli sesuai platform
    card.append(el('div', { class: 'tiny', style: 'margin-top:10px;', textContent: 'Pola hook mereka: ' + cp.hook_patterns.join(' · ') }));
    const ul1 = el('ul', { class: 'clean good' }); cp.tiru_adaptasi.forEach(t => ul1.append(el('li', { textContent: 'Tiru-adaptasi: ' + t }))); card.append(ul1);
    const ul2 = el('ul', { class: 'clean bad' }); cp.kelemahan.forEach(t => ul2.append(el('li', { textContent: t }))); card.append(ul2);
    // 📊 engagement · konten viral · statistik kompetitor ini (real backend / manual) — INLINE di perbandingan
    if (!cp.archetype) {
      const eng = (d.engagement || {})[eKey(cp.handle)];
      if (eng) {
        const eb = el('details', { class: 'adv', open: true, style: 'margin-top:10px;' });
        eb.append(el('summary', { textContent: '📊 Engagement · konten viral · statistik ' + cp.handle }));
        eb.append(renderEngOf(eng, cp.handle));
        card.append(eb);
      } else {
        card.append(el('div', { class: 'hint', style: 'margin-top:10px;', html: '📊 Angka engagement/konten viral <b>' + cp.handle + '</b> belum diisi. Isi followers + like/komen/view di box <b>📊 Total view · konten viral · engagement</b> kompetitor ini (di atas), atau set <b>Backend Riset</b> di ⚙️ biar ketarik otomatis.' }));
      }
    }
  });
  // ── PREVIEW ASLI dari handle yang kamu masukin (embed resmi sesuai platform) ──
  const plat = d.platform || 'instagram';
  const PLABEL = { instagram: { i: '📸', n: 'Instagram', what: 'Profil & feed asli langsung dari Instagram' }, tiktok: { i: '🎵', n: 'TikTok', what: 'Profil & video terbaru langsung dari TikTok' }, youtube: { i: '▶️', n: 'YouTube', what: 'Video terbaru channel langsung dari YouTube' } }[plat];
  card.append(el('div', { class: 'divider' }));
  card.append(el('b', { style: 'display:block;', textContent: PLABEL.i + ' Preview ' + PLABEL.n + ' kompetitor (asli)' }));
  if (d.realHandles && d.realHandles.length) {
    card.append(el('div', { class: 'tiny', style: 'margin:4px 0 10px;', textContent: PLABEL.what + ' — bukan gambar buatan.' }));
    const grid = el('div', { class: 'igembed-grid' });
    d.realHandles.forEach(h => grid.append(previewCard(h, plat, (d.fetched || {})[String(h).replace(/^@+/, '').trim().toLowerCase()])));
    card.append(grid);
  } else {
    card.append(el('div', { class: 'hint', style: 'margin-top:4px; margin-bottom:12px;', html: 'Belum ada handle. Isi @handle kompetitor ' + PLABEL.n + ' aslimu di kolom kompetitor → bandingkan lagi. Preview aslinya bakal tampil di sini.' }));
    if (plat === 'instagram') card.append(renderIgSearchPanel(c, null, onAdd));
  }
  if (d.gaps.length) {
    card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🕳️ Celah yang belum digarap siapa pun:' }));
    const ul = el('ul', { class: 'clean idea' }); d.gaps.forEach(g => ul.append(el('li', { textContent: g }))); card.append(ul);
  }
  card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🪝 Bank hook siap pakai (udah pakai voice ' + c.name + '):' }));
  const hb = el('ul', { class: 'clean num' });
  d.hook_bank.forEach(h => {
    const [text, pat] = h.split('  ·  ');
    hb.append(el('li', {}, [el('div', { class: 'row between' }, [el('span', { textContent: text }), el('span', { class: 'row', style: 'gap:6px;' }, [el('span', { class: 'badge coral', textContent: (pat || '').replace(/[()]/g, '') }), copyChip(text, 'Hook')])])]));
  });
  card.append(hb);
  card.append(el('b', { style: 'display:block; margin-top:18px;', textContent: '🎯 5 langkah buat menang:' }));
  const ai = el('ul', { class: 'clean num' }); d.action_ideas.forEach(a => ai.append(el('li', { textContent: a }))); card.append(ai);
  { const pt = renderProfileTraining(c, d); if (pt) card.append(pt); }
  card.append(learnBox(d.learning_note));
  return card;
}

/* ── TAB: PROFIL ── */
const WIZ_INDEX = {}; WIZ_STEPS.forEach((s, i) => s.fields.forEach(f => { WIZ_INDEX[f.id] = i; })); // peta field → index step (buat lompat edit)
// tab profil: kekuatan + ringkasan per grup (edit langsung ke step wizard) + hapus brand
function renderProfil(body, c) {
  const pct = profileStrength(c);
  const head = el('div', { class: 'card' });
  head.append(el('div', { class: 'row between' }, [
    el('b', { textContent: 'Kekuatan profil — makin lengkap, makin tajam hasilnya' }),
    el('button', { textContent: '✏️ Edit profil', onclick: () => startWizard(c, 0) }),
  ]));
  head.append(strengthBar(pct));
  body.append(head);
  const groups = [
    ['🛍️ Produk & harga', ['products', 'price', 'usp', 'proof'], 'produk'],
    ['🎯 Pembeli', ['buyer', 'painpoint', 'desire'], 'pembeli'],
    ['🗣️ Gaya bicara', ['tone', 'sapaan', 'emoji', 'signature', 'forbidden', 'brandGuide'], 'gaya'],
    ['📣 Tujuan & promo', ['goal', 'cta', 'promo'], 'tujuan'],
    ['🧱 Pilar konten', ['pillars', 'scriptRef', 'scriptRefAds'], 'pilar'],
    ['🛡️ Aturan aman', ['forbiddenClaims', 'certifications'], 'aman'],
    ['🔭 Sosmed & saingan', ['social', ...COMP_KEYS], 'saingan'],
  ];
  const LABELS = { products: 'Andalan', price: 'Harga', usp: 'Pembeda', proof: 'Bukti', buyer: 'Pembeli', painpoint: 'Masalah mereka', desire: 'Impian mereka', tone: 'Nada', sapaan: 'Sapaan', emoji: 'Emoji', signature: 'Frasa khas', forbidden: 'Kata terlarang', brandGuide: 'Brand guideline', goal: 'Tujuan', cta: 'CTA', promo: 'Promo', pillars: 'Pilar konten', scriptRef: 'Referensi script (copywriting)', scriptRefAds: 'Referensi script (ads)', forbiddenClaims: 'Klaim dilarang', certifications: 'Sertifikasi', social: 'IG', ...Object.fromEntries(COMP_KEYS.map((k, i) => [k, 'Kompetitor ' + (i + 1)])) };
  const fmtVal = k => k === 'brandGuide' ? ('📄 ' + (c.brandGuideName || 'PDF') + ' (' + String(c.brandGuide).length + ' karakter)')
    : k === 'scriptRef' ? ('📄 ' + (c.scriptRefName || 'file') + ' (' + String(c.scriptRef).length + ' karakter)')
    : k === 'scriptRefAds' ? ('📄 ' + (c.scriptRefAdsName || 'file') + ' (' + String(c.scriptRefAds).length + ' karakter)')
    : (Array.isArray(c[k]) ? c[k].join(' · ') : String(c[k]));
  groups.forEach(([title, keys, stepId]) => {
    const filled = keys.filter(k => c[k] && String(c[k]).trim());
    const g = el('div', { class: 'card', style: 'margin-top:14px;' });
    g.append(el('div', { class: 'row between' }, [
      el('b', { textContent: title }),
      el('button', { class: 'ghost', textContent: filled.length ? '✏️ ubah' : '＋ isi (biar makin tajam)', onclick: () => startWizard(c, WIZ_STEPS.findIndex(s => s.id === stepId)) }),
    ]));
    if (filled.length) {
      const dl = el('div', { style: 'margin-top:10px; display:flex; flex-direction:column; gap:6px;' });
      filled.forEach(k => dl.append(el('div', { style: 'font-size:14px;' }, [
        el('b', { textContent: LABELS[k] + ': ' }), fmtVal(k),
      ])));
      g.append(dl);
    } else g.append(el('div', { class: 'hint', style: 'margin-top:8px;', textContent: 'Belum diisi — bagian ini bikin hasil makin personal.' }));
    // upload/ganti brand guideline langsung di profil (kalau grup ini punya field brandGuide)
    if (keys.includes('brandGuide')) g.append(brandGuideUploader(c));
    body.append(g);
  });
  const danger = el('div', { class: 'card', style: 'margin-top:14px;' });
  danger.append(el('div', { class: 'row between' }, [
    el('div', {}, [el('b', { textContent: 'Hapus brand ini' }), el('div', { class: 'hint', textContent: 'Profil + riwayat hasil ikut terhapus. Nggak bisa dibalikin.' })]),
    el('button', { class: 'danger', textContent: '🗑️ Hapus', onclick: () => {
      if (!confirm('Yakin hapus ' + c.name + '? Semua riwayatnya ikut hilang.')) return;
      deleteClient(c.id); toast('Brand dihapus'); renderHome();
    } }),
  ]));
  body.append(danger);
}

/* ═══════════════════════ SETTINGS DIALOG ═══════════════════════ */
// perbarui badge header sesuai mode aktif (AI aktif vs mesin lokal)
function refreshModeBadge() {
  const b = $('#modeBadge');
  if (hasAI()) {
    b.className = 'badge coral'; b.innerHTML = '<span class="ico">' + svgIcon('bot') + '</span><span class="ico-t"> AI aktif</span>';
    b.title = 'Model: ' + aiResolvedModel() + ' — hasil disempurnakan AI, fallback ke lokal kalau gagal';
  } else {
    b.className = 'badge pine'; b.innerHTML = '<span class="ico">' + svgIcon('bolt') + '</span><span class="ico-t"> instan</span>';
    b.title = 'Mode: mesin lokal (instan & privat). Isi kunci di setelan untuk pakai AI.';
  }
}
// buka dialog setelan AI (isi field dari storage). DEFAULT_RISET_API didefinisikan di atas (dekat risetApi).
// kandidat URL server yang dicoba saat "Deteksi server"
const RISET_API_CANDIDATES = ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:3001', 'http://localhost:4055', 'http://localhost:8080'];
// cek satu URL: server hidup kalau fetch-nya nyampai (respons apa pun, termasuk 404) sebelum timeout
async function probeRisetServer(base, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 1500);
  try { await fetch(base.replace(/\/+$/, '') + '/api/v1', { signal: ctl.signal, mode: 'cors' }); return true; }
  catch (e) { return e && e.name === 'AbortError' ? false : false; } // connection refused / abort → mati
  finally { clearTimeout(t); }
}
// coba semua kandidat berurutan, balikin URL pertama yang hidup ('' kalau tak ada)
async function detectRisetServer() {
  for (const base of RISET_API_CANDIDATES) { if (await probeRisetServer(base, 1400)) return base; }
  return '';
}
// isi dropdown model sesuai nilai tersimpan; ubah dropdown → tulis ke input manual
function syncModelPick() {
  const pick = $('#inpModelPick'), inp = $('#inpModel'); if (!pick || !inp) return;
  const has = [...pick.options].some(o => o.value === inp.value);
  pick.value = has ? inp.value : '';
  pick.onchange = () => { if (pick.value) inp.value = pick.value; };
}
// tampilkan saran handle kompetitor dari brand yang lagi dibuka + tombol isi otomatis ke profilnya
function renderSettingsCompetitors() {
  const box = $('#cmpAutoBox'); if (!box) return;
  const c = (typeof currentId !== 'undefined' && currentId) ? getClient(currentId) : null;
  box.innerHTML = '';
  if (!c) { box.className = 'hint'; box.textContent = 'Buka salah satu brand dulu, lalu buka Setting ini — kami tampilkan saran @handle kompetitor asli yang cocok sama jasa/produkmu, tinggal klik isi otomatis.'; return; }
  box.className = '';
  const cur = compsOf(c);
  const sug = suggestCompetitors(c).slice(0, MAX_COMP);
  box.append(el('div', { class: 'tiny', style: 'margin-bottom:6px;', html: 'Brand aktif: <b>' + (c.name || '?') + '</b>' }));
  box.append(el('div', { class: 'tiny', style: 'margin-bottom:6px;', html: cur.length ? 'Sekarang: ' + cur.map(h => h.replace(/^@?/, '@')).join(', ') : '<i>Belum ada kompetitor terisi.</i>' }));
  if (sug.length) {
    box.append(el('div', { class: 'pills', style: 'margin-bottom:8px;' }, sug.map(h => el('span', { class: 'pill on', textContent: h.replace(/^@?/, '@') }))));
    box.append(el('button', { class: 'primary', type: 'button', textContent: '✨ Isi otomatis dari profil brand', onclick: () => {
      setComps(c, sug);
      saveClient(c); renderSettingsCompetitors(); toast('Handle kompetitor terisi otomatis ✓', 'ok');
    } }));
  } else {
    box.append(el('div', { class: 'hint', textContent: 'Belum ada akun yang pas otomatis buat niche ini. Isi manual @handle-nya di tab Riset brand.' }));
  }
}
function openSettings() {
  $('#inpKey').value = aiKey();
  $('#inpSpeed').value = aiSpeed();
  $('#inpModel').value = aiModelManual();
  $('#inpImgKey').value = (store.get('ce3_imgkey', '') || '');
  $('#inpImgModel').value = imgModel();
  // backend: pakai nilai tersimpan, kosong → prefill default biar tinggal simpan
  $('#inpRisetApi').value = (store.get('ce3_risetapi', '') || '') || DEFAULT_RISET_API;
  // token cross-post
  const pc = pubCreds();
  $('#inpMetaToken').value = pc.metaToken || '';
  $('#inpIgUserId').value = pc.igUserId || '';
  $('#inpFbPageId').value = pc.fbPageId || '';
  $('#inpTiktokToken').value = pc.tiktokToken || '';
  syncModelPick();
  renderSettingsCompetitors();
  const dlg = $('#dlgSettings'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
// tombol deteksi server backend otomatis (elemen sudah ada di markup dialog)
$('#btnDetectApi').onclick = async () => {
  const b = $('#btnDetectApi'); b.disabled = true; const t0 = b.textContent; b.textContent = '⏳ mencari…';
  const found = await detectRisetServer();
  if (found) { $('#inpRisetApi').value = found; toast('Server ketemu: ' + found + ' ✓', 'ok'); }
  else toast('Server nggak ketemu. Jalankan: npm run dev -w @prodpilot/api', 'err');
  b.disabled = false; b.textContent = t0;
};
// tutup dialog setelan
function closeSettings() { const dlg = $('#dlgSettings'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
$('#btnSettings').onclick = openSettings;
$('#btnCloseSettings').onclick = closeSettings;
$('#btnSaveSettings').onclick = () => {
  store.set('ce3_key', $('#inpKey').value.trim());
  store.set('ce3_speed', $('#inpSpeed').value);
  store.set('ce3_model', $('#inpModel').value.trim());
  store.set('ce3_imgkey', $('#inpImgKey').value.trim());
  store.set('ce3_imgmodel', $('#inpImgModel').value);
  store.set('ce3_risetapi', $('#inpRisetApi').value.trim().replace(/\/+$/, ''));
  savePubCreds({
    metaToken: $('#inpMetaToken').value.trim(),
    igUserId: $('#inpIgUserId').value.trim(),
    fbPageId: $('#inpFbPageId').value.trim(),
    tiktokToken: $('#inpTiktokToken').value.trim(),
  });
  refreshModeBadge();
  closeSettings();
  const bits = [hasAI() ? '🤖 AI teks: ' + aiResolvedModel() : '⚡ teks lokal'];
  if (hasImgAI()) bits.push('🎨 gambar AI: ' + imgModel());
  toast(bits.join(' · '), 'ok');
};

/* ═══════════════════════ BOOT ═══════════════════════ */
$('#logoHome').onclick = () => { wiz = null; renderHome(); };
// ganti emoji di markup statis (header + dialog pengaturan) jadi ikon garis
iconifyStatic(document.querySelector('header.top'));
document.querySelectorAll('dialog').forEach(iconifyStatic);
refreshModeBadge();
renderHome();
