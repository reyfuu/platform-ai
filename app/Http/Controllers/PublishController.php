<?php

namespace App\Http\Controllers;

use App\Support\Publisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cross-post 1 konten ke IG + FB + TikTok sekaligus. Tanpa auth — kredensial
 * (token akun bisnis user) dikirim per-request dari browser, tidak disimpan.
 */
class PublishController extends Controller
{
    // POST /api/v1/publish/all
    public function all(Request $request): JsonResponse
    {
        $platforms = (array) $request->input('platforms', []);
        $creds = (array) $request->input('creds', []);
        $isVideo = $request->input('mediaType') === 'video';
        $caption = (string) $request->input('caption', '');
        $mediaUrl = (string) $request->input('mediaUrl', '');
        $dryRun = (bool) $request->input('dryRun', false);

        $results = [];
        if (in_array('instagram', $platforms, true)) {
            $results[] = Publisher::instagram([
                'igUserId' => $creds['igUserId'] ?? '',
                'accessToken' => $creds['metaToken'] ?? '',
                'caption' => $caption,
                'imageUrl' => $isVideo ? null : $mediaUrl,
                'videoUrl' => $isVideo ? $mediaUrl : null,
                'dryRun' => $dryRun,
            ]);
        }
        if (in_array('facebook', $platforms, true)) {
            $results[] = Publisher::facebook([
                'pageId' => $creds['fbPageId'] ?? '',
                'accessToken' => $creds['metaToken'] ?? '',
                'message' => $caption,
                'imageUrl' => $isVideo ? null : ($mediaUrl ?: null),
                'dryRun' => $dryRun,
            ]);
        }
        if (in_array('tiktok', $platforms, true)) {
            $results[] = Publisher::tiktok([
                'accessToken' => $creds['tiktokToken'] ?? '',
                'videoUrl' => $mediaUrl,
                'caption' => $caption,
                'dryRun' => $dryRun,
            ]);
        }

        return response()->json([
            'dryRun' => $dryRun,
            'okCount' => count(array_filter($results, fn ($r) => $r['ok'])),
            'total' => count($results),
            'results' => $results,
        ]);
    }
}
