# Jcuki — arah produk dan perbaikan pengalaman mobile

Jcuki membantu lingkaran teman dengan shift yang berubah untuk berbagi hari libur, mengisi jam bermain, dan menyepakati rencana bersama. Percakapan tetap melalui aplikasi yang sudah mereka gunakan.

## Alur utama

Pada 1.6.0, beranda grup baru memberi satu tindakan berikutnya dan tiga indikator sederhana: Undang, Pilih waktu, Buat rencana. Indikator mengikuti data yang tersimpan, bukan urutan tombol yang pernah ditekan. Kartu selesai tidak memenuhi beranda setelah semua langkah terpenuhi. Undangan di halaman Grup dibuat lebih pendek; area kode bisa ditekan untuk menyalin, dengan Bagikan dan Salin link bersebelahan. Halaman Akun menampilkan perubahan yang belum disimpan dan foto lokal yang belum terunggah secara terpisah dari keberhasilan refresh server.

Refresh otomatis mempertahankan jendela halaman yang sudah dibuka, termasuk riwayat, agar pengguna tidak kehilangan konteks ketika daftar diperbarui. Data tiap halaman diambil ulang dari server untuk memperoleh respons dan pembatalan terbaru, lalu cursor diperbarui bersama datanya.

1. Masuk atau daftar akun lima isian → beranda → buat/gabung lingkaran melalui kode. Akun langsung aktif tanpa email; foto opsional dapat diubah pada halaman Akun saya. Demo tersedia tanpa akun.
2. Saat jadwal shift keluar, buka kalender mingguan dan pilih tanggal.
3. Konfirmasi bahwa tanggal tersebut memang libur. Pemilihan tanggal sendiri tidak menyimpan konfirmasi.
4. Pada editor yang sama, aktifkan **Isi jam bermain sekarang** atau simpan **Konfirmasi libur** saja. Tidak ada sheet konfirmasi tambahan.
5. Isi jam mulai dan selesai. Preset sore, malam, dan larut malam mempercepat pengisian. Ringkasan menampilkan jam, durasi aktual, dan zona waktunya.
6. Simpan libur dan jam dalam satu transaksi. Lihat jadwal teman; buat rencana dan jawab Bisa/Mungkin/Tidak bisa.
7. Jika shift berubah, ubah jam atau batalkan konfirmasi libur melalui tindakan yang jelas.

Hari tanpa konfirmasi berarti **belum dikonfirmasi**, bukan otomatis sibuk. Jam bermain tetap opsional. Jam bermain berkaitan dengan libur yang dikonfirmasi; keduanya dapat dikirim sekaligus dari satu editor.

## Yang diperbaiki pada aplikasi

| Area          | Perilaku dan alasan                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Beranda       | Sapaan singkat, grup aktif, libur terdekat dengan tindakan langsung, ringkasan minggu ini, jadwal teman, dan agenda bersama.                                |
| Kalender      | Mingguan sebagai tampilan awal; Bulanan tersedia. Navigasi minggu/bulan, penanda hari ini, status libur, dan detail tanggal pilihan.                        |
| Pengisian jam | Satu editor dengan penyimpanan atomik, pilihan waktu cepat, ringkasan durasi, dukungan lintas tengah malam, dan penambahan beberapa rentang pada satu hari. |
| Grup          | Grup aktif terlihat jelas; kartu anggota dan tombol masuk; undang teman atau gabung grup tersedia pada keadaan kosong.                                      |
| Agenda        | Dapat ditemukan dari beranda, filter status, empat rencana per halaman, navigasi halaman, dan pemuatan data lanjutan.                                       |
| Tampilan      | Light, Dark, dan System dengan preview visual. Krem hangat, hijau lembut, teks kontras, ruang yang lega, dan komponen konsisten.                            |
| Pengingat     | Kartu beranda menunjukkan konfigurasi pengingat yang tersimpan. Izin OS tetap diminta setelah tindakan pengguna.                                            |
| Interaksi     | Efek tekan ringan, animasi mengikuti Reduce Motion, fokus input jelas, label aksesibilitas, dan target tekan minimal 48 × 48.                               |

