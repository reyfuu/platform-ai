<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Cross-post ke Instagram/Facebook (Meta Graph API) & TikTok (Content Posting API).
 * Port setia dari publish/meta-publish.ts + tiktok-publish.ts.
 * Kredensial dikirim per-request dari browser, TIDAK disimpan di server.
 * dryRun=true → balikin request yang akan dikirim tanpa memanggil API.
 */
class Publisher
{
    private const GRAPH = 'https://graph.facebook.com/v21.0';

    private const TT_INIT = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

    /** @return array{ok:bool,status:int,json:mixed} */
    private static function graphPost(string $url, array $params): array
    {
        $res = Http::asForm()->post($url, $params);

        return ['ok' => $res->successful(), 'status' => $res->status(), 'json' => $res->json()];
    }

    /** Poll status container video IG sampai FINISHED (Reels butuh transcoding). */
    private static function waitIgContainer(string $creationId, string $accessToken, int $tries = 10, int $delayMs = 2500): array
    {
        for ($i = 0; $i < $tries; $i++) {
            $j = Http::get(self::GRAPH."/{$creationId}", [
                'fields' => 'status_code,status',
                'access_token' => $accessToken,
            ])->json();
            $code = $j['status_code'] ?? null;
            if ($code === 'FINISHED') {
                return ['ready' => true];
            }
            if ($code === 'ERROR' || $code === 'EXPIRED') {
                return ['ready' => false, 'error' => $j['status'] ?? "container {$code}"];
            }
            usleep($delayMs * 1000);
        }

        return ['ready' => false, 'error' => 'container belum siap setelah beberapa kali cek (video terlalu besar?)'];
    }

    public static function instagram(array $in): array
    {
        [$igUserId, $accessToken, $caption, $imageUrl, $videoUrl, $dryRun] =
            [$in['igUserId'] ?? '', $in['accessToken'] ?? '', $in['caption'] ?? '', $in['imageUrl'] ?? null, $in['videoUrl'] ?? null, $in['dryRun'] ?? false];

        if (! $igUserId || ! $accessToken) {
            return ['platform' => 'instagram', 'ok' => false, 'error' => 'IG User ID & Access Token wajib diisi.'];
        }
        if (! $imageUrl && ! $videoUrl) {
            return ['platform' => 'instagram', 'ok' => false, 'error' => 'Butuh URL media PUBLIK (image_url / video_url).'];
        }

        $isVideo = (bool) $videoUrl;
        $createUrl = self::GRAPH."/{$igUserId}/media";
        $publishUrl = self::GRAPH."/{$igUserId}/media_publish";
        $params = ['caption' => $caption, 'access_token' => $accessToken];
        if ($isVideo) {
            $params['media_type'] = 'REELS';
            $params['video_url'] = $videoUrl;
        } else {
            $params['image_url'] = $imageUrl;
        }

        if ($dryRun) {
            return ['platform' => 'instagram', 'ok' => true, 'dryRun' => true, 'id' => 'DRYRUN_IG_CONTAINER',
                'request' => ['createUrl' => $createUrl, 'publishUrl' => $publishUrl, 'params' => ['...' => true, 'access_token' => '***']]];
        }

        $c = self::graphPost($createUrl, $params);
        if (! $c['ok'] || empty($c['json']['id'])) {
            return ['platform' => 'instagram', 'ok' => false, 'error' => $c['json']['error']['message'] ?? "Gagal buat container ({$c['status']})."];
        }
        $creationId = $c['json']['id'];

        if ($isVideo) {
            $w = self::waitIgContainer($creationId, $accessToken);
            if (! $w['ready']) {
                return ['platform' => 'instagram', 'ok' => false, 'id' => $creationId, 'error' => $w['error']];
            }
        }

        $p = self::graphPost($publishUrl, ['creation_id' => $creationId, 'access_token' => $accessToken]);
        if (! $p['ok'] || empty($p['json']['id'])) {
            return ['platform' => 'instagram', 'ok' => false, 'id' => $creationId, 'error' => $p['json']['error']['message'] ?? "Gagal publish ({$p['status']})."];
        }

        return ['platform' => 'instagram', 'ok' => true, 'id' => $p['json']['id'], 'url' => "https://www.instagram.com/p/{$p['json']['id']}/"];
    }

