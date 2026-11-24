<?php
// Inti API JI Studio: konfigurasi, database, sesi, batas percobaan, email.
// Folder lib/ tidak bisa diakses dari web (.htaccess) dan setiap file memeriksa konstanta JI.
declare(strict_types=1);
if (!defined('JI')) { http_response_code(404); exit; }

ini_set('display_errors', '0');
error_reporting(E_ALL);

const SESSION_DAYS = 30;
const COOKIE = '__Host-ji';
const RESET_MINUTES = 30;
const INVITE_HOURS = 48;

// ---------- Respons
function out(int $code, array $data): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(int $code, string $msg, array $extra = []): never { out($code, ['ok' => false, 'error' => $msg] + $extra); }

set_exception_handler(function (Throwable $e) {
    error_log('[ji] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail(500, 'Terjadi kesalahan di server. Coba lagi sebentar.');
});

// ---------- Konfigurasi (di luar public_html, tidak pernah ikut Git)
function cfg(): array {
    static $c = null;
    if ($c === null) {
        $p = getenv('JI_CONFIG') ?: dirname(__DIR__, 3) . '/ji-config.php';
        if (!is_file($p)) fail(503, 'Server belum dikonfigurasi (ji-config.php tidak ditemukan).');
        $c = require $p;
    }
    return $c;
}

// ---------- Database (SQLite bawaan, MySQL bisa lewat DSN)
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $d = cfg()['db'];
    if (str_starts_with($d['dsn'], 'sqlite:')) {
        $dir = dirname(substr($d['dsn'], 7));
        if (!is_dir($dir)) mkdir($dir, 0700, true);
    }
    $pdo = new PDO($d['dsn'], $d['user'] ?? null, $d['pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $my = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    if (!$my) { $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA busy_timeout=3000'); }
    $id = $my ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $t = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $pdo->exec("CREATE TABLE IF NOT EXISTS ji_users (id $id, username VARCHAR(40) NOT NULL UNIQUE, email VARCHAR(190) NOT NULL, name VARCHAR(80) NOT NULL DEFAULT '', pass_hash VARCHAR(255) NULL, role VARCHAR(10) NOT NULL DEFAULT 'staf', active INT NOT NULL DEFAULT 1, created_at INT NOT NULL)$t");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ji_sessions (token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at INT NOT NULL, created_at INT NOT NULL)$t");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ji_tokens (token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, kind VARCHAR(10) NOT NULL, expires_at INT NOT NULL, used INT NOT NULL DEFAULT 0)$t");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ji_attempts (id $id, k VARCHAR(160) NOT NULL, at INT NOT NULL)$t");
    return $pdo;
}
function q(string $sql, array $args = []): PDOStatement { $s = db()->prepare($sql); $s->execute($args); return $s; }

// ---------- Permintaan: hanya POST JSON dari halaman sendiri
function method(string $m): void { if ($_SERVER['REQUEST_METHOD'] !== $m) fail(405, 'Metode tidak diizinkan.'); }
function same_origin(): void {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== $host) fail(403, 'Asal permintaan ditolak.');
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin';
    if (!in_array($site, ['same-origin', 'none'], true)) fail(403, 'Asal permintaan ditolak.');
    if (($_SERVER['HTTP_X_JI'] ?? '') !== '1') fail(403, 'Permintaan tidak valid.');
}
function input(): array {
    method('POST');
    same_origin();
    if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) fail(415, 'Format permintaan tidak valid.');
    $raw = file_get_contents('php://input', false, null, 0, 20000);
    $j = json_decode($raw ?: '', true);
    if (!is_array($j)) fail(400, 'Format permintaan tidak valid.');
    return $j;
}
function str_in(array $in, string $k, int $max = 200): string {
    $v = $in[$k] ?? '';
    if (!is_string($v)) fail(400, 'Isian tidak valid.');
    $v = trim($v);
    if (mb_strlen($v) > $max) fail(400, 'Isian terlalu panjang.');
    return $v;
}
function ip(): string { return substr($_SERVER['REMOTE_ADDR'] ?? '0', 0, 64); }

