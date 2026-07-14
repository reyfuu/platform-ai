<div align="center">

# ProdPilot

**Pabrik konten ber-skala untuk banyak brand sekaligus.**

AI menjalankan rantai produksi konten per brand — dari riset sampai aset siap publikasi —
sehingga satu tim bisa melayani puluhan brand secara paralel.

`Multi-brand` · `Chat-first` · `Compliance-first (BPOM/halal/SARA)` · `Human-in-the-loop`

</div>

---

## ⚡ Coba sekarang (prototype)

Mau langsung uji coba tanpa setup? Buka **[`prototype/content-engine.html`](prototype/content-engine.html)**
— satu file, double-click di browser, **tanpa install/DB/server**. Klik **Muat contoh** →
pilih brand → **Generate**. Jalan di **mode demo** tanpa API key; isi Anthropic API key
(⚙️) untuk hasil sungguhan. Detail: [prototype/README.md](prototype/README.md).

---

## Daftar isi

- [Coba sekarang (prototype)](#-coba-sekarang-prototype)
- [Visi](#visi)
- [MVP sekarang — Content Engine](#mvp-sekarang--content-engine)
- [Roadmap jangka panjang — 4 pilar](#roadmap-jangka-panjang--4-pilar)
- [Status](#status)
- [Arsitektur (monorepo)](#arsitektur-monorepo)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Dokumen](#dokumen)

---

## Visi

ProdPilot adalah **platform otomasi produksi konten untuk banyak brand sekaligus**. Tujuan
akhirnya adalah loop tertutup **riset → produksi → publish → report** yang berjalan per brand
secara otomatis, dengan manusia sebagai approver.

**Model bisnis:** Hybrid — mulai sebagai agency/done-for-you (validasi + revenue awal), lalu
fitur yang sudah matang diproduktisasi menjadi SaaS self-serve.

**Platform fokus:** Instagram & TikTok.

---

## MVP sekarang — Content Engine

Yang sedang dibangun lebih dulu adalah **Content Engine**: mesin konten harian untuk agency
yang memegang banyak brand klien (skincare, F&B, fashion, jasa, dll). Spec lengkapnya ada di
**[docs/CONTENT_ENGINE_HANDBOOK.md](docs/CONTENT_ENGINE_HANDBOOK.md)**.

**Ide inti:** tim isi profil brand **satu kali per klien**, lalu **tiap pagi tinggal generate**.
AI mengeluarkan konten dengan gaya yang nempel ke tiap brand dan aman secara aturan.

### Alur

```
Intake brand (1x/klien)  →  Daily input (tiap pagi)  →  AI generate  →  Review & approve  →  Posting
```

Tiap generate menggabungkan **System Prompt + Profil Brand + Knowledge Playbook + Compliance**,
lalu mengeluarkan **versi enak-dibaca + blok JSON terstruktur**.

### Output yang dihasilkan (generators)

| Generator | Isi |
|---|---|
| **Script Reels/TikTok** | 2 opsi hook, scene (visual/voiceover/teks on-screen/durasi), CTA, saran sound |
| **Carousel Instagram** | 6–8 slide (headline + subteks + visual), caption, 3–5 hashtag |
| **Storyboard Video** | Shot list siap-shoot pakai HP (kamera, talent/props, B-roll, catatan produksi) |
| **Caption + Hashtag** | Caption panjang & pendek, 5 variasi hook, hashtag |
| **Ide Konten (mingguan)** | 7 ide siap-eksekusi, tersebar ke content pillars (80% value / 20% jualan) |

> **Paket Lengkap** = script + carousel + caption sekaligus dalam satu klik.

### Yang bikin beda

- **Compliance-first** — skincare ikut aturan BPOM (tanpa over-claim/superlatif), F&B jelas
  halal/lokasi/channel order, semua konten hindari SARA & body shaming.
- **Knowledge Playbook** — best-practice hook, struktur retensi, copywriting (PAS/AIDA/BAB/FAB),
  carousel, caption, hashtag, dan konteks pasar Indonesia — disuntik ke prompt tiap generate.
- **Multi-brand** — simpan & kelola banyak profil brand, voice & visual konsisten per brand.
- **Prinsip** — AI = drafter, manusia = approver. Selalu ada review sebelum posting.

---

## Roadmap jangka panjang — 4 pilar

Setelah Content Engine matang, ProdPilot berkembang ke empat pilar penuh (lihat
[PRD](docs/PRD.md) & [Tech Spec](docs/TECH_SPEC_MVP.md)):

1. **Competitor & Market Intelligence** — riset organik + iklan kompetitor (Meta Ads Library) → insight & ide.
2. **Script Engine** — naskah video multi-varian per platform.
3. **Carousel Engine** — copy slide-per-slide + desain carousel konsisten brand (Canva).
4. **AI Video Engine** — video dari script + voice-over + subtitle + assembly (Higgsfield).

Ditutup dengan orkestrasi end-to-end, scheduler/publish, report ke klien, lalu produktisasi SaaS.

---

## Status

🚧 **Fondasi + Content Engine generator (otak) sudah jalan.**

| Area | Status |
|---|---|
| Auth (Bearer token = `User.apiToken`) | ✅ |
| Multi-tenant (semua query ter-scope `orgId`) | ✅ |
| Model Org/Brand/User + Brand Voice + Brand Kit + kategori/profil intake | ✅ |
| Chat shell (Conversation/Message → Job) | ✅ |
| **Prompt Engine** (system prompt = profil + playbook + compliance) | ✅ |
| **Generator**: script · carousel · storyboard · caption · ide mingguan | ✅ via chat |
| **LLM caller** (Anthropic, Sonnet default) + **mode demo** tanpa API key | ✅ |
| **Brand Voice "training"** dari IG handle (scrape Apify / caption manual) | ✅ chat, API & prototype |
| **Review IG** (skor per aspek + rekomendasi) & **Bandingkan Kompetitor** (gap + hook bank) | ✅ prototype |
| **Onboarding wizard** + UI redesign (hasil terstruktur, streaming, mobile-ready) | ✅ prototype |
| Worker generator (rakit prompt → LLM → simpan hasil → update chat) | ✅ |
| Web UI chat-first + brand switcher + polling hasil | ✅ |
| Pilar berat: Research (Meta Ads) · desain Canva · Video (Higgsfield) | ⬜ Fase 2+ |

> Ketik perintah di chat (mis. _"Buatkan script Reels 30 detik promo bundling"_) → worker
> mendeteksi jenis output, merakit system prompt dari profil brand + playbook + compliance,
> memanggil LLM, lalu menampilkan hasil (teks + JSON) di chat. Tanpa `ANTHROPIC_API_KEY`
> jalan di **mode demo**. Roadmap build: [Tech Spec §11](docs/TECH_SPEC_MVP.md).

---

## Arsitektur (monorepo)

Ditargetkan untuk **shared hosting** — frontend static + backend PHP, tanpa Node/Postgres/Redis.

```
(root)        Laravel 13 (app/ routes/     4 endpoint stateless: scrape IG/TikTok/YouTube + cross-post
              config/ vendor/ …)             aplikasi di ATAS docroot
public_html/  index.html (landing Vue)     DOCUMENT ROOT (cPanel): frontend + entry Laravel
              app.{html,js,css}            aplikasi lengkap (build dari prototype)
              index.php .htaccess          entry + rewrite Laravel → satu domain, tanpa CORS
prototype/    content-engine.html          SUMBER app (double-click, mode demo, tanpa server)
docs/         PRD, tech spec, handbook, panduan dev
```

> **Dua jalur:** `prototype/` (di-build ke `public_html/`) = produk utama, jalan penuh di browser.
> Root repo = Laravel API opsional untuk riset kompetitor & publish. Deploy: [DEPLOY-SHARED-HOSTING.md](DEPLOY-SHARED-HOSTING.md).
>
> Stack lama (NestJS `apps/api` + Next.js `apps/web` + Postgres/Redis) sudah **diganti** oleh
> Laravel + frontend static di atas. Baris ✅ pada tabel Status merujuk stack lama tersebut.

---

## Menjalankan secara lokal

```bash
# Frontend: build dari prototype → public_html, lalu buka di browser
node prototype/build-app.mjs
open public_html/index.html        # atau app.html langsung

# Backend Laravel (di root repo — butuh PHP 8.2+ & Composer)
composer install
cp .env.example .env && php artisan key:generate   # kalau .env belum ada
php artisan serve --port=4000      # http://127.0.0.1:4000/api/v1/...
php verify.php                     # self-check logika scraper (tanpa jaringan)
```

Sambungkan frontend → backend: buka app → ⚙️ → **Backend Riset** → isi `http://localhost:4000`.
Panduan deploy shared hosting: **[DEPLOY-SHARED-HOSTING.md](DEPLOY-SHARED-HOSTING.md)**.

---

## Dokumen

| Dokumen | Isi |
|---|---|
| 🧭 [Content Engine — Handbook](docs/CONTENT_ENGINE_HANDBOOK.md) | **Spec MVP**: intake, daily input, system prompt, playbook, compliance, generators, build & deploy |
| 📄 [Product Requirements (PRD)](docs/PRD.md) | Visi, model bisnis, 4 pilar, arsitektur agent, roadmap |
| 🛠️ [Technical Spec — MVP Fase 1](docs/TECH_SPEC_MVP.md) | Arsitektur, data model, desain agent, kontrak API, rencana build |
| 🚀 [Development — Sprint 1](docs/DEVELOPMENT.md) | Cara setup & jalankan scaffold lokal |

> Referensi produk sejenis: [Vamos AI](https://getvamos.ai/) — chat-first, brand voice profile, riset terintegrasi, multi-brand.
