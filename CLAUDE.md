# CLAUDE.md

Panduan untuk Claude Code (claude.ai/code) saat bekerja di repo ini. Baca sebelum mengubah kode.

## Apa ini

**ProdPilot / Content Engine** — platform otomasi konten sosmed multi-brand untuk pasar Indonesia.
Menghasilkan script Reels/TikTok, carousel, caption + hashtag, storyboard, ide mingguan, plus riset
(review akun IG & perbandingan kompetitor). Semua output berbahasa Indonesia, menyesuaikan voice
brand, dan wajib lolos aturan aman (BPOM untuk skincare, halal untuk F&B, dst).

## Struktur monorepo (deploy shared hosting)

1. **`prototype/content-engine.html`** — **produk utama & sumber**. Aplikasi satu file, jalan di
   browser tanpa server & tanpa API key. Semua konten dirakit oleh mesin generator lokal
   deterministik (profil brand + bank copywriting + pola hook). **Di sinilah pekerjaan fitur &
   UX terjadi.**
2. **`public_html/`** — frontend static siap-upload: `index.html` (landing Vue via CDN) +
   `app.html`/`app.js`/`app.css` (hasil build dari prototype via `prototype/build-app.mjs`).
   Inilah yang di-upload ke document root shared hosting.
3. **Root repo = aplikasi Laravel 13** (`app/`, `routes/`, `config/`, dst). 4 endpoint stateless
   untuk riset & publish (scrape IG/TikTok/YouTube publik + cross-post). Tanpa DB/auth/queue.
   Opsional — konten generate 100% tanpa ini. **Docroot = `public_html/`** (bukan `public/`; diset
   `usePublicPath` di `bootstrap/app.php`) — frontend static + `index.php` Laravel jadi satu.

> Tugas "tambah/ubah fitur konten" → target **prototype**, lalu `node prototype/build-app.mjs`
> untuk sinkron ke `public_html/`. Tugas "riset/scrape/publish/API" → edit `app/`, `routes/api.php`.
> Deploy lengkap: [DEPLOY-SHARED-HOSTING.md](DEPLOY-SHARED-HOSTING.md).

## Perintah

```bash
# Prototype: buka file-nya di browser (double-click). Tanpa build.
node prototype/build-app.mjs   # sinkron prototype → public_html/app.{html,js,css}

# Backend Laravel (di root repo — butuh PHP 8.2+ & Composer):
composer install
php artisan serve --port=4000  # API di http://127.0.0.1:4000/api/v1/...
php verify.php                 # self-check logika scraper (tanpa jaringan)
```

## Menguji prototype (tanpa framework test)

Mesin generator murni JS, bisa diuji di Node dengan DOM di-stub:

```bash
# ekstrak <script> dari content-engine.html → cek sintaks → jalankan harness logika
node --check <extracted>.js
node test.js   # harness di scratchpad: ribuan assert (durasi, no teks rusak, compliance, dll)
```

Untuk verifikasi UI: render dengan headless Chrome
(`--headless --screenshot`), atau driver `<script>` yang memanggil `renderHome()`, `startWizard()`,
`doGenerate()` lalu cek `document.title`/DOM. Selalu jalankan pengecekan logika + minimal satu
render nyata sebelum menyatakan selesai.

## Arsitektur prototype (`content-engine.html`)

Satu file: `<style>` (design system) + `<script>` (semua logika). Urutan blok:

- **Util & storage** — `el()` (pembuat DOM), `store` (localStorage `ce3_*`), `mulberry()` (PRNG
  ber-seed → hasil deterministik & bisa direproduksi).
- **`BANK`** — data per kategori (skincare/fnb/fashion/service/edu/other): kesalahan, tanda, mitos,
  tips, topik, visual, hashtag, saran onboarding, aturan aman default.
- **Engine** — `factsOf()` (rakit fakta brand), `sanitize()`/`SAFE_SWAPS` (compliance),
  `buildHashtags()`, `HOOKS`/`makeHooks()` (12 pola hook).
- **Generator** — `genScript`, `genCarousel`, `genCaption`, `genStoryboard`, `genIdeas` →
  registry `TYPES`. Semua menerima `(client, daily, seed)`, mengembalikan objek terstruktur.
- **Analyzer** — `analyzePost`/`analyzeAccount` (analisis teks nyata), `reviewReport`,
  `compareReport`/`GAP_PLAYS`.
- **UI** — `WIZ_STEPS` + `renderWizard` (onboarding 11 layar), `renderHome`, `openBrand`
  (tab Bikin/Riset/Profil), `renderResult` + renderer per jenis.

Detail peran otomatis di [AGENTS.md](AGENTS.md), kontrak tiap skill di [SKILLS.md](SKILLS.md),
sistem visual di [DESIGN.md](DESIGN.md).

## Aturan & konvensi (wajib dijaga)

- **Bahasa Indonesia** untuk semua teks yang dilihat user & konten yang dihasilkan.
- **Compliance bukan opsional.** Output apa pun harus lewat `sanitize()`. Skincare tanpa klaim
  medis/"memutihkan"; F&B tanpa klaim kesehatan; tanpa superlatif kosong. Kata terlarang brand
  tidak boleh muncul.
- **Deterministik.** Jangan pakai `Math.random()`/`Date.now()` di dalam generator — pakai seed
  (`mulberry(client.id + '|' + type + '|' + topic + '|' + seed)`) supaya hasil bisa direproduksi
  dan tombol 🎲 memberi variasi terkontrol.
- **Output terstruktur, bukan teks bebas.** Generator mengembalikan objek; renderer yang membuat
  timeline/preview/kalender + tombol salin. Jangan render blok teks mentah.
- **Kualitas konten = prioritas.** Hook di 3 detik pertama, satu CTA, rasio pillar 80/20, hook
  punya alasan "kenapa works", tiap hasil punya catatan pembelajaran.
- **Desain**: pasir + pinus + koral, serif Fraunces, hindari look template AI generik (gradien
  ungu, glassmorphism). Ikuti token di [DESIGN.md](DESIGN.md). Token landing ada inline di
  `public_html/index.html`.
- **Privasi**: data user disimpan di localStorage browser saja; tidak dikirim ke mana-mana.

## Setelah mengubah prototype

Sinkronkan ke frontend static yang di-deploy:

```bash
node prototype/build-app.mjs   # → public_html/app.{html,js,css}
```

## Git

Branch kerja saat ini: `claude/ai-agent-automation-platform-fekjbh`. Commit/push hanya bila diminta.
