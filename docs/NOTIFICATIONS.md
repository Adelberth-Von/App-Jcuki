# Notifikasi Jcuki: pengingat lokal dan push aktivitas

Versi 1.2.0 menyediakan kedua jalur. **Pengingat mingguan** dan pengingat rencana memakai jadwal lokal OS. **Aktivitas teman ketika aplikasi tertutup** dikirim backend melalui Expo Push Service → FCM/APNs. Proyek dan kredensial push belum disertakan; ikuti langkah berikut untuk mengaktifkannya. Mode contoh/browser tidak mengirim push antarperangkat.

## 1. Hubungkan proyek Expo/EAS

Di root aplikasi, dengan akun Expo milik pengelola:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Gunakan project ID UUID yang diberikan EAS sebagai `EXPO_PUBLIC_EAS_PROJECT_ID` di `.env`. `app.config.js` memasukkannya ke `extra.eas.projectId`. Project ID merupakan konfigurasi publik; `EXPO_TOKEN` adalah rahasia dan tidak boleh memakai awalan `EXPO_PUBLIC_`. Jika EAS meminta mengubah dynamic config, masukkan UUID melalui variabel tersebut; jangan mengganti file config dengan contoh yang menghapus plugin Jcuki.

Untuk APK GitHub Actions, atur repository **variable** `EXPO_PUBLIC_EAS_PROJECT_ID` dan `EXPO_PUBLIC_API_URL`. Untuk EAS Build, atur kedua nilai yang sama pada environment `preview`/`production` lewat dashboard EAS atau `npx eas-cli@latest env:create`. Keduanya harus tersedia ketika aplikasi dibangun.

## 2. Android: Firebase dan FCM v1

