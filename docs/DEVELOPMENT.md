# Development — Backend Laravel + Frontend static

Monorepo untuk deploy shared hosting (tanpa Node/Postgres/Redis di server):

```
(root)        Laravel 13           API opsional: scrape IG/TikTok/YouTube + cross-post (docroot = public_html/)
prototype/    content-engine.html   SUMBER app (double-click, jalan di browser)
public_html/  index.html + app.*    frontend static (hasil build dari prototype)
docs/         PRD, tech spec, dokumen ini
```

> **Stack lama NestJS + Next.js + Prisma/Postgres sudah dihapus.** Semua generate konten
> sekarang jalan 100% di browser (`prototype`/`public_html`). Backend Laravel cuma untuk fitur
> riset kompetitor & cross-post. Deploy: [../DEPLOY-SHARED-HOSTING.md](../DEPLOY-SHARED-HOSTING.md).

## Frontend

```bash
node prototype/build-app.mjs       # content-engine.html → public_html/app.{html,js,css}
open public_html/index.html        # landing Vue (CDN) → tombol utama buka /app.html
```

Tanpa build tools — `index.html` pakai Vue 3 via CDN, sisanya static. Edit fitur di
`prototype/content-engine.html` lalu jalankan build untuk sinkron.

## Backend Laravel

### Prasyarat
- PHP 8.2+ & Composer

### Jalan lokal (dari root repo)
```bash
composer install
cp .env.example .env && php artisan key:generate   # kalau .env belum ada
php artisan serve --port=4000
```

Tanpa database — 4 endpoint ini stateless (tanpa auth/DB/queue). Kredensial publish dikirim
per-request dari browser, tidak disimpan.

### Test
```bash
php verify.php                     # self-check logika scraper murni (tanpa jaringan)
```

### Smoke test (butuh jaringan)
```bash
BASE=http://127.0.0.1:4000/api/v1

curl "$BASE/youtube/MrBeast"       # subscriber + video terbaru (views)
curl "$BASE/tiktok/tiktok"         # agregat TikTok publik
curl "$BASE/ig/natgeo"             # stats IG (bisa 502 kalau IG rate-limit — normal)

# cross-post dry-run (tanpa panggil API asli)
curl -X POST "$BASE/publish/all" -H 'content-type: application/json' \
  -d '{"platforms":["tiktok"],"caption":"halo","mediaUrl":"https://x.com/v.mp4","mediaType":"video","dryRun":true,"creds":{"tiktokToken":"t"}}'
```

## Endpoint backend

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/ig/{handle}` | stats + engagement Instagram publik (502 kalau diblok/privat) |
| GET | `/api/v1/tiktok/{handle}` | agregat TikTok publik (followers, total likes, jumlah video) |
| GET | `/api/v1/youtube/{handle}` | subscriber + video terbaru (views) |
| POST | `/api/v1/publish/all` | cross-post IG/FB/TikTok; kredensial per-request; `dryRun` didukung |

## Sambungkan frontend → backend

Buka app (`public_html/app.html`) → ⚙️ → **Backend Riset** → isi URL backend (mis.
`http://localhost:4000` lokal, `https://api.domainmu.com` produksi). App otomatis menambah `/api/v1`.

## Catatan jujur
- Scraping dari IP shared hosting sering di-rate-limit/blok IG (paling sensitif). TikTok/YouTube
  lebih toleran. UI sudah sediakan fallback "isi manual" saat sumber eksternal 502.
- Publish butuh kredensial resmi (Meta Page Access Token, TikTok OAuth) yang diisi user di app.
