# Menjalankan & Deploy — ProdPilot / Content Engine

Satu pintu masuk: cara menjalankan lokal, dan cara ini berjalan di server saat deploy.
Untuk detail per bagian, lihat [DEVELOPMENT.md](DEVELOPMENT.md) (lokal) dan
[../DEPLOY-SHARED-HOSTING.md](../DEPLOY-SHARED-HOSTING.md) (server).

## Yang perlu dipahami dulu

Aplikasi ini punya **dua bagian yang bisa jalan terpisah**:

1. **Generator konten** — jalan 100% di browser, **tanpa server & tanpa API key**. Ini produk
   utamanya. File `prototype/content-engine.html` (sumber) → di-build jadi
   `public_html/app.{html,js,css}` (yang di-deploy).
2. **Backend Laravel (opsional)** — cuma nyalain fitur riset kompetitor (scrape IG/TikTok/YouTube
   publik) & cross-post. Tanpa DB/auth/queue. Kalau tidak dipakai, generate konten tetap jalan.

> Kesimpulan: kalau cuma butuh generate konten, **cukup upload `public_html/` ke hosting apa pun**.
> Backend hanya diperlukan kalau mau fitur riset/publish otomatis.

---

## A. Menjalankan lokal

### 1. Generator konten (tanpa build, tanpa server)

Buka file di browser — tinggal double-click:

```
prototype/content-engine.html
```

Ini file tunggal, semua logika di dalamnya. Untuk kerja fitur/UX, edit di sini.

### 2. Sinkron ke frontend yang di-deploy

Setelah mengubah prototype, build ke `public_html/`:

```bash
node prototype/build-app.mjs   # content-engine.html → public_html/app.{html,js,css}
open public_html/index.html    # landing Vue (CDN) → tombol utama buka /app.html
```

Tanpa build tools rumit — `index.html` pakai Vue 3 via CDN, sisanya static.

### 3. Backend Laravel (opsional — butuh PHP 8.2+ & Composer)

```bash
composer install
cp .env.example .env && php artisan key:generate   # kalau .env belum ada
php artisan serve --port=4000                       # docroot otomatis = public_html/
```

Cek jalan:

```bash
php verify.php                                       # self-check logika scraper (tanpa jaringan)
curl http://127.0.0.1:4000/api/v1/youtube/MrBeast    # smoke test (butuh jaringan)
curl http://127.0.0.1:4000/app.html                  # frontend disajikan dari public_html
```

Sambungkan app ke backend: buka `app.html` → ⚙️ → **Backend Riset** → isi
`http://localhost:4000` (app otomatis menambah `/api/v1`).

---

## B. Bagaimana ini berjalan di server (deploy)

### Prinsip: satu domain, `public_html/` = document root

Struktur repo dirancang persis untuk konvensi cPanel/DirectAdmin. Aplikasi Laravel ada **di atas**
docroot; frontend static + entry Laravel (`index.php`) ada **di dalam** `public_html/`:

```
/home/USER/                 ← root aplikasi Laravel (app, routes, vendor, storage, .env, …)
/home/USER/public_html/     ← DOCUMENT ROOT (bawaan cPanel)
    index.html              landing Vue (CDN)
    app.html app.js app.css aplikasi generator (hasil build prototype)
    index.php .htaccess      entry + rewrite Laravel
```

Routing diatur `public_html/.htaccess`:

| Request | Dilayani oleh |
|---|---|
| `/` | `index.html` (landing) — via `DirectoryIndex index.html index.php` |
| `/app.html`, `/app.js`, `/app.css` | file static langsung |
| `/api/v1/*` | `index.php` → Laravel (scrape & publish) |

`bootstrap/app.php` sudah `->usePublicPath(.../public_html)`, jadi `asset()`, `storage:link`, dan
`php artisan serve` semua konsisten menunjuk `public_html/` — tanpa edit path.

### Langkah deploy

```bash
# 1. Siapkan lokal (di root repo)
composer install --optimize-autoloader --no-dev   # atau ikut-upload folder vendor/
node prototype/build-app.mjs                        # sinkron prototype → public_html/app.*

# 2. Upload SELURUH isi repo ke /home/USER/
#    (public_html/ sudah jadi docroot bawaan → tidak perlu edit index.php)

# 3. Izin & .env produksi (di server)
chmod -R 775 storage bootstrap/cache
```

`.env` produksi:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domainmu.com
```

Tak perlu database — endpoint stateless (tanpa auth/DB/queue).

### Sambungkan frontend → API di produksi

Buka `https://domainmu.com/app.html` → ⚙️ → **Backend Riset** → isi `https://domainmu.com`
(satu domain, tanpa CORS). Klik **Ambil otomatis** untuk tes.

---

## Deploy tanpa backend (paling ringan)

Kalau tidak butuh riset/publish otomatis: upload **hanya `public_html/index.html` + `app.*`** ke
hosting static apa pun (Netlify, GitHub Pages, cPanel biasa). Generator konten jalan penuh di
browser. Fitur riset tinggal pakai fallback "isi manual" di UI.

---

## Catatan jujur soal server

- **Scraping dari IP shared hosting sering di-rate-limit/blok Instagram** (paling sensitif).
  TikTok & YouTube lebih toleran. Kalau IG balas 502, itu dari IG bukan bug — UI sudah kasih
  fallback "isi manual". VPS/proxy residensial lebih stabil kalau IG wajib jalan.
- **Publish** butuh kredensial resmi user (Meta Page Access Token, TikTok OAuth) yang diisi di app,
  **tidak disimpan di server** (dikirim per-request).
- Hosting yang **tak mengizinkan aplikasi di atas `public_html`** (jarang): taruh isi Laravel di
  subfolder, lalu sesuaikan 2 path `__DIR__.'/../…'` di `public_html/index.php`.
- **Privasi**: data brand user disimpan di localStorage browser saja, tidak dikirim ke mana-mana.
