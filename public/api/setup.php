<?php
// POST {key, username, name, email, password}: buat admin pertama. Hanya jalan saat belum ada pengguna.
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
$in = input();
throttle('setup:ip:' . ip(), 5, 3600);
if (user_count() > 0) fail(403, 'Setup sudah selesai. Silakan masuk.');
$key = (string) (cfg()['setup_key'] ?? '');
if (strlen($key) < 16 || str_contains($key, 'GANTI')) fail(503, 'setup_key di ji-config.php belum diganti (minimal 16 karakter acak).');
if (!hash_equals($key, str_in($in, 'key', 200))) { hit('setup:ip:' . ip()); fail(403, 'Kunci setup salah.'); }

$username = mb_strtolower(str_in($in, 'username', 40));
$email = str_in($in, 'email', 190);
$name = str_in($in, 'name', 80);
$pass = is_string($in['password'] ?? null) ? $in['password'] : '';
if (!valid_username($username)) fail(400, 'Username 3–40 karakter: huruf kecil, angka, titik, minus, garis bawah.');
if (!valid_email($email)) fail(400, 'Email tidak valid.');
check_password($pass);

q('INSERT INTO ji_users (username, email, name, pass_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
  [$username, $email, $name, password_hash($pass, PASSWORD_DEFAULT), 'admin', time()]);
start_session((int) db()->lastInsertId());
out(200, ['ok' => true]);
