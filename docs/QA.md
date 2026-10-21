# Verifikasi sistem Jcuki 1.6.0

## Akun dan database

Pemeriksaan pada 21 Oktober 2026, sebelum membuat akun QA baru, menemukan 8 akun di `auth.users`. Semua memiliki hash password, konfirmasi aktif dan riwayat login. Seluruh 8 akun terhubung ke profil aplikasi. Tidak ada akun tanpa profil, profil terhubung tanpa akun, atau keanggotaan tanpa grup/profil.

- Email dan autentikasi: [Authentication → Users](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/auth/users).
- Profil, grup, jadwal, rencana dan aktivitas: schema `jcuki` pada Table Editor.
- Tabel `public.User` kosong dan hanya mempunyai kolom `id` dan `created_at`. Tabel tersebut bukan sumber akun Jcuki. Jangan mengisinya dengan password.
- Password dikelola Supabase Auth dalam bentuk hash. Schema aplikasi tidak mempunyai kolom password. Konfirmasi password hanya dipakai ketika validasi pendaftaran.
- Pendaftaran langsung aktif tanpa email verifikasi, sesuai konfigurasi produk. Aplikasi tetap memeriksa password melalui Supabase Auth saat login; cache lokal tidak memberi akses ke akun server.

## Pemeriksaan yang dapat diulang

`npm run typecheck`, `npm run lint`, dan `npm test` memeriksa kode serta perilaku backend lokal. Pengujian regresi pagination membuka 40 agenda dan riwayat, mengubah respons, membatalkan rencana, lalu melakukan refresh dan melanjutkan cursor. Pengujian juga memastikan grup yang keanggotaannya sudah hilang tidak tetap ditampilkan.

`node scripts/live-system-check.mjs` memakai publishable key dan API aplikasi yang sama dengan pengguna. Script membuat **3 akun QA berlabel** dengan password acak yang hanya disimpan di memori. Jangan menjalankannya berulang tanpa kebutuhan: akun dan rencana QA sengaja dipertahankan, dan pembatasan pendaftaran tetap berlaku. Script tidak memakai service-role key, mengubah akun pengguna yang ada, atau menghapus data pengguna.

Cakupannya: pendaftaran di Supabase, password salah, email duplikat, dua sesi independen pada akun yang sama, sinkronisasi profil/grup, tiga zona waktu, penolakan orang di luar grup, tiga anggota, konfirmasi libur dan jam, respons rencana, izin pembatalan, pagination agenda 20+2, pagination aktivitas, foto privat, refresh token, dan logout satu perangkat yang tidak mengeluarkan perangkat lain. Log hanya berisi nama pemeriksaan dan jumlah, tanpa email/password/token.

Workflow build menunggu pemeriksaan server ini dan uji APK pada emulator Android 13 serta 15 sebelum publikasi. [Detail uji native](../tests/README.native.md) mencakup keyboard yang benar-benar terbuka, instalasi baru, pemulihan akun/grup dan foto setelah restart/offline.

## Batas hasil pengujian

Lulus pengujian menunjukkan skenario di atas bekerja pada versi dan lingkungan yang diuji. Ini tidak membuktikan bahwa semua model HP, jaringan, versi OS, beban server, atau semua interaksi bebas bug.

- APK GitHub adalah preview untuk pengujian. Distribusi Play Store memerlukan signing privat atau EAS production.
- Push aktivitas ketika aplikasi tertutup memerlukan konfigurasi EAS/Firebase/APNs yang belum disediakan. Pengingat lokal dan integrasi backend tersedia; lihat [Notifikasi](NOTIFICATIONS.md).
- iPhone fisik dan perilaku keyboard iOS belum diverifikasi pada perangkat di sesi ini. Gunakan build Apple bertanda tangan untuk uji penerimaan iOS.
- Tidak ada pemulihan password melalui email karena pengiriman email tidak diaktifkan. Simpan password akun dengan baik.
- Supabase Advisor melaporkan perlindungan password bocor belum aktif. Pengaturannya ada pada [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); ketersediaannya mengikuti paket Supabase. RLS tanpa policy pada schema privat adalah penolakan akses langsung yang disengaja: aplikasi melewati Edge Function yang memeriksa JWT dan keanggotaan.

Sebelum distribusi umum, selesaikan konfigurasi distribusi/push yang dibutuhkan dan uji penerimaan pada perangkat fisik dengan jaringan lambat/terputus. Jangan mengartikan label build hijau sebagai jaminan tanpa bug.
