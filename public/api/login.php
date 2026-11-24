<?php
// POST {username, password}: masuk dengan username atau email.
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
$in = input();
$login = mb_strtolower(str_in($in, 'username', 190));
$pass = is_string($in['password'] ?? null) ? $in['password'] : '';
if ($login === '' || $pass === '') fail(400, 'Isi username dan password.');

throttle('login:ip:' . ip(), 20, 900);
throttle('login:u:' . $login, 5, 900);

$u = q('SELECT * FROM ji_users WHERE username = ? OR LOWER(email) = ? LIMIT 1', [$login, $login])->fetch();
// Selalu jalankan password_verify agar waktu respons tidak membocorkan ada/tidaknya akun
$hash = $u['pass_hash'] ?? null;
$ok = password_verify($pass, $hash ?: '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG');
if (!$u || !$hash || !$ok || !(int) $u['active']) {
    hit('login:ip:' . ip());
    hit('login:u:' . $login);
    fail(401, 'Username atau password salah.');
}
if (password_needs_rehash($hash, PASSWORD_DEFAULT)) q('UPDATE ji_users SET pass_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
clear_hits('login:u:' . $login);
start_session((int) $u['id']);
out(200, ['ok' => true, 'user' => public_user($u)]);
