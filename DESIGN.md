# DESIGN.md — Design System Content Engine

Arah visual: **Clean SaaS** — terinspirasi produk seperti sandcastles.ai: latar near-white, teks
charcoal, **satu aksen** (electric blue), whitespace lega, flat & modern. Tipografi jadi bintang lewat
display grotesk mewah. **Nol emoji di UI** — semua ikon = garis SVG (stroke) yang konsisten. Emoji
hanya boleh muncul di dalam **konten yang di-generate** (caption sosmed), bukan chrome aplikasi.

Sengaja menjauh dari look "vibecoding" / template AI generik (gradien ungu, glassmorphism, emoji
sebagai ikon, tombol offset-shadow mainan).

Implementasi: CSS variables di `prototype/content-engine.html` (blok `:root`), disinkron ke
`public_html/app.css` lewat `node prototype/build-app.mjs`. Landing Vue (`public_html/index.html`)
pakai token yang sama inline.

## Prinsip color theory

- **1 hue netral + 1 aksen.** Netral = skala abu dingin (charcoal → slate → muted). Aksen tunggal =
  **electric blue** (`#014BDF`) untuk aksi, state aktif, dan hal positif. Tidak ada warna aksen kedua
  yang bersaing. (Token tetap bernama `--pine` demi kompatibilitas — isinya sekarang biru.)
- **Semantik hemat.** Coral (atensi), gold (peringatan), red (destruktif) — hanya untuk makna, tidak
  pernah dekoratif. Jangan dua warna semantik dalam satu elemen.
- **Kontras dulu.** Teks utama pada latar ≈ AAA (>12:1). Warna tidak pernah jadi satu-satunya penanda
  (skor selalu ada angkanya, status selalu ada label/ikon).

## Warna

| Token | Hex | Pakai untuk |
|---|---|---|
| `--bg` | `#FBFBFA` | latar halaman (near-white) |
| `--bg-2` | `#F3F4F2` | permukaan input / sekunder |
| `--card` | `#FFFFFF` | kartu |
| `--ink` | `#14181F` | teks utama (charcoal), tab/pill aktif |
| `--ink-2` / `--ink-3` | `#5A626F` / `#8B94A1` | teks sekunder / tersier |
| `--line` / `--line-2` | `#EAECEF` / `#DBDEE4` | garis rambut / border kontrol |
| `--pine` | `#014BDF` | **aksen tunggal** (electric blue): CTA, aktif, skor bagus, ikon fitur |
| `--pine-dark` / `--pine-soft` | `#0139AB` / `#E8EEFD` | hover primary / latar aksen lembut (blue tint) |
| `--coral` (+ `-dark`/`-soft`) | `#C6553A` | semantik atensi (hemat) |
| `--gold` (+ `-soft`) | `#B07A16` | peringatan lembut |
| `--red` (+ `-soft`) | `#C13B36` | destruktif (hapus) |

Meter skor: <5 coral, 5–7.5 gold, >7.5 blue (`--pine`) — **angka selalu ditampilkan**.

## Tipografi (mewah, sans-first)

- **Display**: `Bricolage Grotesque` (weight 700/800, opsz) — grotesk editorial yang mewah, dipakai
  untuk h1–h4, judul hasil, nama brand, angka besar. Letter-spacing rapat (−.025 s/d −.035em).
- **Body/UI**: `Inter` (400–800) — sans premium, legibilitas tinggi, tabular untuk angka. Body 15px/1.6,
  letter-spacing −.006em.
- Token: `--serif` = Bricolage (nama dipertahankan demi kompatibilitas, isinya sans), `--sans` = Inter.
- Skala: hero `clamp(38px, 6.6vw, 66px)` w800; judul section 20px; tiny 12.5px.
- `em.fancy` = pine + bold (bukan italic) untuk penekanan di headline.

## Bentuk & kedalaman (flat)

