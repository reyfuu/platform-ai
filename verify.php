<?php

/*
 * Self-check logika murni port scraper (tanpa boot Laravel, tanpa jaringan).
 * Jalankan: php verify.php  → semua OK atau throw di assert pertama yang gagal.
 */
require __DIR__.'/vendor/autoload.php';

use App\Support\Engagement;
use App\Support\HumanCount;
use App\Support\IgScraper;
use App\Support\TiktokScraper;
use App\Support\YoutubeScraper;

function ok(string $name): void
{
    echo "  ok: {$name}\n";
}

// ── HumanCount::parse ──
assert(HumanCount::parse('1.2M') === 1200000);
assert(HumanCount::parse('1,2 jt') === 1200000);
assert(HumanCount::parse('890K') === 890000);
assert(HumanCount::parse('12 rb') === 12000);
assert(HumanCount::parse('1.234') === 1234);      // pemisah ribuan tanpa unit
assert(HumanCount::parse('1,234') === 1234);
assert(HumanCount::parse('12,5 juta') === 12500000);
assert(HumanCount::parse('') === null);
assert(HumanCount::parse(null) === null);
assert(HumanCount::parse('1.5B') === 1500000000);
ok('HumanCount::parse');

// ── Engagement::stats ──
$e = Engagement::stats(1000, [
    ['likes' => 100, 'comments' => 10, 'views' => 500],
    ['likes' => 300, 'comments' => 30, 'views' => 1500], // eng 330 = 3x median(110) → viral+best
    ['likes' => 50, 'comments' => 5, 'views' => 200],
]);
assert($e['n'] === 3);
assert($e['totalLikes'] === 450);
assert($e['totalComments'] === 45);
assert($e['totalViews'] === 2200);
assert($e['median'] === 110);              // eng: [55,110,330] → tengah 110
assert($e['viralCount'] === 1);            // 330 >= 110*2
assert($e['rows'][1]['viral'] === true && $e['rows'][1]['best'] === true);
assert($e['rows'][0]['viral'] === false);
$e0 = Engagement::stats(0, []);
assert($e0['n'] === 0 && $e0['median'] === 0 && $e0['erAvg'] === 0.0);
ok('Engagement::stats');

// ── IgScraper::cleanHandle & parseOgDescription ──
assert(IgScraper::cleanHandle('https://www.instagram.com/@Nike/reels/') === 'nike');
assert(IgScraper::cleanHandle('  @Foo_Bar ') === 'foo_bar');
$og = IgScraper::parseOgDescription('<meta property="og:description" content="1.2M Followers, 500 Following, 3,456 Posts - lihat" />');
assert($og['followers'] === 1200000);
assert($og['following'] === 500);
assert($og['postCount'] === 3456);
assert(IgScraper::parseOgDescription('<html>no meta</html>') === null);
ok('IgScraper::cleanHandle + parseOgDescription');

// ── IgScraper::computeStats ──
$s = IgScraper::computeStats([
    'followers' => 1000,
    'posts' => [
        ['type' => 'video', 'likes' => 200, 'comments' => 20, 'takenAt' => 1000000],
        ['type' => 'image', 'likes' => 100, 'comments' => 10, 'takenAt' => 1000000 + 7 * 86400],
    ],
]);
assert($s['sampled'] === 2);
assert($s['mix']['video'] === 1 && $s['mix']['image'] === 1);
assert($s['avgLikes'] === 150 && $s['avgComments'] === 15);
assert($s['engagementPct'] === 16.5);      // (150+15)/1000*100
assert($s['postsPerWeek'] === 1.0);        // 1 post gap dalam 7 hari
ok('IgScraper::computeStats');

// ── TiktokScraper::parseUniversalData ──
$tt = TiktokScraper::parseUniversalData([
    '__DEFAULT_SCOPE__' => [
        'webapp.user-detail' => [
            'userInfo' => [
                'user' => ['uniqueId' => '@charli', 'nickname' => 'Charli', 'verified' => true],
                'stats' => ['followerCount' => 150000000, 'heartCount' => 11000000000, 'videoCount' => 2000],
            ],
        ],
    ],
], 'charli');
assert($tt['username'] === 'charli');
assert($tt['followers'] === 150000000);
assert($tt['hearts'] === 11000000000);
assert($tt['videoCount'] === 2000);
assert($tt['verified'] === true);
ok('TiktokScraper::parseUniversalData');

// ── YoutubeScraper::extractJsonAfter + parseInitialData ──
$html = 'var ytInitialData = {"a":{"channelMetadataRenderer":{"title":"Chan"}},"b":{"videoRenderer":{"videoId":"abc","title":{"simpleText":"Vid"},"viewCountText":{"simpleText":"1.2M views"}}}};</script>';
$data = YoutubeScraper::extractJsonAfter($html, 'ytInitialData');
assert(is_array($data));
$parsed = YoutubeScraper::parseInitialData($data);
assert($parsed['title'] === 'Chan');
assert(count($parsed['videos']) === 1);
assert($parsed['videos'][0]['videoId'] === 'abc');
assert($parsed['videos'][0]['views'] === 1200000);
assert($parsed['videos'][0]['likes'] === null);
// string berisi kurung kurawal tak boleh bikin balance meleset
$html2 = 'ytInitialData = {"s":"a}b{c","v":1};rest';
$d2 = YoutubeScraper::extractJsonAfter($html2, 'ytInitialData');
assert($d2 === ['s' => 'a}b{c', 'v' => 1]);
ok('YoutubeScraper::extractJsonAfter + parseInitialData');

echo "\nSEMUA LOLOS ✓\n";
