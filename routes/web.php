<?php

use Illuminate\Support\Facades\Route;

// "/" tampilkan landing statis (public_html/index.html), bukan welcome Laravel.
// Di produksi .htaccess (DirectoryIndex) menang duluan; route ini untuk `php artisan serve`.
Route::get('/', fn () => response()->file(public_path('index.html')));

// "/app" → aplikasi (public_html/app.html), URL tetap /app tanpa .html.
// Di produksi .htaccess menang duluan; route ini untuk `php artisan serve`.
Route::get('/app', fn () => response()->file(public_path('app.html')));
