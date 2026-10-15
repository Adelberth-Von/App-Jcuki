<p align="center"><img src="assets/brand-mark.png" alt="Logo Jcuki: tiga teman mengelilingi jam" width="116" /></p>

# Jcuki · waktu untuk bersama

Aplikasi penjadwalan untuk teman dengan shift kerja dan zona waktu berbeda. Tandai libur, isi jam bermain, lalu sepakati rencana. Komunikasi tetap lewat aplikasi pilihan kalian.

**Android 13+ · iPhone iOS 16.4+ · Bahasa Indonesia / English · Light / Dark / System**

**Develop by Terrence**

## Download

[Download disini memek](https://github.com/Adelberth-Von/App-Jcuki/releases/latest/download/JCuki-Android13-preview.apk)

[Tampilan dan kode sumber](https://github.com/Adelberth-Von/App-Jcuki) · [Release](https://github.com/Adelberth-Von/App-Jcuki/releases) · [Status build](https://github.com/Adelberth-Von/App-Jcuki/actions/workflows/mobile-build.yml)

APK tersedia melalui GitHub Release setelah workflow build dan publikasi berhasil. Link di atas langsung mengunduh file APK, tanpa ZIP atau membuka halaman Actions. Release diberi nama **Android preview**, memakai template debug signing key Expo untuk pengujian. APK menyertakan bundle JavaScript, sehingga tidak membutuhkan Metro/Expo Go. Untuk distribusi Play Store gunakan signing privat/EAS production. Jika belum ada release berhasil, lihat status build; jangan memasang APK lama dengan menganggapnya versi baru.

Untuk memasang: buka APK di Android 13 atau lebih baru, izinkan pemasangan dari sumber browser/file manager jika diminta OS, lalu buka Jcuki. iPhone memerlukan build terpisah melalui EAS dan Apple signing; APK tidak dapat dipasang di iPhone. Lihat [panduan build](docs/BUILD.md).

## Pembaruan 1.4.0

**Akun langsung aktif, tersimpan di Supabase.** Daftar dengan nama lengkap, nickname, email, password, dan konfirmasi password. Setelah berhasil, aplikasi langsung masuk tanpa mengirim email verifikasi. Login di perangkat lain memulihkan profil, grup, jadwal, dan rencana akun yang sama. Password dikelola dan di-hash oleh Supabase Auth; konfirmasi password tidak disimpan.

**Liquid navigation dan tampilan kaca:** navigasi kapsul mengambang dengan indikator bergerak, kartu transparan, gradasi lembut, Light/Dark/System, serta halaman login, pendaftaran, dan akun baru. iOS 26+ memakai Liquid Glass native ketika tersedia; Android 13+ memakai blur pada navigasi dan lapisan transparan ringan untuk kartu. Reduce Motion dan Reduce Transparency dihormati. [Keputusan desain](docs/UX-DESIGN.md).

Server Supabase tetap menjadi koneksi bawaan. Zona waktu otomatis mengikuti perangkat, undangan menyediakan kode/link yang bisa disalin, dan demo memiliki tombol kembali. [Panduan akun dan server](docs/SUPABASE.md).

## Apa yang diperbaiki

- **Identitas baru:** tiga teman mengelilingi jam, loading dengan gerak napas lembut dan transisi masuk. Tidak ada waktu tunggu buatan; animasi mengikuti Reduce Motion.
- **Akun dan profil:** pendaftaran lima isian, login dengan pop-up kesalahan, sesi tersimpan, halaman Akun saya untuk mengubah nama/nickname/foto dari galeri, serta keluar akun. Mode contoh dapat dicoba tanpa akun.
- **Desain hangat:** krem, hijau lumut, kontras yang nyaman, hierarki teks jelas, kartu lebih lega, tombol utama mudah dijangkau. Light, Dark, atau System dengan preview tampilan.
- **Kalender mingguan sebagai awal:** tampilan bulanan tetap tersedia. Satu editor untuk konfirmasi libur dan jam opsional, pilihan cepat Sore/Malam/Larut malam, lintas tengah malam, ringkasan durasi, dan beberapa rentang per hari.
- **Waktu tiap pengguna:** zona IANA otomatis dari OS. Jam sesi dikonversi ke zona pembaca; DST Berlin dan offset setengah jam ditangani. Tidak memakai GPS.
- **Kabar lingkaran:** ikon lonceng, riwayat aktivitas, status belum dibaca, filter jadwal/rencana, dan pagination. Push aktivitas untuk anggota lain disiapkan di backend dengan opt-out, antrean, retry dan receipt.
- **Pengingat:** mingguan sesuai hari/jam roster serta rencana yang diterima; suara original Jcuki Chime empat nada. Izin OS hanya diminta sesudah tindakan pengguna.
- **Aksesibilitas:** target tekan minimum 48×48, label kontrol, fokus input, dukungan pembesaran teks, dan animasi yang mengikuti Reduce Motion.

Lihat [catatan keputusan UX](docs/UX-DESIGN.md). Tidak ada chat internal. Hari belum diisi berarti **belum dikonfirmasi**, bukan otomatis sibuk.

## Panduan pemakaian

1. Ketuk **Buat akun**. Isi nama lengkap, nickname, email, password minimal delapan karakter, dan konfirmasi password. Setelah berhasil, akun langsung aktif dan aplikasi masuk; tidak ada email verifikasi.
2. Untuk akun yang sudah ada, gunakan **Masuk**. Email/password salah menampilkan pop-up; data akun tidak ditimpa. **Coba contoh · tanpa membuat akun** hanya membuka data contoh dan **Keluar demo** membawa kembali ke login.
3. Ketuk avatar atau **Pengaturan → Akun saya** untuk mengubah profil dan foto galeri. Keluar akun lalu masuk dengan akun yang sama di perangkat lain untuk memulihkan data. Tidak perlu memasukkan URL server atau API key.
4. Setelah akun tersinkron, pilih **Buat grup** atau **Gabung grup**. Formulir terbuka di halaman khusus. Setelah grup dibuat, kode dan tombol **Bagikan undangan** langsung muncul; kode/link juga dapat disalin. Teman memilih **Gabung grup**, menempelkan kode/link, lalu menekan tombol bergabung. Berikutnya pilih **Isi kalender saya**. Mendukung tiga pengguna atau lebih dan beberapa lingkaran.
5. Saat roster keluar, buka **Kalender**, pilih tanggal, lalu konfirmasi libur. Nyalakan **Isi jam bermain sekarang** jika jamnya diketahui, isi mulai/selesai, dan simpan sekali. Memilih tanggal saja tidak menyimpan apa pun.
6. Tambahkan rentang lain bila perlu. Menghapus jam tetap mempertahankan libur; membatalkan libur menghapus jam yang terkait. Rentang bentrok dan waktu invalid ditolak.
7. Buka **Agenda → Buat rencana**, pilih tanggal/jam, lalu teman menjawab Bisa/Mungkin/Tidak bisa. Detail rencana menampilkan jawaban anggota dan ekspor kalender ICS. Percakapan dapat diteruskan melalui aplikasi lain.
8. Di **Pengaturan**, pilih bahasa, tema, format jam dan zona waktu. Aktifkan pengingat mingguan pada hari/jam yang cocok. Nyalakan notifikasi aktivitas sesudah integrasi push dikonfigurasi.
9. Ketuk ikon lonceng untuk membaca kabar. Halaman agenda, kabar, grup, teman, dan libur memiliki pagination; **Muat lebih banyak** meminta halaman server berikutnya.

## Tampilan setiap layar

Alur awal dan undangan terbaru:

<p>
<img src="docs/preview/first-group.png" alt="Panduan awal membuat atau bergabung ke grup" width="190" />
<img src="docs/preview/create-group.png" alt="Halaman khusus membuat grup" width="190" />
<img src="docs/preview/join-group.png" alt="Halaman khusus menempelkan kode atau link" width="190" />
<img src="docs/preview/group-invitation.png" alt="Kode dan tombol berbagi undangan" width="190" />
</p>

<p>
<img src="docs/preview/login-light.png" alt="Login dengan desain kaca" width="190" />
<img src="docs/preview/register-light.png" alt="Pendaftaran akun" width="190" />
<img src="docs/preview/login-error.png" alt="Pop-up email atau password salah" width="190" />
<img src="docs/preview/account-light.png" alt="Pengaturan akun dan foto" width="190" />
</p>

Screenshot berikut berasal dari layar React Native yang dirender di browser untuk pemeriksaan layout, memakai data pengujian atau contoh. Picker OS, suara, keyboard, widget, dan push background harus diuji di aplikasi native.

<p>
<img src="docs/preview/loading-light.png" alt="Loading dengan logo baru" width="190" />
<img src="docs/preview/login-english.png" alt="Login dalam bahasa Inggris" width="190" />
</p>
<p>
<img src="docs/preview/dashboard-light.png" alt="Beranda Light" width="190" />
<img src="docs/preview/dashboard-dark.png" alt="Beranda Dark" width="190" />
<img src="docs/preview/calendar-week.png" alt="Kalender mingguan" width="190" />
<img src="docs/preview/calendar.png" alt="Kalender bulanan" width="190" />
</p>
<p>
<img src="docs/preview/confirm-day.png" alt="Editor konfirmasi libur" width="190" />
<img src="docs/preview/playing-hours.png" alt="Editor jam bermain opsional" width="190" />
<img src="docs/preview/groups-light.png" alt="Daftar lingkaran" width="190" />
<img src="docs/preview/activity-light.png" alt="Kabar dan pagination" width="190" />
</p>
<p>
<img src="docs/preview/agenda-light.png" alt="Agenda lengkap" width="190" />
<img src="docs/preview/create-plan.png" alt="Buat rencana" width="190" />
<img src="docs/preview/plan-detail.png" alt="Detail dan jawaban rencana" width="190" />
</p>
<p>
<img src="docs/preview/settings-light.png" alt="Pengaturan Light" width="190" />
<img src="docs/preview/settings-dark.png" alt="Pengaturan Dark" width="190" />
<img src="docs/preview/settings-notifications.png" alt="Pengaturan pengingat dan aktivitas" width="190" />
</p>

| Layar / dialog            | Preview                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Akun | [Login](docs/preview/login-light.png), [Daftar](docs/preview/register-light.png), [Error](docs/preview/login-error.png), [Profil](docs/preview/account-light.png) |
| Undangan dari link | [Konfirmasi bergabung](docs/preview/join-invitation.png) |
| Loading                   | [Light](docs/preview/loading-light.png)                                                                                                                                                                                   |
| Profil dan foto | [Akun saya](docs/preview/account-light.png) |
| Beranda                   | [Light](docs/preview/dashboard-light.png), [Dark](docs/preview/dashboard-dark.png), [English](docs/preview/dashboard-english.png), [320 px](docs/preview/dashboard-small.png), [430 px](docs/preview/dashboard-large.png) |
| Kalender                  | [Mingguan](docs/preview/calendar-week.png), [Bulanan](docs/preview/calendar.png), [320 px](docs/preview/calendar-small.png)                                                                                               |
| Editor jadwal             | [Konfirmasi libur](docs/preview/confirm-day.png), [Jam bermain](docs/preview/playing-hours.png)                                                                                                                           |
| Lingkaran                 | [Daftar grup](docs/preview/groups-light.png), [Buat](docs/preview/create-group.png), [Gabung](docs/preview/join-group.png), [Undangan](docs/preview/invite.png)                                                           |
| Agenda                    | [Daftar](docs/preview/agenda-light.png), [Buat rencana](docs/preview/create-plan.png), [Detail rencana](docs/preview/plan-detail.png)                                                                                     |
| Aktivitas                 | [Light](docs/preview/activity-light.png), [Dark](docs/preview/activity-dark.png), [English](docs/preview/activity-english.png)                                                                                            |
| Pengaturan                | [Light](docs/preview/settings-light.png), [Dark](docs/preview/settings-dark.png), [Notifikasi](docs/preview/settings-notifications.png)                                                                                   |

## Pagination: sudah ada

Daftar UI menampilkan **empat item per halaman** dengan Sebelumnya/Berikutnya dan nomor halaman; halaman dikoreksi setelah filter berubah. API menggunakan **cursor/keyset pagination** untuk grup, rencana mendatang/riwayat, dan aktivitas: default 20, batas 1–50, cursor terikat ke identitas/grup/view. Kalender memakai navigasi minggu/bulan. Pagination UI tidak menggantikan pemuatan server; tombol **Muat lebih banyak** melanjutkan cursor tanpa menduplikasi item. Tes mencakup pergantian halaman dan penolakan cursor lintas grup.

## Memeriksa akun dan sinkronisasi

Email akun ada di [Supabase → Authentication → Users](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/auth/users). Profil, grup, dan jadwal ada pada **Table Editor → schema jcuki**; schema `public` tidak digunakan. Halaman **Akun saya** menampilkan email yang dipakai login di HP lain dan status sinkronisasi terakhir. Jika koneksi gagal, pilih **Coba lagi**. Data contoh tidak membuat akun Supabase.

Foto dimuat dengan sesi akun, mencoba refresh sesi sekali bila server menolak dengan 401, lalu disimpan di direktori dokumen perangkat per akun. Foto yang sama tidak diunduh ulang setiap layar dibuka. Versi foto berubah ketika pengguna menggantinya; kegagalan sementara dapat dicoba lagi saat sesi atau data diperbarui. Cache tidak menggantikan foto yang disimpan di server.

## Menjalankan dan menghubungkan teman

Gunakan Node.js 24+ dan npm:

```sh
npm ci
cp .env.example .env
npm run typecheck
npm run lint
npm test
npm start
```

`npm run web` untuk review layout. `npm run android` membutuhkan Android SDK; `npm run ios` membutuhkan macOS dan Xcode 26.4+. Widget, suara kustom, gallery OS, dan remote push membutuhkan native build; browser/Expo Go tidak membuktikan fitur tersebut.

Backend resmi memakai Supabase Edge Function + PostgreSQL dan sudah terpasang. Endpoint menjadi bawaan aplikasi. Backend memeriksa anggota grup, membatasi upload foto, dan menyimpan perubahan secara atomik. [Panduan Supabase](docs/SUPABASE.md). Cloudflare Worker + D1 tetap tersedia sebagai alternatif pengembangan.

Supabase Auth memverifikasi login dan JWT; data aplikasi tetap melalui Edge Function yang memeriksa keanggotaan. Sesi native disimpan di SecureStore, cache/foto dipisahkan per akun. Profil dari versi lama dapat ditautkan saat login pertama pada instalasi yang masih memiliki token perangkat lama. Setelah tertaut, token perangkat saja tidak dapat membuka akun. Lihat [arsitektur dan pengaturan akun](docs/SUPABASE.md#akun-tanpa-email-verifikasi).

## Notifikasi dan zona waktu

**Integrasi tersedia; kredensial proyek belum disertakan.** Ikuti [panduan Expo/EAS, Firebase/FCM v1 dan APNs](docs/NOTIFICATIONS.md) untuk push saat aplikasi tertutup. Status di Pengaturan membedakan izin, setup proyek, server belum aktif, siap, dan kesalahan. Aktivitas mencakup anggota baru, perubahan jadwal, rencana/jawaban/pembatalan dan profil. Pengirim dikecualikan; preferensi bahasa/suara penerima digunakan. Tanpa push siap, polling saat aplikasi terbuka merupakan fallback.

Pengingat mingguan merupakan jadwal lokal OS dan tetap terpisah dari push. Default belum aktif, Minggu 19.00; hari/jam dapat diubah. Zona otomatis mengikuti zona waktu OS dan diperbarui saat kembali aktif. Rencana lokal memakai data terakhir disinkronkan; buka aplikasi setelah perubahan teman untuk memperbarui pengingat. Sistem Focus/DND/izin OS dapat memengaruhi pengiriman dan suara.

[Dengarkan **Jcuki Chime**](assets/sounds/jcuki_chime.wav) · motif original C5–E5–G5–C6, 1,78 detik. Script pembuat: `node scripts/generate-notification-sound.mjs`.

Widget Android dan WidgetKit iOS menampilkan libur terdekat dan jam opsional; pengaturan widget membuka alur OS. Entry uninstall Android mengarah ke konfirmasi penghapusan sistem.

## Validasi

TypeScript, ESLint dan 60 tes Node memeriksa tiga identitas nyata pada backend SQLite, isolasi grup, foto, transaksi jadwal/aktivitas/antrean, pagination, zona waktu/DST, klaim profil lama, isolasi akun, validasi pendaftaran, penyimpanan sesi besar/terputus, identitas perangkat, terjemahan, serta properti WAV. Uji langsung pada Supabase memeriksa profil tiga zona, buat/gabung grup, penolakan anggota luar, jadwal, rencana, respons, foto, dan cursor aktivitas. Browser QA juga memeriksa daftar langsung aktif, pop-up password salah/tidak cocok, keluar/masuk, profil dan grup pada sesi/perangkat baru, serta undangan yang dilanjutkan setelah pendaftaran. Browser QA memeriksa kalender, lintas tengah malam, bentrok, pagination, persistensi, tema sistem, dan lebar 320/390/430 px. GitHub Actions memeriksa APK minSdk 33 dan signature, lalu menjalankan APK yang sama pada emulator Android 13 dan 15 sebelum publikasi. Uji native memeriksa posisi input saat keyboard terbuka, daftar akun, pemulihan profil/grup setelah data aplikasi emulator dihapus, serta foto privat setelah restart dan saat offline. [Detail pengujian native](tests/README.native.md). Status kompilasi terbaru dapat dilihat di link build; keberhasilan bundel bukan bukti QA perangkat.

Pengiriman push FCM/APNs, suara native, gallery native, widget, TalkBack/VoiceOver dan performa perangkat tetap memerlukan uji Android/iPhone setelah konfigurasi. [Checklist perangkat dan build](docs/BUILD.md) · [Uji notifikasi tiga perangkat](docs/NOTIFICATIONS.md).

## English quick start

Jcuki helps a private circle share days off and optional playing hours across time zones. Download the Android 13+ preview above, create an account with your full name, nickname, email and password (no verification email), then create or join a circle using the same deployed backend. Tap a calendar date, explicitly confirm your day off, optionally enter hours, then make a plan and collect friends' responses. Log in to the same account on another device to restore your data. Choose English and Light/Dark/System in Settings. Sample mode runs locally and does not connect real friends. Background activity push needs the project credentials described in [the notification guide](docs/NOTIFICATIONS.md); iPhone distribution requires Apple signing.

### Detail tampilan terbaru

| Keluar demo | Undangan grup | Zona otomatis dan dark mode |
| --- | --- | --- |
| ![Tombol keluar demo](docs/preview/demo-exit.png) | ![Kode dan link undangan](docs/preview/group-invitation.png) | ![Zona otomatis](docs/preview/automatic-timezone-dark.png) |

Screenshot adalah render aplikasi melalui React Native Web; tampilan dialog OS dapat berbeda pada Android/iPhone.
