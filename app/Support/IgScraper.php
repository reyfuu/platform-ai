<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Scraper profil publik Instagram TANPA login/API berbayar (best-effort).
 * Port setia dari insights/ig-scraper.ts. Hanya data PUBLIK. IG bisa
 * rate-limit/blok → lempar RuntimeException dengan pesan jelas.
 */
class IgScraper
{
    /** Bersihkan input jadi username IG bersih. */
    public static function cleanHandle(string $handle): string
    {
        $s = trim($handle);
        $s = preg_replace('#^https?://#i', '', $s);
        $s = preg_replace('#^www\.#i', '', $s);
        $s = preg_replace('#^instagram\.com/#i', '', $s);
        $s = preg_replace('/[?#].*$/', '', $s);
        $s = preg_replace('/^@+/', '', $s);
        $s = preg_replace('#/+$#', '', $s);
        $s = explode('/', $s)[0];

        return strtolower(trim($s));
    }

    /** Ambil followers/following/postCount dari og:description IG (fallback logged-out). */
    public static function parseOgDescription(string $html): ?array
    {
        if (! preg_match('/property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']/i', $html, $m)
            && ! preg_match('/content=["\']([^"\']+)["\'][^>]*property=["\']og:description["\']/i', $html, $m)) {
            return null;
        }
        $txt = $m[1];
        $grab = function (string $re) use ($txt): ?int {
            return preg_match($re, $txt, $x) ? HumanCount::parse($x[1]) : null;
        };
        $followers = $grab('/([\d.,]+\s*[kmb]?)\s*(?:followers|pengikut)/i');
        $following = $grab('/([\d.,]+\s*[kmb]?)\s*(?:following|mengikuti|diikuti)/i');
        $postCount = $grab('/([\d.,]+\s*[kmb]?)\s*(?:posts|kiriman|postingan)/i');
        if ($followers === null && $following === null && $postCount === null) {
            return null;
        }

        return compact('followers', 'following', 'postCount');
    }

    // STRATEGI 1: endpoint web_profile_info — data lengkap.
    private static function viaApi(string $username): array
    {
        $url = 'https://www.instagram.com/api/v1/users/web_profile_info/?username='.rawurlencode($username);
        $headers = [
            'x-ig-app-id' => '936619743392459',
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'accept' => '*/*',
            'accept-language' => 'en-US,en;q=0.9',
            'x-requested-with' => 'XMLHttpRequest',
            'sec-fetch-site' => 'same-origin',
            'sec-fetch-mode' => 'cors',
            'sec-fetch-dest' => 'empty',
            'referer' => "https://www.instagram.com/{$username}/",
            'origin' => 'https://www.instagram.com',
        ];
        $res = null;
        $lastErr = '';
        for ($attempt = 0; $attempt < 2; $attempt++) {
            if ($attempt) {
                usleep(1200 * 1000);
            }
            try {
                $res = Http::withHeaders($headers)->timeout(15)->get($url);
            } catch (\Throwable $e) {
                $lastErr = 'Gagal menghubungi Instagram: '.substr((string) $e->getMessage(), 0, 100);

                continue;
            }
            if ($res->status() === 404) {
                throw new RuntimeException("Akun @{$username} tidak ditemukan.");
            }
            if ($res->successful()) {
                break;
            }
            $lastErr = 'Instagram membalas '.$res->status();
            if (! in_array($res->status(), [429, 500, 502, 503, 504], true)) {
                break; // 401/403 = blok tegas
            }
        }
        if (! $res || ! $res->successful()) {
            throw new RuntimeException(
                ($lastErr ?: 'Instagram tidak merespons').' — kemungkinan rate-limit/diblok sementara oleh Instagram (umum untuk scrape dari server). Coba lagi 1-2 menit, atau isi angka manual.'
            );
        }

        $data = $res->json();
        $u = $data['data']['user'] ?? null;
        if (! $u) {
            throw new RuntimeException("Akun @{$username} tidak ditemukan atau tidak publik.");
        }

        $edges = $u['edge_owner_to_timeline_media']['edges'] ?? [];
        $posts = array_map(function ($e) {
            $n = $e['node'] ?? [];
            $type = ($n['__typename'] ?? '') === 'GraphSidecar' ? 'carousel'
                : (($n['is_video'] ?? false) ? 'video' : 'image');

            return [
                'shortcode' => $n['shortcode'] ?? '',
                'type' => $type,
                'caption' => $n['edge_media_to_caption']['edges'][0]['node']['text'] ?? '',
                'likes' => $n['edge_liked_by']['count'] ?? $n['edge_media_preview_like']['count'] ?? null,
                'comments' => $n['edge_media_to_comment']['count'] ?? null,
                'views' => $n['video_view_count'] ?? $n['video_play_count'] ?? null,
                'takenAt' => $n['taken_at_timestamp'] ?? null,
            ];
        }, $edges);

        return [
            'username' => $username,
            'fullName' => $u['full_name'] ?? '',
            'biography' => $u['biography'] ?? '',
            'followers' => $u['edge_followed_by']['count'] ?? null,
            'following' => $u['edge_follow']['count'] ?? null,
            'postCount' => $u['edge_owner_to_timeline_media']['count'] ?? null,
            'isPrivate' => (bool) ($u['is_private'] ?? false),
            'posts' => $posts,
        ];
    }

