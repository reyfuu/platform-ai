<?php

namespace App\Support;

/**
 * Parse angka "manusiawi" jadi integer: "1.2M", "1,2 jt", "890K", "12 rb",
 * "1.234". Port setia dari youtube-scraper.ts:parseHumanCount.
 */
class HumanCount
{
    public static function parse(string|int|float|null $input): ?int
    {
        if ($input === null || $input === '') {
            return null;
        }
        // samakan berbagai spasi non-breaking jadi spasi biasa
        $s = strtolower((string) $input);
        $s = str_replace(["\xC2\xA0", "\xE2\x80\xAF", "\xE2\x80\x89"], ' ', $s);

        if (! preg_match('/([\d.,]+)\s*(rb|ribu|jt|juta|m|k|b)?/i', $s, $m)) {
            return null;
        }
        $unit = isset($m[2]) ? strtolower($m[2]) : '';

        if ($unit !== '') {
            // Ada unit → angka kecil berdesimal: "1.2M", "1,2 jt", "1.234,5 jt".
            $numStr = $m[1];
            if (str_contains($numStr, ',') && str_contains($numStr, '.')) {
                $numStr = str_replace(['.'], '', $numStr);
                $numStr = str_replace(',', '.', $numStr);
            } elseif (str_contains($numStr, ',')) {
                $numStr = str_replace(',', '.', $numStr);
            }
            $n = (float) $numStr;
        } else {
            // Tanpa unit → bulat: pemisah ribuan dibuang. "1.234"→1234.
            $n = (int) str_replace(['.', ','], '', $m[1]);
        }
        if (! is_finite((float) $n)) {
            return null;
        }
        $mult = match ($unit) {
            'k', 'rb', 'ribu' => 1e3,
            'm', 'jt', 'juta' => 1e6,
            'b' => 1e9,
            default => 1,
        };

        return (int) round($n * $mult);
    }
}
