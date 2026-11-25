<?php
// POST: keluar dari perangkat ini.
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
input();
end_session();
out(200, ['ok' => true]);