    // STRATEGI 2 (fallback): baca HTML profil → og:description. Hanya AGREGAT.
    private static function viaHtml(string $username): array
    {
        $url = 'https://www.instagram.com/'.rawurlencode($username).'/';
        $res = null;
        for ($attempt = 0; $attempt < 2; $attempt++) {
            if ($attempt) {
                usleep(1000 * 1000);
            }
            try {
                $res = Http::withHeaders([
                    'user-agent' => 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'accept-language' => 'en-US,en;q=0.9',
                ])->timeout(15)->get($url);
            } catch (\Throwable) {
                continue;
            }
            if ($res->successful()) {
                break;
            }
        }
        if (! $res || ! $res->successful()) {
            throw new RuntimeException('halaman IG membalas '.($res ? $res->status() : 'timeout'));
        }
        $og = self::parseOgDescription($res->body());
        if (! $og || $og['followers'] === null) {
            throw new RuntimeException('data profil tak ada di halaman (login wall).');
        }

        return [
            'username' => $username,
            'fullName' => '',
            'biography' => '',
            'followers' => $og['followers'],
            'following' => $og['following'],
            'postCount' => $og['postCount'],
            'isPrivate' => false,
            'posts' => [],
            'partial' => true,
            'note' => 'Angka per-post IG lagi nggak bisa ditarik otomatis (API diblok / akun privat). Followers udah keisi — isi like/komen/view manual buat hitung ER & konten viral.',
        ];
    }

    /** Orchestrator: coba API dulu, gagal → fallback HTML. */
    public static function profile(string $handle): array
    {
        $username = self::cleanHandle($handle);
        if (! $username) {
            throw new RuntimeException('Handle IG kosong.');
        }
        try {
            $full = self::viaApi($username);
            if (! count($full['posts'])) {
                $full['partial'] = true;
                if ($full['followers'] === null) {
                    try {
                        $alt = self::viaHtml($username);
                        $full['followers'] ??= $alt['followers'];
                        $full['following'] ??= $alt['following'];
                        $full['postCount'] ??= $alt['postCount'];
                    } catch (\Throwable) {
                        // biarkan; tetap balikin data API seadanya
                    }
                }
                $full['note'] ??= 'Angka per-post IG nggak kebaca (akun privat / dibatasi). Followers ada — isi like/komen/view manual buat ER & konten viral.';
            }

            return $full;
        } catch (\Throwable $apiErr) {
            try {
                return self::viaHtml($username);
            } catch (\Throwable) {
                throw new RuntimeException(
                    $apiErr->getMessage().' — kemungkinan rate-limit/diblok Instagram atau akun privat. Coba lagi 1-2 menit, cek ejaan @handle, atau isi angka manual.'
                );
            }
        }
    }

    /** Statistik deterministik dari post terbaru. */
    public static function computeStats(array $p): array
    {
        $posts = $p['posts'];
        $n = count($posts);
        $mix = ['carousel' => 0, 'video' => 0, 'image' => 0];
        $likeSum = $likeN = $comSum = $comN = 0;
        foreach ($posts as $post) {
            $mix[$post['type']]++;
            if (($post['likes'] ?? null) !== null) {
                $likeSum += $post['likes'];
                $likeN++;
            }
            if (($post['comments'] ?? null) !== null) {
                $comSum += $post['comments'];
                $comN++;
            }
        }
        $avgLikes = $likeN ? (int) round($likeSum / $likeN) : null;
        $avgComments = $comN ? (int) round($comSum / $comN) : null;
        $engagementPct = ($p['followers'] ?? null) && $avgLikes !== null
            ? round((($avgLikes + ($avgComments ?? 0)) / $p['followers']) * 100, 2)
            : null;

        $times = array_values(array_filter(array_map(fn ($x) => $x['takenAt'] ?? null, $posts), fn ($t) => $t !== null));
        $postsPerWeek = null;
        if (count($times) >= 2) {
            $spanDays = (max($times) - min($times)) / 86400;
            if ($spanDays > 0) {
                $postsPerWeek = round(($n - 1) / ($spanDays / 7), 1);
            }
        }

        return [
            'sampled' => $n,
            'mix' => $mix,
            'avgLikes' => $avgLikes,
            'avgComments' => $avgComments,
            'engagementPct' => $engagementPct,
            'postsPerWeek' => $postsPerWeek,
        ];
    }
}
