# Verifikasi sistem Jcuki 1.6.x

## Hasil akhir 1.6.1

[Build 20](https://github.com/Adelberth-Von/App-Jcuki/actions/runs/39596345219) **lulus**: TypeScript, lint, 63 tes Node, pengujian Supabase langsung, APK pada emulator Android 13/API 33 dan Android 15/API 35, serta kompilasi aplikasi dan widget iOS Simulator. [APK 1.6.1](https://github.com/Adelberth-Von/App-Jcuki/releases/download/v1.6.1-preview-20/JCuki-Android13-preview.apk) sudah diterbitkan dari source `f78450604c06b1eb53fcd5753e372ab0c3b5f9e8`, Android versionCode 8.

APK berukuran 138.338.477 byte. SHA-256: `0d22ee1e18a245df077d5cc3bfe931613242e1e93e1747a0059ab5832245807c`.

Pada Android 13, batas bawah input password kosong terukur 991 px dengan keyboard mulai pada 1.048 px; kode undangan 996 px dan judul rencana 688 px. Uji memeriksa fokus dan batas input sebelum mengetik. Pendaftaran, buat/gabung grup, rencana, login setelah penghapusan data aplikasi emulator, serta foto setelah restart/offline lulus pada kedua OS.

Catatan keandalan: percobaan pertama Android 13 berhenti ketika menunggu layar login, sebelum isian dimasukkan. Catatan geometri awal hanya berisi kontrol kosong; penyebab awal belum dapat dipastikan. Ulangan pada binary yang sama meluluskan seluruh skenario. Android 15 meluluskan seluruh skenario pada percobaan pertama. Hal ini tetap perlu diperiksa pada perangkat fisik, bukan dianggap jaminan tanpa bug.

Log fungsi saat pengujian APK juga mencatat 50 permintaan aplikasi Android pada `ap-northeast-1`, dengan rata-rata pemrosesan server 807 ms dan maksimum 1.657 ms. Ini mencakup operasi yang beragam dan tidak sama dengan sampel pembacaan terkontrol pada tabel di bawah.

## Akun dan database

Pemeriksaan pada 21 Oktober 2026, sebelum membuat akun QA baru, menemukan 8 akun di `auth.users`. Semua memiliki hash password, konfirmasi aktif dan riwayat login. Seluruh 8 akun terhubung ke profil aplikasi. Tidak ada akun tanpa profil, profil terhubung tanpa akun, atau keanggotaan tanpa grup/profil.

Audit akhir setelah akun QA ditambahkan menemukan **24/24 akun menggunakan bcrypt**, tanpa akun yang kehilangan profil atau keanggotaan yang kehilangan grup/profil. Jumlah ini mencakup akun QA berlabel dari beberapa pengujian; tidak semua merupakan pengguna nyata. Tidak ada password atau nilai hash yang ditampilkan.

- Email dan autentikasi: [Authentication → Users](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/auth/users).
- Profil, grup, jadwal, rencana dan aktivitas: schema `jcuki` pada Table Editor.
- Tabel `public.User` kosong dan hanya mempunyai kolom `id` dan `created_at`. Tabel tersebut bukan sumber akun Jcuki. Jangan mengisinya dengan password.
- Password dikelola Supabase Auth dalam bentuk hash. Schema aplikasi tidak mempunyai kolom password. Konfirmasi password hanya dipakai ketika validasi pendaftaran.
- Pendaftaran langsung aktif tanpa email verifikasi, sesuai konfigurasi produk. Aplikasi tetap memeriksa password melalui Supabase Auth saat login; cache lokal tidak memberi akses ke akun server.

## Pemeriksaan yang dapat diulang

Optimasi 1.6.1 mengarahkan permintaan fungsi ke wilayah database Tokyo melalui parameter gateway resmi. [Perbandingan pada data QA yang sama](https://github.com/Adelberth-Von/App-Jcuki/actions/runs/39594949833/job/119204836529) melakukan tiga putaran per endpoint, dengan urutan wilayah bergantian:

| Pembacaan | Median routing otomatis dari AS | Median Tokyo |
| --- | ---: | ---: |
| Profil | 2.550 ms | 474 ms |
| Daftar grup | 2.804 ms | 458 ms |
| Detail grup | 3.545 ms | 458 ms |

Angka ini adalah hasil sampel pengujian, bukan target yang dijamin pada semua jaringan. Zona waktu kalender pengguna ditentukan dari perangkat, terpisah dari lokasi komputasi fungsi.

[Pemeriksaan server pada build 20](https://github.com/Adelberth-Von/App-Jcuki/actions/runs/39596345219/job/119224143007) **lulus** pada 21 Oktober 2026: tiga akun baru, profil awal yang dimuat bersamaan, dua sesi independen, serta seluruh skenario di bawah. Pemeriksaan agregat selama audit memastikan seluruh akun yang diperiksa memakai bcrypt; tidak ada nilai hash atau kredensial yang dibaca/ditampilkan dalam laporan.

[Kompilasi iOS Simulator pada build yang sama](https://github.com/Adelberth-Von/App-Jcuki/actions/runs/39596345219/job/119224066921) **lulus**, termasuk aplikasi dan extension widget, memakai Xcode 26.4.1. Ini bukan uji interaksi di iPhone fisik atau IPA bertanda tangan.

`npm run typecheck`, `npm run lint`, dan `npm test` memeriksa kode serta perilaku backend lokal. Pengujian regresi pagination membuka 40 agenda dan riwayat, mengubah respons, membatalkan rencana, lalu melakukan refresh dan melanjutkan cursor. Pengujian juga memastikan grup yang keanggotaannya sudah hilang tidak tetap ditampilkan.

`node scripts/live-system-check.mjs` memakai publishable key dan API aplikasi yang sama dengan pengguna. Script membuat **3 akun QA berlabel** dengan password acak yang hanya disimpan di memori. Jangan menjalankannya berulang tanpa kebutuhan: akun dan rencana QA sengaja dipertahankan, dan pembatasan pendaftaran tetap berlaku. Script tidak memakai service-role key, mengubah akun pengguna yang ada, atau menghapus data pengguna.

Cakupannya: pendaftaran di Supabase, password salah, email duplikat, dua sesi independen pada akun yang sama, sinkronisasi profil/grup, tiga zona waktu, penolakan orang di luar grup, tiga anggota, konfirmasi libur dan jam, respons rencana, izin pembatalan, pagination agenda 20+2, pagination aktivitas, foto privat, refresh token, dan logout satu perangkat yang tidak mengeluarkan perangkat lain. Log hanya berisi nama pemeriksaan dan jumlah, tanpa email/password/token.

Workflow build menunggu pemeriksaan server ini dan uji APK pada emulator Android 13 serta 15 sebelum publikasi. [Detail uji native](../tests/README.native.md) mencakup keyboard yang benar-benar terbuka, instalasi baru, pemulihan akun/grup dan foto setelah restart/offline.

Posisi input diuji **sebelum karakter pertama diketik**, termasuk perpindahan lewat tombol Berikutnya ke password kosong. Formulir mengukur batas penuh input terhadap posisi keyboard saat fokus berpindah dan setelah keyboard terbuka, sehingga tidak bergantung pada munculnya event seleksi teks. Pengujian tombol rencana menggunakan pengenal kontrol agar teks panduan tidak dianggap sebagai tombol.

Pemeriksaan browser pada sesi ini memakai backend lokal dan Auth fiktif untuk menguji UI tanpa data pribadi: daftar akun, buat/gabung grup lewat link, pesan kode tidak ditemukan, tidak ada halaman beranda ganda setelah buat/gabung, status perubahan profil, unggahan foto yang sengaja digagalkan lalu dicoba ulang, serta target tombol pada 320/360/430 px dan tema gelap. Ini melengkapi pengujian Supabase langsung; server fiktif tidak dipakai untuk menyimpulkan bahwa autentikasi produksi bekerja.

## Batas hasil pengujian

Lulus pengujian menunjukkan skenario di atas bekerja pada versi dan lingkungan yang diuji. Ini tidak membuktikan bahwa semua model HP, jaringan, versi OS, beban server, atau semua interaksi bebas bug.

- APK GitHub adalah preview untuk pengujian. Distribusi Play Store memerlukan signing privat atau EAS production.
- Push aktivitas ketika aplikasi tertutup memerlukan konfigurasi EAS/Firebase/APNs yang belum disediakan. Pengingat lokal dan integrasi backend tersedia; lihat [Notifikasi](NOTIFICATIONS.md).
- iPhone fisik dan perilaku keyboard iOS belum diverifikasi pada perangkat di sesi ini. Gunakan build Apple bertanda tangan untuk uji penerimaan iOS.
- Tidak ada pemulihan password melalui email karena pengiriman email tidak diaktifkan. Simpan password akun dengan baik.
- Supabase Advisor melaporkan perlindungan password bocor belum aktif. Pengaturannya ada pada [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); ketersediaannya mengikuti paket Supabase. RLS tanpa policy pada schema privat adalah penolakan akses langsung yang disengaja: aplikasi melewati Edge Function yang memeriksa JWT dan keanggotaan.

Sebelum distribusi umum, selesaikan konfigurasi distribusi/push yang dibutuhkan dan uji penerimaan pada perangkat fisik dengan jaringan lambat/terputus. Jangan mengartikan label build hijau sebagai jaminan tanpa bug.