Logo baru menggambarkan tiga teman mengelilingi jam. Loading hanya berlangsung selama data/font disiapkan, kemudian fade 220 ms; Reduce Motion menonaktifkan loop. Form akun memisahkan pendaftaran dari kegiatan grup; server bawaan bekerja tanpa meminta URL teknis.

Lonceng membuka kabar lingkaran: filter, avatar pelaku, waktu lokal pembaca, pagination dan status belum dibaca. Push disiapkan dengan registrasi opt-in, transaksi aktivitas/outbox, retry serta receipt; kredensial proyek belum tersedia. [Panduan integrasi](NOTIFICATIONS.md).

Kalender menggunakan perpindahan minggu/bulan. Pagination dipakai pada daftar agenda, grup, teman, hari libur, serta aktivitas; pagination cursor pada API tetap dipertahankan. Tombol **Muat lebih banyak** dibedakan dari perpindahan halaman data yang sudah dimuat.

## Fitur lanjutan yang layak didiskusikan

Fitur berikut merupakan usulan, belum ditambahkan ke backend dalam perbaikan UI ini:

- **Rekomendasi waktu bersama.** Hitung irisan rentang jam yang tersedia; tampilkan “semua bisa” atau jumlah anggota yang bisa. Cocoknya hari libur saja tidak cukup untuk memastikan jam yang cocok. Gunakan durasi minimum pilihan pengguna dan sediakan konfirmasi rencana.
- **Waktu luang setelah shift.** Putuskan apakah orang yang sedang tidak libur boleh mengisi jam bermain setelah kerja. Jika ya, model ketersediaan perlu dipisahkan dari konfirmasi hari libur.
- **Jadwal belum keluar.** Status eksplisit per minggu, dengan pilihan menunda pengingat. Pengguna tidak harus menebak tujuh hari sekaligus.
- **Pengingat sesuai roster.** Waktu pengingat per pengguna; satu pengingat mingguan dan penundaan ketika roster belum diketahui. Hindari pengingat berulang yang tidak membantu.
- **Penyusunan ulang rencana.** Push untuk kabar perubahan sudah disiapkan. Selanjutnya tawarkan alternatif waktu ketika jadwal berubah, setelah model rekomendasi disepakati.
- **Tautan tempat berkumpul.** Simpan tautan Discord/Meet atau aplikasi lain pada rencana; buka melalui aplikasi yang tersedia, tanpa menambahkan chat internal.

Prioritas berikutnya: rekomendasi irisan waktu → status roster belum keluar. Jangan memasukkan seluruh ide ke versi pertama; ukur apakah anggota bisa mengisi jadwal tanpa bantuan dan menyepakati satu sesi.

## Validasi dan batas pemeriksaan

Pratinjau menggunakan layar React Native yang sama, dirender pada browser untuk meninjau tata letak dan interaksi. TypeScript, ESLint, serta sembilan file tes regresi diperiksa. Pengujian interaksi browser mencakup onboarding, kalender mingguan/bulanan, konfirmasi dan pengisian jam, rentang lintas tengah malam, beberapa rentang pada hari yang sama, penolakan waktu invalid/bentrok, pagination, penyimpanan setelah reload, tema sistem, serta lebar layar 320/390/430 piksel. Pasangan warna teks utama pada kedua tema memenuhi rasio kontras 4,5:1; ini belum merupakan audit aksesibilitas menyeluruh. Screenshot bukan bukti perilaku native; pengalaman picker, keyboard, screen reader, suara, widget, dan performa animasi perlu QA di Android 13+ dan iPhone.

Jadwal nyata antarperangkat membutuhkan server yang dikonfigurasi. Mode contoh tetap diberi label. Push ketika aplikasi tertutup memerlukan konfigurasi EAS/FCM/APNs dan backend yang diaktifkan; tanpa itu, aplikasi hanya polling saat terbuka.

Distribusi Android memakai workflow build dan publikasi release APK setelah checks berhasil, dengan link langsung di README. Verifikasi hasil native terbaru melalui GitHub Actions. iPhone membutuhkan signing Apple; screenshot browser bukan build atau uji perangkat iOS.

## Pembaruan 1.3.0

