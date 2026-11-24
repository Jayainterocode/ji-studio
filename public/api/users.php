<?php
// Kelola pengguna (khusus admin).
// GET: daftar. POST {action: create|invite|toggle|role, ...}
declare(strict_types=1);
define('JI', 1);
require __DIR__ . '/lib/boot.php';
$me = require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = q('SELECT * FROM ji_users ORDER BY active DESC, username')->fetchAll();
    out(200, ['ok' => true, 'users' => array_map('public_user', $rows)]);
}

$in = input();
$action = str_in($in, 'action', 20);

if ($action === 'create') {
    $username = mb_strtolower(str_in($in, 'username', 40));
    $email = str_in($in, 'email', 190);
    $name = str_in($in, 'name', 80);
    $role = str_in($in, 'role', 10) === 'admin' ? 'admin' : 'staf';
    if (!valid_username($username)) fail(400, 'Username 3–40 karakter: huruf kecil, angka, titik, minus, garis bawah.');
    if (!valid_email($email)) fail(400, 'Email tidak valid.');
    if (q('SELECT 1 FROM ji_users WHERE username = ?', [$username])->fetch()) fail(409, 'Username sudah dipakai.');
    q('INSERT INTO ji_users (username, email, name, pass_hash, role, active, created_at) VALUES (?, ?, ?, NULL, ?, 1, ?)', [$username, $email, $name, $role, time()]);
    $u = q('SELECT * FROM ji_users WHERE username = ?', [$username])->fetch();
    $mailed = mail_invite($u, make_link_token((int) $u['id'], 'invite'));
    out(200, ['ok' => true, 'user' => public_user($u), 'mailed' => $mailed]);
}

$id = (int) ($in['id'] ?? 0);
$u = q('SELECT * FROM ji_users WHERE id = ?', [$id])->fetch();
if (!$u) fail(404, 'Pengguna tidak ditemukan.');

if ($action === 'invite') {
    if (!(int) $u['active']) fail(400, 'Aktifkan akun dulu.');
    $kind = $u['pass_hash'] === null ? 'invite' : 'reset';
    $link = make_link_token($id, $kind);
    $mailed = $kind === 'invite' ? mail_invite($u, $link) : mail_reset($u, $link);
    out(200, ['ok' => true, 'mailed' => $mailed]);
}
if ($action === 'toggle') {
    if ($id === (int) $me['id']) fail(400, 'Tidak bisa menonaktifkan akun sendiri.');
    $active = (int) $u['active'] ? 0 : 1;
    q('UPDATE ji_users SET active = ? WHERE id = ?', [$active, $id]);
    if (!$active) q('DELETE FROM ji_sessions WHERE user_id = ?', [$id]);
    out(200, ['ok' => true, 'active' => (bool) $active]);
}
if ($action === 'role') {
    if ($id === (int) $me['id']) fail(400, 'Tidak bisa mengubah peran sendiri.');
    $role = $u['role'] === 'admin' ? 'staf' : 'admin';
    q('UPDATE ji_users SET role = ? WHERE id = ?', [$role, $id]);
    out(200, ['ok' => true, 'role' => $role]);
}
fail(400, 'Aksi tidak dikenal.');