- Radius: kartu 14px (`--r-lg`), input/kontrol/tombol 10px (`--r-md`), pill/tab/chip 999px.
- **Flat.** Shadow dua level halus (`--sh-1` istirahat, `--sh-2` hover) berwarna ink-transparan
  dingin. **Tidak ada** offset-shadow taktil, **tidak ada** grain overlay, **tidak ada** translateY
  saat hover — feedback lewat perubahan warna latar/border.
- Border = garis rambut 1px. Fokus input: ring biru `0 0 0 4px rgba(1,75,223,.14)`.

## Sistem ikon (garis SVG — WAJIB, bukan emoji)

- Sumber: objek `ICONS` (path Lucide-style, viewBox 24) + `svgIcon(name)` di `content-engine.html`.
  Stroke **1.75** = kesan garis halus/mewah, `currentColor`, cap/join round. Landing Vue
  (`public_html/index.html`) punya set kecil yang sama (fungsi `icon()` inline).
- **Konversi otomatis**: `el()` + `iconifyStatic()` menyapu emoji di `textContent`/`html`/toast/markup
  statis → ikon. Emoji yang **kekenal** (`EMOJI_ICON`) jadi ikon; yang tak kenal **dibuang** supaya UI
  100% bebas emoji. Panah teks (`←` `→` `↗`) sengaja **tidak** disentuh (glyph tipografi, bukan emoji).
- **Konten mentah dilindungi**: kelas di `RAW_EMOJI_CLASS` (`copybox`, `s-head`, `s-sub`, `quote`,
  `day-card`, dst) dilewati → emoji di caption hasil generate tetap utuh.
- **Tile ikon mewah**: ikon prominen (feature band, type-card, cat-card, result-head) duduk di kotak
  tint `--pine-soft` radius 11px → kesan premium, bukan glyph telanjang.
- Menambah ikon: tambah entri `ICONS[name]` (path) lalu map `EMOJI_ICON['🙂'] = 'name'`. Untuk landing,
  tambah set ikon inline di `public_html/index.html`.

## Komponen inti

| Komponen | Ciri |
|---|---|
| **Tombol** | flat; default = border garis rambut + hover latar `--bg-2`; `.primary` = pine solid; radius 10px |
| **Tab / Pill** | pill 999px; aktif = `--ink` solid teks putih; hover = border menegas |
| **Chip / Badge** | pill kecil; badge pine/coral/gold untuk status |
| **Type card** | tile ikon pine-soft + judul + desc; checkbox SVG (centang muncul saat aktif); aktif = border+ring pine |
| **Meter skor** | label + bar + angka; warna ikut nilai, angka selalu tampil |
| **Kartu hasil** | `result-head` = tile ikon + judul; konten di `copybox` (emoji konten aman) |
| **Timeline `.beat`** | kolom waktu (badge `0–3s`) + visual/VO/teks-di-layar |
| **Phone preview** | rasio 4:5, border garis rambut + `--sh-2` (bukan offset shadow) |
| **Learn box** | latar gold-soft, edukasi "Biar makin jago" di tiap hasil |

## Motion

Hemat & halus: `rise` (fade+geser 14px) saat view masuk, `pop` untuk slide/checkbox. Transisi warna
120–150ms. Tidak ada bounce/translateY taktil pada tombol.

## Checklist saat menambah UI

1. Pakai token warna (jangan hex mentah). Aksen = pine saja; coral/gold/red hanya semantik.
2. **Jangan tulis emoji sebagai ikon.** Pakai `icon(name)` / `svgIcon(name)`, atau biarkan emoji-mu
   otomatis dikonversi — pastikan glyph-nya ada di `EMOJI_ICON`.
3. Display pakai `--serif` (Bricolage), teks lain `--sans` (Inter).
4. Flat: border garis rambut, shadow halus, radius sesuai skala. Tanpa offset-shadow/grain.
5. Setelah ubah prototype: `node prototype/build-app.mjs` untuk sinkron ke `public_html/`.
