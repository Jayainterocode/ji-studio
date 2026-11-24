<?php
// SALIN file ini ke SATU folder DI ATAS public_html dengan nama ji-config.php
// (Hostinger: /home/uXXXX/domains/<domain>/ji-config.php). Jangan pernah taruh di public_html atau Git.
return [
    // Alamat situs, tanpa garis miring di akhir. Dipakai untuk tautan di email.
    'app_url' => 'https://story.domainanda.com',

    // SQLite (bawaan, tanpa setup). Folder ji-data dibuat otomatis di luar public_html.
    'db' => ['dsn' => 'sqlite:' . __DIR__ . '/ji-data/ji.sqlite', 'user' => null, 'pass' => null],
    // Atau MySQL Hostinger:
    // 'db' => ['dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=uXXXX_ji;charset=utf8mb4', 'user' => 'uXXXX_ji', 'pass' => '...'],

    // Kunci sekali pakai untuk membuat admin pertama di /setup.html. Ganti dengan teks acak >= 16 karakter.
    'setup_key' => 'GANTI-dengan-teks-acak-panjang',

    // Email pengirim (buat mailbox di hPanel -> Emails). Port 465 = SSL.
    'mail' => [
        'from' => 'noreply@domainanda.com',
        'from_name' => 'JI Studio',
        'smtp_host' => 'smtp.hostinger.com',
        'smtp_port' => 465,
        'smtp_user' => 'noreply@domainanda.com',
        'smtp_pass' => 'password-mailbox',
    ],
];