Zona mengikuti perangkat secara otomatis, termasuk saat kembali aktif atau pengaturan kalender OS berubah. Preferensi zona manual dari versi lama dimigrasikan ke otomatis. Pengaturan menampilkan zona yang sedang digunakan tanpa meminta izin GPS.

Demo memiliki tombol **Keluar demo** pada setiap layar utama. Tombol **Buat grupmu** juga mengantar kembali ke profil nyata. Data contoh tetap terpisah dari grup server. Tab Grup menempatkan nama grup, kode, salin kode/link dan undangan pada kartu yang jelas. Link mengantar ke konfirmasi bergabung; pengguna baru melengkapi profil dahulu dan kembali ke undangan yang sama.

Navigator, latar root native dan konten memakai tema yang sama untuk mengurangi potensi kilatan latar terang saat perpindahan. Formatter Intl memakai cache terbatas, ikon/teks menggunakan konteks warna terpisah dan memo, pembacaan server berjalan paralel, serta respons yang identik mempertahankan state. Polling foreground memakai refresh senyap dan demo tidak melakukan polling berkala.

Pengukuran lokal 3.000 konversi tanggal turun dari sekitar 1.442 ms menjadi 113 ms pada runtime Node. Angka ini mengukur perhitungan, bukan FPS atau latensi sentuh HP. Kelancaran dan hilangnya kilatan layar perlu diverifikasi pada perangkat fisik.


## Akun dan liquid glass · 1.4.0

Pintu masuk menjadi login atau daftar, dengan demo sebagai pilihan ringan. Pendaftaran lima isian memberi label tetap, autofill, fokus berikutnya, kontrol tampil/sembunyikan password, status proses yang mencegah submit ganda, pesan inline, dan pop-up kegagalan. Akun langsung aktif tanpa alur email. Undangan mempertahankan kode saat pengguna berpindah login/daftar. Avatar dan Pengaturan membuka halaman Akun saya.

Permukaan kaca memakai garis tepi terang dan gradasi statis lembut, bukan animasi latar terus-menerus. Navigasi mengambang memakai indikator spring dengan native driver dan empat target sentuh besar; tersembunyi ketika keyboard terbuka. Padding konten dan tombol bawah memberi ruang untuk navigasi. Latar native dan navigator mengikuti tema yang sama, termasuk pergantian akun.

GlassView native diaktifkan hanya bila iOS mendukung kedua pemeriksaan ketersediaan. Android memakai BlurTargetView pada konten aktif dan satu BlurView navigasi dengan metode SDK31+, sedangkan kartu memakai lapisan transparan tanpa blur Android tambahan. Hero hijau, teks, input, dan status tetap memiliki kontras. Reduce Transparency mengganti kaca dengan permukaan solid, Reduce Motion mematikan gerak indikator. Kelancaran dan efek kaca native tetap membutuhkan pemeriksaan HP fisik.

## Formulir dan alur grup · 1.5.0

Beranda menjadi titik awal setelah login. Untuk akun tanpa grup, panduan tiga langkah menyusun urutan: buat/gabung, bagikan undangan, isi kalender. Create dan join menjadi halaman penuh dengan navigasi kembali; tempel kode/link mendapat tombol sendiri dan kesalahan tampil dekat formulir. Setelah berhasil, kartu grup langsung menampilkan kode dan aksi berbagi, disusul tombol menuju kalender.

Formulir utama memakai KeyboardAwareScrollView yang mengikuti fokus dan animasi keyboard; sheet menyesuaikan tinggi. Keyboard tidak dipanaskan saat peluncuran, menghindari kilatan IME. Tab navigasi tetap disembunyikan saat mengetik. Foto tidak lagi kembali ke inisial setiap sesi diperbarui; gambar yang sudah tersedia dipertahankan selama pemuatan ulang. Status cloud menjelaskan apakah data benar-benar berhasil dibaca dari server, dan demo menyebutkan bahwa akun tidak dibuat.

Kartu awal grup memakai judul ringkas serta tombol buat/gabung sebelum penjelasan tiga langkah. Susunan ini menjaga kedua tindakan mudah dijangkau pada layar pendek dan memberi ruang terhadap navigasi mengambang. Nama panjang pada sapaan diringkas satu baris agar tidak menggeser tindakan utama.
