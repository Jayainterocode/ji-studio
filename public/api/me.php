<?php
// GET: data pengguna yang sedang masuk, atau 401.
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
method('GET');
$u = current_user();
if (!$u) fail(401, 'Silakan masuk dulu.', ['needsSetup' => user_count() === 0]);
out(200, ['ok' => true, 'user' => public_user($u)]);
