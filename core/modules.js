// Daftar modul JI Studio. Tambah modul baru: buat folder m/<id>/, lalu daftarkan di sini.
// icon = isi atribut d pada path SVG 24x24 (garis putih).
export const MODULES = [
  { id: 'story', name: 'Story Pengantaran', desc: 'Video truk + data kiriman jadi MP4 9:16 untuk IG & WA Story', href: 'm/story/',
    icon: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM10 9l5 3-5 3z' },
  { id: 'kalkulator', name: 'Kalkulator Marketplace', desc: 'Potongan TikTok, Tokopedia, Shopee, Lazada + judul & deskripsi produk', href: 'm/kalkulator/',
    icon: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18.5h2M14 18.5h2' },
  { id: 'users', name: 'Kelola pengguna', desc: 'Tambah tim, kirim undangan, nonaktifkan akun', href: 'm/users/', admin: true,
    icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14a5.5 5.5 0 0 1 3 6' }
];
