<?php

namespace App\Support;

/**
 * Statistik engagement kompetitor — dihitung deterministik (bukan AI) dari data
 * publik scraper. Port setia dari insights/engagement.ts:engagementStats.
 *
 * @param  list<array{likes?:int|null,comments?:int|null,views?:int|null}>  $posts
 */
class Engagement
{
    public static function stats(int|float $followers, array $posts): array
    {
        $f = max(0, (int) round($followers ?: 0));
        $clean = array_map(fn ($p) => [
            'likes' => max(0, (int) round((float) ($p['likes'] ?? 0))),
            'comments' => max(0, (int) round((float) ($p['comments'] ?? 0))),
            'views' => max(0, (int) round((float) ($p['views'] ?? 0))),
        ], $posts);

        $eng = array_map(fn ($p) => $p['likes'] + $p['comments'], $clean);
        $totalViews = array_sum(array_column($clean, 'views'));
        $totalLikes = array_sum(array_column($clean, 'likes'));
        $totalComments = array_sum(array_column($clean, 'comments'));
        $totalEng = array_sum($eng);
        $avgEng = count($clean) ? $totalEng / count($clean) : 0;
        $erAvg = $f ? ($avgEng / $f) * 100 : 0;

        $sorted = $eng;
        sort($sorted);
        $median = count($sorted) ? $sorted[intdiv(count($sorted) - 1, 2)] : 0;
        $maxEng = count($eng) ? max($eng) : 0;

        $rows = [];
        foreach ($clean as $i => $p) {
            $rows[] = [
                'i' => $i + 1,
                'likes' => $p['likes'],
                'comments' => $p['comments'],
                'views' => $p['views'],
                'eng' => $eng[$i],
                'er' => $f ? round(($eng[$i] / $f) * 100, 2) : 0,
                'viral' => $median > 0 && $eng[$i] >= $median * 2,
                'best' => $eng[$i] === $maxEng && $maxEng > 0,
            ];
        }

        return [
            'n' => count($clean),
            'followers' => $f,
            'totalViews' => $totalViews,
            'totalLikes' => $totalLikes,
            'totalComments' => $totalComments,
            'avgEng' => round($avgEng, 1),
            'erAvg' => round($erAvg, 2),
            'median' => $median,
            'viralCount' => count(array_filter($rows, fn ($r) => $r['viral'])),
            'rows' => $rows,
        ];
    }
}
