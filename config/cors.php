<?php

/*
 * CORS: frontend (app.html di shared hosting) beda origin dari API.
 * Proxy ini cuma data publik → izinkan semua origin. Kalau mau dikunci ke
 * domain sendiri, ganti allowed_origins ke ['https://domainmu.com'].
 */
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