1. Buat proyek Firebase dan aplikasi Android dengan package **`com.terrence.jcuki`**.
2. Unduh `google-services.json`, letakkan di root aplikasi. File ini diabaikan Git dan otomatis digunakan oleh `app.config.js` ketika tersedia.
3. Unggah kredensial **FCM v1 service account** ke proyek EAS lewat `npx eas-cli@latest credentials --platform android`. Ikuti [panduan FCM v1 resmi](https://docs.expo.dev/push-notifications/fcm-credentials/). File service account berisi private key: jangan commit, unggah sebagai avatar, atau masukkan ke aplikasi.
4. Untuk GitHub Actions, simpan isi Firebase **client** `google-services.json` di repository **secret** `GOOGLE_SERVICES_JSON`. Workflow menulisnya sebelum prebuild tanpa mencetak isinya. Jangan gunakan service-account JSON sebagai secret ini.
5. Untuk EAS Build, sediakan client config tersebut sebagai file variable bernama `GOOGLE_SERVICES_FILE` atau file lokal sesuai [panduan environment EAS](https://docs.expo.dev/eas/environment-variables/). Config menerima path dari `GOOGLE_SERVICES_FILE`, dengan fallback `./google-services.json` untuk pengembangan lokal. Jika path eksplisit tidak tersedia, build gagal dengan pesan yang jelas.
6. Buat APK baru. Mengisi kredensial tanpa membangun ulang tidak menambahkan Firebase client config ke APK lama.

## 3. iPhone: APNs dan signing

Gunakan Apple Developer account, bundle **`com.terrence.jcuki`**, dan App Group **`group.com.terrence.jcuki`** untuk widget. Siapkan signing dan APNs push key melalui `npx eas-cli@latest credentials --platform ios`, kemudian bangun profil `preview` untuk perangkat terdaftar atau `production` untuk distribusi yang sesuai. Ikuti [setup push Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).

APK Android tidak berlaku untuk iPhone. Workflow simulator memeriksa kompilasi; tidak menghasilkan IPA yang dapat dipasang di iPhone. Kredensial Apple/APNs tidak disertakan dalam repo.

## 4. Backend dan antrean

Deploy backend sesuai [panduan backend](../backend/README.md). Terapkan semua migration, termasuk **`0003_activity_push.sql`**. Setelah kredensial Expo/FCM/APNs siap, ubah `PUSH_ENABLED` menjadi `"true"` di `backend/wrangler.jsonc` dan deploy. Default `"false"` menjaga integrasi yang belum dikonfigurasi tetap jelas statusnya.

Worker mencatat perubahan dan penerima dalam transaksi yang sama dengan penyimpanan jadwal. Penerima merupakan anggota grup yang mengaktifkan notifikasi; pelaku perubahan tidak menerima push miliknya sendiri. Jenis aktivitas: anggota bergabung, jadwal berubah, rencana baru, jawaban rencana, pembatalan, serta perubahan nickname/zona/foto profil. Penulisan jadwal atau jawaban yang identik tidak menghasilkan kabar duplikat.

Pengiriman dipicu setelah perubahan dan cron setiap menit. Antrean mengunci pekerjaan yang dikirim, memeriksa kembali keanggotaan/opt-out, lalu mengirim batch maksimum 100. Kesalahan sementara dijadwalkan ulang dengan backoff, maksimum delapan percobaan. Ticket yang diterima tidak dikirim ulang; receipt diperiksa setelah 15 menit, diulang bila tertunda, dan ditutup setelah 24 jam. `DeviceNotRegistered` menonaktifkan token lama. Receipt sukses berarti layanan menerima pengiriman, bukan bukti pengguna telah melihatnya. Provider dan jaringan dapat menghasilkan keterlambatan atau duplikasi ketika respons pengiriman hilang.

Jika mengaktifkan **enhanced push security** pada EAS, simpan token layanan hanya di Worker:

```sh
cd backend
npx wrangler secret put EXPO_PUSH_ACCESS_TOKEN
npm run deploy
```

Jangan masukkan token layanan itu ke variabel Expo publik atau source control. Tetapkan retensi aktivitas/antrean sesuai kebutuhan deployment; saat ini tidak ada pembersihan otomatis.

## 5. Pengaturan pengguna

Di aplikasi native: **Pengaturan → Notifikasi aktivitas teman**. Izin OS diminta hanya sesudah tombol tersebut atau pengingat dinyalakan. Status yang ditampilkan membedakan izin belum diberikan, proyek belum disiapkan, server belum aktif, siap, dan gagal tersambung. “Siap” menunjukkan registrasi berhasil dan Worker diaktifkan; tidak memeriksa keabsahan kredensial FCM/APNs secara langsung.

Token didaftarkan ulang saat pengaturan berubah, aplikasi kembali aktif, atau token native berganti. Registrasi berurutan memastikan opt-out terakhir mengikuti registrasi yang sedang berlangsung. Kegagalan koneksi dicoba lagi ketika aktif. Mematikan aktivitas menonaktifkan registrasi server setelah permintaan tersinkron; saat offline, pengaturan OS dapat langsung menghentikan notifikasi. Riwayat aktivitas tetap dapat dibuka dari ikon lonceng tanpa mengaktifkan notifikasi OS.

Tanpa push siap, grup aktif diperiksa setiap 30 detik ketika aplikasi terbuka; fallback lokal memberi kabar terbaru setelah baseline pertama. Ini bukan pengiriman background. Saat membuka notifikasi, Jcuki beralih ke grup terkait dan membuka kabar atau rencana.

### Pengingat mingguan

Aktifkan **Pengingat mingguan**, pilih hari dan jam sesuai keluarnya roster. Default: Minggu 19.00, belum aktif sampai dipilih pengguna. Zona otomatis mengikuti zona waktu OS setiap kali aplikasi kembali aktif; zona manual memakai IANA yang dipilih. Tidak membutuhkan izin GPS. Pengguna yang berpindah tempat harus memastikan pengaturan zona waktu OS benar.

iOS memakai trigger kalender; Android memakai pengulangan zona perangkat atau jadwal tanggal 12 minggu untuk zona manual. Jadwal diperbarui saat aplikasi terbuka. Rencana yang diterima juga memiliki pengingat lokal berdasarkan data terakhir disinkronkan. Push aktivitas tidak otomatis memperbarui seluruh jadwal pengingat rencana di background; buka Jcuki untuk menyinkronkan perubahan terbaru.

### Suara Jcuki Chime

Motif empat nada naik **C5–E5–G5–C6**, dengan jeda terakhir dan ekor lembut, durasi **1,78 detik**. Dengarkan [audio asli](../assets/sounds/jcuki_chime.wav). Script deterministik: `node scripts/generate-notification-sound.mjs`. File WAV mono PCM 44,1 kHz dibundel oleh plugin notifikasi untuk Android dan iOS.

Android menggunakan channel bersuara dan senyap yang terpisah; suara channel tersimpan oleh OS. Pengguna dapat mengubah suara/channel lewat pengaturan Android. Perubahan asset suara membutuhkan APK baru dan, untuk instalasi lama, reset channel atau reinstall agar suara channel lama tidak dipertahankan. Silent mode/Focus/Do Not Disturb tetap mengikuti OS.

## 6. Uji pada tiga perangkat

1. Bangun aplikasi native dengan konfigurasi proyek dan backend yang sama. Gunakan Android 13+ dan iPhone yang telah diprovision.
2. Buat satu lingkaran, gabungkan dua perangkat lain, dan nyalakan notifikasi aktivitas.
3. Tutup aplikasi penerima. Ubah jadwal dari perangkat pertama: kedua anggota lain harus menerima kabar sesuai bahasa dan preferensi suara; pelaku tidak menerima push sendiri.
4. Ketuk notifikasi untuk membuka grup yang tepat; pastikan rentang ditampilkan dalam zona masing-masing. Uji Jakarta, Berlin saat DST, dan zona dengan offset setengah jam.
5. Matikan notifikasi anggota kedua, tunggu permintaan tersinkron, lalu buat rencana; hanya penerima yang aktif menerima push. Uji registrasi ulang saat izin OS berubah.
6. Uji pengingat mingguan dan tombol uji suara, serta toast ketika izin ditolak. Jangan mengubah jam server untuk memaksa notifikasi.
7. Periksa state/error antrean di D1 tanpa mengekspor token/foto. Gunakan `npx wrangler tail` untuk kesalahan Worker; jangan mencatat kredensial.

Test lokal memverifikasi SQL, transaksi, penerima, cursor, opt-out, retry, ticket/receipt dan audio. Pengiriman nyata melalui FCM/APNs dan suara native tetap memerlukan konfigurasi serta QA perangkat.

Referensi: [SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/), [Push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
