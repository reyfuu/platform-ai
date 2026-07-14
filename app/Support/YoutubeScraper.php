<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Scraper channel YouTube publik TANPA API key (best-effort).
 * Port setia dari insights/youtube-scraper.ts. Ambil /videos, ekstrak
 * ytInitialData, telusuri rekursif (layout YouTube sering berubah).
 * Likes & komentar per video TIDAK ada di daftar channel → null.
 */
class YoutubeScraper
{
    private static function textOf(mixed $node): string
    {
        if (! $node) {
            return '';
        }
        if (is_string($node)) {
            return $node;
        }
        if (isset($node['simpleText'])) {
            return $node['simpleText'];
        }
        if (isset($node['runs']) && is_array($node['runs'])) {
            return implode('', array_map(fn ($r) => $r['text'] ?? '', $node['runs']));
        }

        return '';
    }

    /** Telusuri ytInitialData → subscriber, videoCount, video terbaru. */
    public static function parseInitialData(array $data): array
    {
        $acc = ['subscribers' => null, 'videoCount' => null, 'title' => '', 'videos' => []];
        $seen = [];

        $walk = function ($node) use (&$walk, &$acc, &$seen) {
            if (! is_array($node)) {
                return;
            }

            if ($acc['subscribers'] === null && isset($node['subscriberCountText'])) {
                $t = self::textOf($node['subscriberCountText']);
                $m = preg_match('/([\d.,]+\s*(?:rb|ribu|jt|juta|m|k|b)?)\s*(subscriber|pelanggan)/i', $t, $mm);
                $acc['subscribers'] = HumanCount::parse($m ? $mm[1] : $t);
            }
            if ($acc['subscribers'] === null && isset($node['content']) && is_string($node['content'])
                && preg_match('/subscriber|pelanggan/i', $node['content'])) {
                $acc['subscribers'] = HumanCount::parse($node['content']);
            }
            if ($acc['videoCount'] === null && (isset($node['videoCountText']) || isset($node['videosCountText']))) {
                $acc['videoCount'] = HumanCount::parse(self::textOf($node['videoCountText'] ?? $node['videosCountText']));
            }
            if (! $acc['title'] && isset($node['channelMetadataRenderer']['title'])) {
                $acc['title'] = $node['channelMetadataRenderer']['title'];
            }

            // layout LAMA (videoRenderer/gridVideoRenderer)
            $vr = $node['videoRenderer'] ?? $node['gridVideoRenderer'] ?? null;
            if ($vr && ! empty($vr['videoId']) && ! isset($seen[$vr['videoId']])) {
                $seen[$vr['videoId']] = true;
                $acc['videos'][] = [
                    'videoId' => $vr['videoId'],
                    'title' => mb_substr(self::textOf($vr['title'] ?? null), 0, 200),
                    'views' => HumanCount::parse(self::textOf($vr['viewCountText'] ?? null)),
                    'likes' => null,
                    'comments' => null,
                ];
            }
            // layout BARU (2024+): lockupViewModel
            $lm = $node['lockupViewModel'] ?? null;
            if ($lm && ! empty($lm['contentId']) && ! isset($seen[$lm['contentId']])) {
                $md = $lm['metadata']['lockupMetadataViewModel'] ?? null;
                $vtitle = $md['title']['content'] ?? '';
                $viewsTxt = '';
                $rows = $md['metadata']['contentMetadataViewModel']['metadataRows'] ?? [];
                foreach ($rows as $row) {
                    foreach ($row['metadataParts'] ?? [] as $part) {
                        $t = $part['text']['content'] ?? '';
                        if (preg_match('/view|ditonton/i', $t)) {
                            $viewsTxt = $t;
                        }
                    }
                }
                if ($viewsTxt || $vtitle) {
                    $seen[$lm['contentId']] = true;
                    $acc['videos'][] = [
                        'videoId' => $lm['contentId'],
                        'title' => mb_substr((string) $vtitle, 0, 200),
                        'views' => HumanCount::parse($viewsTxt),
                        'likes' => null,
                        'comments' => null,
                    ];
                }
            }

            foreach ($node as $v) {
                if (is_array($v)) {
                    $walk($v);
                }
            }
        };
        $walk($data);
        $acc['videos'] = array_slice($acc['videos'], 0, 24);

        return $acc;
    }

    /** Ekstrak JSON objek seimbang setelah penanda (mis. "ytInitialData"). */
    public static function extractJsonAfter(string $html, string $marker): ?array
    {
        $i = strpos($html, $marker);
        if ($i === false) {
            return null;
        }
        $start = strpos($html, '{', $i);
        if ($start === false) {
            return null;
        }
        $depth = 0;
        $inStr = false;
        $esc = false;
        $len = strlen($html);
        for ($j = $start; $j < $len; $j++) {
            $ch = $html[$j];
            if ($inStr) {
                if ($esc) {
                    $esc = false;
                } elseif ($ch === '\\') {
                    $esc = true;
                } elseif ($ch === '"') {
                    $inStr = false;
                }
            } else {
                if ($ch === '"') {
                    $inStr = true;
                } elseif ($ch === '{') {
                    $depth++;
                } elseif ($ch === '}') {
                    $depth--;
                    if ($depth === 0) {
                        $decoded = json_decode(substr($html, $start, $j - $start + 1), true);

                        return is_array($decoded) ? $decoded : null;
                    }
                }
            }
        }

        return null;
    }

    public static function channel(string $handle): array
    {
        $clean = trim(preg_replace('/^@/', '', $handle));
        if (! $clean) {
            throw new RuntimeException('Handle YouTube kosong.');
        }
        $url = 'https://www.youtube.com/@'.rawurlencode($clean).'/videos?hl=en';
        try {
            $res = Http::withHeaders([
                'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'accept-language' => 'en-US,en;q=0.9',
            ])->timeout(15)->get($url);
        } catch (\Throwable $e) {
            throw new RuntimeException('Gagal menghubungi YouTube: '.substr((string) $e->getMessage(), 0, 120));
        }
        if ($res->status() === 404) {
            throw new RuntimeException("Channel @{$clean} tidak ditemukan.");
        }
        if (! $res->successful()) {
            throw new RuntimeException('YouTube membalas '.$res->status().' — coba lagi sebentar.');
        }
        $data = self::extractJsonAfter($res->body(), 'ytInitialData');
        if (! $data) {
            throw new RuntimeException('Tidak bisa membaca data channel (layout YouTube berubah / login wall).');
        }
        $parsed = self::parseInitialData($data);

        return ['handle' => $clean] + $parsed;
    }
}
