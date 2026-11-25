<?php
// POST {login}: kirim tautan atur ulang password ke email pengguna.
// Jawaban selalu sama agar tidak bisa dipakai menebak username/email yang terdaftar.
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
$in = input();
$login = mb_strtolower(str_in($in, 'login', 190));
if ($login === '') fail(400, 'Isi username atau email.');
throttle('forgot:ip:' . ip(), 5, 3600);
hit('forgot:ip:' . ip());

$u = q('SELECT * FROM ji_users WHERE (username = ? OR LOWER(email) = ?) AND active = 1 LIMIT 1', [$login, $login])->fetch();
if ($u) {
    $n = (int) q('SELECT COUNT(*) FROM ji_attempts WHERE k = ? AND at > ?', ['forgot:u:' . $u['id'], time() - 3600])->fetchColumn();
    if ($n < 3) {
        hit('forgot:u:' . $u['id']);
        mail_reset($u, make_link_token((int) $u['id'], 'reset'));
    }
}
out(200, ['ok' => true, 'message' => 'Jika akun ditemukan, tautan atur ulang password sudah dikirim ke email terdaftar. Cek juga folder Spam.']);
