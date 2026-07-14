# Deploy ke Shared Hosting (Laravel + frontend static, satu domain)

Menggantikan stack Next.js + NestJS agar jalan di shared hosting biasa (cPanel/DirectAdmin).
**Satu aplikasi Laravel** di root repo, dengan **`public_html/` sebagai document root** (konvensi
cPanel). Frontend static + entry API (`index.php`) tinggal di `public_html/` yang sama → **satu
domain, tanpa CORS, tanpa subdomain**.

```
(root repo)          app/ routes/ config/ vendor/ storage/ …   ← aplikasi Laravel (DI ATAS docroot)
public_html/         ← DOCUMENT ROOT
  index.html         landing Vue (CDN, tanpa build)
  app.html app.js app.css   aplikasi lengkap (hasil build dari prototype)
  index.php .htaccess       entry + rewrite Laravel
```

- `/` → `index.html` (landing Vue) — diatur `DirectoryIndex index.html index.php` di `.htaccess`.
- `/app.html`, `/app.js`, `/app.css` → file static langsung.
- `/api/v1/*` → `index.php` → Laravel (scrape & publish).

Backend **opsional**: semua generate konten jalan 100% di browser. Laravel cuma nyalain
**auto-fetch stats kompetitor** & **cross-post**.

---

## 1. Siapkan lokal

```bash
# di root repo
composer install --optimize-autoloader --no-dev   # atau upload folder vendor/ ikut
cp .env.example .env && php artisan key:generate   # kalau .env belum ada
node prototype/build-app.mjs                        # sinkron prototype → public_html/app.*
```

## 2. Upload ke server (cPanel)

Struktur di server persis seperti repo — aplikasi Laravel di folder akun, `public_html/` sebagai
docroot bawaan cPanel:

```
/home/USER/                 ← root aplikasi Laravel (app, routes, vendor, storage, .env, …)
/home/USER/public_html/     ← docroot (index.php + index.html + app.*)
```

Upload **seluruh isi repo** ke `/home/USER/`. Karena `public_html/` sudah jadi docroot bawaan,
`index.php` di dalamnya menunjuk `__DIR__.'/../vendor'` dst → cocok tanpa edit.

> `bootstrap/app.php` sudah `->usePublicPath(.../public_html)`, jadi `asset()`, `storage:link`,
> dan `php artisan serve` semuanya konsisten ke `public_html/`.

## 3. Izin & .env produksi

```bash
chmod -R 775 storage bootstrap/cache
```

`.env`:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domainmu.com
```

Tak perlu database — endpoint stateless (tanpa auth/DB/queue).

## 4. Sambungkan frontend → API

Karena satu domain, buka app (`https://domainmu.com/app.html`) → ⚙️ → **Backend Riset** → isi
`https://domainmu.com` (app otomatis menambah `/api/v1`). Klik **Ambil otomatis** untuk tes.

---

## Endpoint API

| Method | Route | Fungsi |
|--------|-------|--------|
| GET | `/api/v1/ig/{handle}` | stats + engagement Instagram publik |
| GET | `/api/v1/tiktok/{handle}` | agregat TikTok publik |
| GET | `/api/v1/youtube/{handle}` | subscriber + video terbaru |
| POST | `/api/v1/publish/all` | cross-post IG/FB/TikTok (kredensial per-request) |

## Catatan jujur soal shared hosting

- **Scraping dari IP shared hosting sering di-rate-limit/blok** Instagram (paling sensitif).
  TikTok & YouTube biasanya lebih toleran. Kalau IG balas 502, itu dari IG bukan bug backend —
  UI sudah kasih fallback "isi manual". VPS/proxy residensial lebih stabil kalau IG wajib jalan.
- **Publish** butuh kredensial resmi user (Meta Page Access Token, TikTok OAuth) yang diisi di app,
  bukan disimpan di server.
- Hosting yang **tak mengizinkan aplikasi di atas `public_html`** (jarang): taruh isi Laravel di
  subfolder lalu sesuaikan 2 path `__DIR__.'/../…'` di `public_html/index.php`.

## Test lokal (dari root repo)

```bash
php verify.php                    # logika murni scraper (tanpa jaringan)
php artisan serve --port=4000     # docroot = public_html
curl http://127.0.0.1:4000/api/v1/youtube/MrBeast
curl http://127.0.0.1:4000/app.html    # frontend disajikan dari public_html
```
