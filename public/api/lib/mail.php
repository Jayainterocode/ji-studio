<?php
// Kirim email teks lewat SMTP (mis. smtp.hostinger.com) tanpa library; cadangan: mail() bawaan PHP.
declare(strict_types=1);
if (!defined('JI')) { http_response_code(404); exit; }

function send_mail(string $to, string $subject, string $text): bool {
    $m = cfg()['mail'] ?? [];
    $from = (string) ($m['from'] ?? '');
    if (!valid_email($to) || !valid_email($from)) { error_log('[ji] mail: alamat tidak valid'); return false; }
    $name = preg_replace('/[\r\n"]/', '', (string) ($m['from_name'] ?? 'JI Studio'));
    $enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
    $domain = substr(strrchr($from, '@'), 1);
    $headers = [
        'Date: ' . date('r'),
        'From: ' . $enc($name) . " <$from>",
        "To: <$to>",
        'Subject: ' . $enc($subject),
        'Message-ID: <' . bin2hex(random_bytes(12)) . "@$domain>",
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $body = chunk_split(base64_encode($text), 76, "\r\n");
    try {
        if (!empty($m['smtp_host'])) {
            smtp_send($m, $from, $to, implode("\r\n", $headers) . "\r\n\r\n" . $body);
        } else {
            $h = array_values(array_filter($headers, fn($l) => !str_starts_with($l, 'To:') && !str_starts_with($l, 'Subject:')));
            if (!mail($to, $enc($subject), $body, implode("\r\n", $h), '-f' . $from)) throw new RuntimeException('mail() gagal');
        }
        return true;
    } catch (Throwable $e) {
        error_log('[ji] mail: ' . $e->getMessage());
        return false;
    }
}

function smtp_send(array $m, string $from, string $to, string $data): void {
    $host = (string) $m['smtp_host'];
    $port = (int) ($m['smtp_port'] ?? 465);
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host]]);
    $ssl = ($m['smtp_secure'] ?? ($port === 465 ? 'ssl' : 'tls')) === 'ssl'; // ssl = 465, tls = STARTTLS (587)
    $fp = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . "$host:$port", $en, $es, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("SMTP tidak terhubung: $es");
    stream_set_timeout($fp, 20);
    $read = function () use ($fp): string {
        $r = '';
        while (($l = fgets($fp, 1024)) !== false) { $r .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; }
        return $r;
    };
    $cmd = function (?string $c, array $ok) use ($fp, $read): string {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $read();
        if (!in_array((int) substr($r, 0, 3), $ok, true)) throw new RuntimeException('SMTP: ' . trim(explode("\n", $r)[0]));
        return $r;
    };
    $me = parse_url(app_url(), PHP_URL_HOST) ?: 'localhost';
    try {
        $cmd(null, [220]);
        $cmd("EHLO $me", [250]);
        if (!$ssl) {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS gagal');
            $cmd("EHLO $me", [250]);
        }
        $cmd('AUTH LOGIN', [334]);
        $cmd(base64_encode((string) $m['smtp_user']), [334]);
        $cmd(base64_encode((string) $m['smtp_pass']), [235]);
        $cmd("MAIL FROM:<$from>", [250]);
        $cmd("RCPT TO:<$to>", [250, 251]);
        $cmd('DATA', [354]);
        fwrite($fp, preg_replace('/^\./m', '..', $data) . "\r\n.\r\n");
        $cmd(null, [250]);
        $cmd('QUIT', [221]);
    } finally {
        fclose($fp);
    }
}

function mail_reset(array $u, string $link): bool {
    $nama = $u['name'] ?: $u['username'];
    return send_mail($u['email'], 'Atur ulang password JI Studio', "Halo $nama,\r\n\r\nAda permintaan untuk mengatur ulang password akun JI Studio Anda (username: {$u['username']}).\r\n\r\nBuka tautan ini dalam " . RESET_MINUTES . " menit:\r\n$link\r\n\r\nKalau Anda tidak meminta ini, abaikan email ini. Password Anda tidak berubah.\r\n\r\nJI Studio - Jaya Intero\r\n");
}
function mail_invite(array $u, string $link): bool {
    $nama = $u['name'] ?: $u['username'];
    return send_mail($u['email'], 'Undangan JI Studio', "Halo $nama,\r\n\r\nAnda diundang memakai JI Studio, alat konten Jaya Intero.\r\nUsername Anda: {$u['username']}\r\n\r\nBuat password Anda lewat tautan ini (berlaku " . INVITE_HOURS . " jam):\r\n$link\r\n\r\nJI Studio - Jaya Intero\r\n");
}