// ---------- Batas percobaan
function throttle(string $key, int $max, int $windowSec): void {
    q('DELETE FROM ji_attempts WHERE at < ?', [time() - 86400]);
    $n = (int) q('SELECT COUNT(*) FROM ji_attempts WHERE k = ? AND at > ?', [$key, time() - $windowSec])->fetchColumn();
    if ($n >= $max) fail(429, 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
}
function hit(string $key): void { q('INSERT INTO ji_attempts (k, at) VALUES (?, ?)', [$key, time()]); }
function clear_hits(string $key): void { q('DELETE FROM ji_attempts WHERE k = ?', [$key]); }

// ---------- Token & sesi
function new_token(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }
function th(string $t): string { return hash('sha256', $t); }

function set_cookie(string $val, int $exp): void {
    setcookie(COOKIE, $val, ['expires' => $exp, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
}
function start_session(int $uid): void {
    q('DELETE FROM ji_sessions WHERE expires_at < ?', [time()]);
    $t = new_token();
    $exp = time() + SESSION_DAYS * 86400;
    q('INSERT INTO ji_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', [th($t), $uid, $exp, time()]);
    set_cookie($t, $exp);
}
function end_session(): void {
    $t = $_COOKIE[COOKIE] ?? '';
    if ($t !== '') q('DELETE FROM ji_sessions WHERE token_hash = ?', [th($t)]);
    set_cookie('', time() - 3600);
}
function current_user(): ?array {
    $t = $_COOKIE[COOKIE] ?? '';
    if (!is_string($t) || strlen($t) < 20 || strlen($t) > 100) return null;
    $u = q('SELECT u.*, s.expires_at AS s_exp FROM ji_sessions s JOIN ji_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1', [th($t), time()])->fetch();
    if (!$u) return null;
    if ((int) $u['s_exp'] - time() < (SESSION_DAYS - 1) * 86400) { // perpanjang sesi yang aktif dipakai
        $exp = time() + SESSION_DAYS * 86400;
        q('UPDATE ji_sessions SET expires_at = ? WHERE token_hash = ?', [$exp, th($t)]);
        set_cookie($t, $exp);
    }
    return $u;
}
function require_user(): array { $u = current_user(); if (!$u) fail(401, 'Silakan masuk dulu.'); return $u; }
function require_admin(): array { $u = require_user(); if ($u['role'] !== 'admin') fail(403, 'Hanya admin.'); return $u; }
function public_user(array $u): array {
    return ['id' => (int) $u['id'], 'username' => $u['username'], 'name' => $u['name'] ?: $u['username'], 'email' => $u['email'], 'role' => $u['role'], 'active' => (bool) $u['active'], 'hasPassword' => $u['pass_hash'] !== null];
}
function user_count(): int { return (int) q('SELECT COUNT(*) FROM ji_users')->fetchColumn(); }

// ---------- Validasi
function valid_username(string $u): bool { return (bool) preg_match('/^[a-z0-9._-]{3,40}$/', $u); }
function valid_email(string $e): bool { return strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) && !preg_match('/[\r\n]/', $e); }
function check_password(string $p): void {
    if (mb_strlen($p) < 8) fail(400, 'Password minimal 8 karakter.');
    if (mb_strlen($p) > 200) fail(400, 'Password terlalu panjang.');
}

// ---------- Tautan reset / undangan
function app_url(): string { return rtrim((string) cfg()['app_url'], '/'); }
function make_link_token(int $uid, string $kind): string {
    $t = new_token();
    q('DELETE FROM ji_tokens WHERE user_id = ? AND kind = ?', [$uid, $kind]);
    $ttl = $kind === 'invite' ? INVITE_HOURS * 3600 : RESET_MINUTES * 60;
    q('INSERT INTO ji_tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)', [th($t), $uid, $kind, time() + $ttl]);
    return app_url() . '/reset.html#t=' . $t; // fragment: tidak terkirim ke server atau tercatat di log
}

require __DIR__ . '/mail.php';
