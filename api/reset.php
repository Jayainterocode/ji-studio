<?php
// POST {token, password}: pasang password baru dari tautan email (reset atau undangan).
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
$in = input();
$token = str_in($in, 'token', 100);
$pass = is_string($in['password'] ?? null) ? $in['password'] : '';
throttle('reset:ip:' . ip(), 10, 900);
if ($token === '') fail(400, 'Tautan tidak valid.');
check_password($pass);

$row = q('SELECT * FROM ji_tokens WHERE token_hash = ?', [th($token)])->fetch();
if (!$row || (int) $row['used'] || (int) $row['expires_at'] < time()) {
    hit('reset:ip:' . ip());
    fail(400, 'Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru lewat "Lupa password".');
}
$u = q('SELECT * FROM ji_users WHERE id = ? AND active = 1', [$row['user_id']])->fetch();
if (!$u) fail(400, 'Akun tidak aktif. Hubungi admin.');

db()->beginTransaction();
q('UPDATE ji_tokens SET used = 1 WHERE token_hash = ?', [th($token)]);
q('UPDATE ji_users SET pass_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
q('DELETE FROM ji_sessions WHERE user_id = ?', [$u['id']]); // keluarkan semua perangkat lama
db()->commit();
clear_hits('login:u:' . $u['username']);
out(200, ['ok' => true, 'username' => $u['username']]);