    public static function facebook(array $in): array
    {
        [$pageId, $accessToken, $message, $imageUrl, $dryRun] =
            [$in['pageId'] ?? '', $in['accessToken'] ?? '', $in['message'] ?? '', $in['imageUrl'] ?? null, $in['dryRun'] ?? false];

        if (! $pageId || ! $accessToken) {
            return ['platform' => 'facebook', 'ok' => false, 'error' => 'Page ID & Access Token wajib diisi.'];
        }

        $isPhoto = (bool) $imageUrl;
        $endpoint = $isPhoto ? self::GRAPH."/{$pageId}/photos" : self::GRAPH."/{$pageId}/feed";
        $params = ['access_token' => $accessToken];
        if ($isPhoto) {
            $params['url'] = $imageUrl;
            if ($message) {
                $params['caption'] = $message;
            }
        } else {
            $params['message'] = $message;
        }

        if ($dryRun) {
            return ['platform' => 'facebook', 'ok' => true, 'dryRun' => true, 'id' => 'DRYRUN_FB_POST',
                'request' => ['endpoint' => $endpoint, 'params' => ['...' => true, 'access_token' => '***']]];
        }

        $r = self::graphPost($endpoint, $params);
        $id = $r['json']['post_id'] ?? $r['json']['id'] ?? null;
        if (! $r['ok'] || ! $id) {
            return ['platform' => 'facebook', 'ok' => false, 'error' => $r['json']['error']['message'] ?? "Gagal posting FB ({$r['status']})."];
        }

        return ['platform' => 'facebook', 'ok' => true, 'id' => $id, 'url' => "https://www.facebook.com/{$id}"];
    }

    public static function tiktok(array $in): array
    {
        [$accessToken, $videoUrl, $caption, $privacy, $dryRun] =
            [$in['accessToken'] ?? '', $in['videoUrl'] ?? '', $in['caption'] ?? '', $in['privacy'] ?? null, $in['dryRun'] ?? false];

        if (! $accessToken) {
            return ['platform' => 'tiktok', 'ok' => false, 'error' => 'Access Token TikTok wajib diisi.'];
        }
        if (! $videoUrl) {
            return ['platform' => 'tiktok', 'ok' => false, 'error' => 'Butuh URL video PUBLIK (TikTok cuma menerima video).'];
        }

        $body = [
            'post_info' => [
                'title' => mb_substr($caption, 0, 2200),
                'privacy_level' => $privacy ?? 'SELF_ONLY',
                'disable_comment' => false,
                'disable_duet' => false,
                'disable_stitch' => false,
            ],
            'source_info' => ['source' => 'PULL_FROM_URL', 'video_url' => $videoUrl],
        ];

        if ($dryRun) {
            return ['platform' => 'tiktok', 'ok' => true, 'dryRun' => true, 'id' => 'DRYRUN_TT_PUBLISH',
                'request' => ['url' => self::TT_INIT, 'body' => $body]];
        }

        try {
            $res = Http::withToken($accessToken)
                ->withHeaders(['content-type' => 'application/json; charset=UTF-8'])
                ->post(self::TT_INIT, $body);
        } catch (\Throwable $e) {
            return ['platform' => 'tiktok', 'ok' => false, 'error' => 'Gagal hubungi TikTok: '.substr((string) $e->getMessage(), 0, 100)];
        }
        $j = $res->json();
        $err = $j['error'] ?? null;
        if (! $res->successful() || ($err && ! empty($err['code']) && $err['code'] !== 'ok')) {
            return ['platform' => 'tiktok', 'ok' => false, 'error' => (string) ($err['message'] ?? $err['code'] ?? "HTTP {$res->status()}")];
        }

        return ['platform' => 'tiktok', 'ok' => true, 'id' => $j['data']['publish_id'] ?? null];
    }
}
