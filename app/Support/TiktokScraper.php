<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Scraper profil publik TikTok TANPA login/API berbayar (best-effort).
 * Port setia dari insights/tiktok-scraper.ts. Hanya AGREGAT publik
 * (followers, total likes/hearts, jumlah video) — per-video butuh provider
 * bertandatangan.
 */
class TiktokScraper
{
    /** Parse blok JSON __UNIVERSAL_DATA_FOR_REHYDRATION__ jadi profil (pure). */
    public static function parseUniversalData(array $json, string $username): array
    {
        $scope = $json['__DEFAULT_SCOPE__'] ?? [];
        $ud = $scope['webapp.user-detail']['userInfo'] ?? [];
        $stats = $ud['stats'] ?? $ud['statsV2'] ?? [];
        $user = $ud['user'] ?? [];
        $num = function ($v): ?int {
            if ($v === null) {
                return null;
            }
            $n = (float) $v;

            return is_finite($n) ? (int) $n : null;
        };

        return [
            'username' => preg_replace('/^@/', '', $user['uniqueId'] ?? $username),
            'nickname' => $user['nickname'] ?? '',
            'signature' => $user['signature'] ?? '',
            'followers' => $num($stats['followerCount'] ?? null),
            'hearts' => $num($stats['heartCount'] ?? $stats['heart'] ?? null),
            'videoCount' => $num($stats['videoCount'] ?? null),
            'following' => $num($stats['followingCount'] ?? null),
            'verified' => (bool) ($user['verified'] ?? false),
        ];
    }

    /** Ambil HTML profil TikTok dan ekstrak agregat publik. */
    public static function profile(string $handle): array
    {
        $username = strtolower(trim(preg_replace('/^@/', '', $handle)));
        if (! $username) {
            throw new RuntimeException('Handle TikTok kosong.');
        }

        try {
            $res = Http::withHeaders([
                'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'accept-language' => 'en-US,en;q=0.9',
            ])->timeout(15)->get('https://www.tiktok.com/@'.rawurlencode($username));
        } catch (\Throwable $e) {
            throw new RuntimeException('Gagal menghubungi TikTok: '.substr((string) $e->getMessage(), 0, 120));
        }
        if ($res->status() === 404) {
            throw new RuntimeException("Akun @{$username} tidak ditemukan.");
        }
        if (! $res->successful()) {
            throw new RuntimeException('TikTok membalas '.$res->status().' — kemungkinan rate-limit/diblok sementara. Coba lagi 1-2 menit.');
        }

        $html = $res->body();
        if (! preg_match('/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s', $html, $m)) {
            throw new RuntimeException('Data TikTok tidak ditemukan (kemungkinan login wall / halaman berubah).');
        }
        $json = json_decode($m[1], true);
        if (! is_array($json)) {
            throw new RuntimeException('Respons TikTok tidak bisa dibaca.');
        }
        $profile = self::parseUniversalData($json, $username);
        if ($profile['followers'] === null && $profile['videoCount'] === null) {
            throw new RuntimeException("Akun @{$username} tidak ditemukan atau tidak publik.");
        }

        return $profile;
    }
}
