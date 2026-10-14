# Jcuki — arah produk dan perbaikan pengalaman mobile

Jcuki membantu lingkaran teman dengan shift yang berubah untuk berbagi hari libur, mengisi jam bermain, dan menyepakati rencana bersama. Percakapan tetap melalui aplikasi yang sudah mereka gunakan.

## Alur utama

1. Sambutan → isi panggilan/foto opsional → pilih buat atau gabung lingkaran melalui kode. Profil awal dapat disimpan tanpa backend; mode contoh tersedia langsung.
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

Logo baru menggambarkan tiga teman mengelilingi jam. Loading hanya berlangsung selama data/font disiapkan, kemudian fade 220 ms; Reduce Motion menonaktifkan loop. Onboarding memisahkan profil dan pilihan lingkaran, dengan koneksi server dijelaskan pada langkah yang membutuhkannya.

Lonceng membuka kabar lingkaran: filter, avatar pelaku, waktu lokal pembaca, pagination dan status belum dibaca. Push disiapkan dengan registrasi opt-in, transaksi aktivitas/outbox, retry serta receipt; kredensial proyek belum tersedia. [Panduan integrasi](NOTIFICATIONS.md).

Kalender menggunakan perpindahan minggu/bulan. Pagination dipakai pada daftar agenda, grup, teman, hari libur, serta aktivitas; pagination cursor pada API tetap dipertahankan. Tombol **Muat lebih banyak** dibedakan dari perpindahan halaman data yang sudah dimuat.

## Fitur lanjutan yang layak didiskusikan

Fitur berikut merupakan usulan, belum ditambahkan ke backend dalam perbaikan UI ini:

- **Rekomendasi waktu bersama.** Hitung irisan rentang jam yang tersedia; tampilkan “semua bisa” atau jumlah anggota yang bisa. Cocoknya hari libur saja tidak cukup untuk memastikan jam yang cocok. Gunakan durasi minimum pilihan pengguna dan sediakan konfirmasi rencana.
- **Waktu luang setelah shift.** Putuskan apakah orang yang sedang tidak libur boleh mengisi jam bermain setelah kerja. Jika ya, model ketersediaan perlu dipisahkan dari konfirmasi hari libur.
- **Jadwal belum keluar.** Status eksplisit per minggu, dengan pilihan menunda pengingat. Pengguna tidak harus menebak tujuh hari sekaligus.
- **Pengingat sesuai roster.** Waktu pengingat per pengguna; satu pengingat mingguan dan penundaan ketika roster belum diketahui. Hindari pengingat berulang yang tidak membantu.
- **Penyusunan ulang rencana.** Push untuk kabar perubahan sudah disiapkan. Selanjutnya tawarkan alternatif waktu ketika jadwal berubah, setelah model rekomendasi disepakati.
- **Akun yang bisa dipulihkan.** Masuk akun dan pemulihan akses antarperangkat sebelum dipakai lebih luas. Implementasi yang ada masih memakai identitas perangkat.
- **Tautan tempat berkumpul.** Simpan tautan Discord/Meet atau aplikasi lain pada rencana; buka melalui aplikasi yang tersedia, tanpa menambahkan chat internal.

Prioritas berikutnya: rekomendasi irisan waktu → status roster belum keluar → akun yang bisa dipulihkan. Jangan memasukkan seluruh ide ke versi pertama; ukur apakah anggota bisa mengisi jadwal tanpa bantuan dan menyepakati satu sesi.

## Validasi dan batas pemeriksaan

Pratinjau menggunakan layar React Native yang sama, dirender pada browser untuk meninjau tata letak dan interaksi. TypeScript, ESLint, serta sembilan file tes regresi diperiksa. Pengujian interaksi browser mencakup onboarding, kalender mingguan/bulanan, konfirmasi dan pengisian jam, rentang lintas tengah malam, beberapa rentang pada hari yang sama, penolakan waktu invalid/bentrok, pagination, penyimpanan setelah reload, tema sistem, serta lebar layar 320/390/430 piksel. Pasangan warna teks utama pada kedua tema memenuhi rasio kontras 4,5:1; ini belum merupakan audit aksesibilitas menyeluruh. Screenshot bukan bukti perilaku native; pengalaman picker, keyboard, screen reader, suara, widget, dan performa animasi perlu QA di Android 13+ dan iPhone.

Jadwal nyata antarperangkat membutuhkan server yang dikonfigurasi. Mode contoh tetap diberi label. Push ketika aplikasi tertutup memerlukan konfigurasi EAS/FCM/APNs dan backend yang diaktifkan; tanpa itu, aplikasi hanya polling saat terbuka.

Distribusi Android memakai workflow build dan publikasi release APK setelah checks berhasil, dengan link langsung di README. Verifikasi hasil native terbaru melalui GitHub Actions. iPhone membutuhkan signing Apple; screenshot browser bukan build atau uji perangkat iOS.
