<?php

use App\Http\Controllers\InsightsController;
use App\Http\Controllers\PublishController;
use Illuminate\Support\Facades\Route;

/*
 * API riset & publish (dipakai prototype Content Engine / app.html).
 * Prefix 'api/v1' diset di bootstrap/app.php. {handle} boleh berisi titik/@.
 */
Route::get('/ig/{handle}', [InsightsController::class, 'ig'])->where('handle', '.*');
Route::get('/tiktok/{handle}', [InsightsController::class, 'tiktok'])->where('handle', '.*');
Route::get('/youtube/{handle}', [InsightsController::class, 'youtube'])->where('handle', '.*');
Route::post('/publish/all', [PublishController::class, 'all']);
