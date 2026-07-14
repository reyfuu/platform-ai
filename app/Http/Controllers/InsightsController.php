<?php

namespace App\Http\Controllers;

use App\Support\Engagement;
use App\Support\IgScraper;
use App\Support\TiktokScraper;
use App\Support\YoutubeScraper;
use Illuminate\Http\JsonResponse;

/**
 * Proxy scrape profil publik IG/TikTok/YouTube untuk frontend (browser tak bisa
 * fetch platform langsung karena CORS). Tanpa auth: hanya data publik.
 * Error sumber eksternal → HTTP 502 (bukan 500) supaya UI kasih fallback ramah.
 */
class InsightsController extends Controller
{
    // GET /api/v1/ig/{handle}
    public function ig(string $handle): JsonResponse
    {
        try {
            $p = IgScraper::profile($handle);

            return response()->json($p + [
                'platform' => 'instagram',
                'stats' => IgScraper::computeStats($p),
                'engagement' => Engagement::stats($p['followers'] ?? 0, $p['posts']),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    // GET /api/v1/tiktok/{handle}
    public function tiktok(string $handle): JsonResponse
    {
        try {
            $p = TiktokScraper::profile($handle);
            $avgLikes = ($p['hearts'] !== null && $p['videoCount'])
                ? (int) round($p['hearts'] / $p['videoCount'])
                : null;
            $engagementPct = ($p['followers'] && $avgLikes !== null)
                ? round(($avgLikes / $p['followers']) * 100, 2)
                : null;

            return response()->json([
                'platform' => 'tiktok',
                'username' => $p['username'],
                'nickname' => $p['nickname'],
                'followers' => $p['followers'],
                'totalLikes' => $p['hearts'],
                'videoCount' => $p['videoCount'],
                'verified' => $p['verified'],
                'avgLikes' => $avgLikes,
                'engagementPct' => $engagementPct,
                'posts' => [],
                'note' => 'TikTok publik hanya kasih agregat. Angka per-video/views butuh provider data (Apify) atau isi manual.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    // GET /api/v1/youtube/{handle}
    public function youtube(string $handle): JsonResponse
    {
        try {
            $c = YoutubeScraper::channel($handle);
            $posts = array_map(fn ($v) => [
                'shortcode' => $v['videoId'],
                'title' => $v['title'],
                'likes' => $v['likes'],
                'comments' => $v['comments'],
                'views' => $v['views'],
                'url' => "https://www.youtube.com/watch?v={$v['videoId']}",
            ], $c['videos']);
            $totalViews = array_sum(array_map(fn ($p) => $p['views'] ?? 0, $posts));
            $avgViews = count($posts) ? (int) round($totalViews / count($posts)) : null;

            return response()->json([
                'platform' => 'youtube',
                'username' => $c['handle'],
                'title' => $c['title'],
                'followers' => $c['subscribers'],
                'videoCount' => $c['videoCount'],
                'sampled' => count($posts),
                'totalViews' => $totalViews,
                'avgViews' => $avgViews,
                'posts' => $posts,
                'note' => 'YouTube publik: views per video tersedia, tapi likes/komentar per video butuh YouTube Data API. Subscriber = followers.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }
}
